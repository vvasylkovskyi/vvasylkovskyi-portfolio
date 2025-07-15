# Provisioning Application Load Balancer and connecting it to Ec-2 instance using Terraform

In this notes we will continue improving on our infrastructure by adding HTTPS to our web app. In AWS the most simple way that I have found to do this well is by using Load Balancer as HTTPS proxy. We will do something unconventional, which is use Load Balancer and only 1 machine - EC-2 instance. People may argue that load balancer should point to a cluster. That's a valid argument. In my opinion, if you are a startup with not many customers or running a personal project, then maintaining a cluster may be too complicated and unnecessarily expensive. 

The easiest way to have https on web app using IaC is in my opinion using AWS load balancer, ACM for certificate management, some DNS, and finally the EC-2 to run docker image. 

## Prerequisites

Make sure you have base running, I suggest having a look at my previous notes: [Provisioning EC-2 Instance on Terraform using Modules and best practices](https://www.viktorvasylkovskyi.com/posts/terraform-modularizing). There we setup basic http server using EC-2. 

## Github Code

Full code available on `https://github.com/viktorvasylkovskyi/viktorvasylkovskyi-infra/tree/vv-https-server-ec2-and-load-balancer-v2`. You can clone that and apply the infra yourself, all you need to do is to modify the variables for your domain.

## Overview

We will do the following: 

  - Modify Network so that we have two subnets with two availability zones. This is required for load balancer to work.
  - Provision SSL certificate using ACM, for load balancer
  - Provision Load Balancer itself, and make it proxy requests to EC-2 instance
  - Update Route53 to point our DNS to the Load Balancer
  - Update EC-2 Instance to serve app from docker container

## Modify Network module to have multiple availability zones

In the `modules/network`, change the `main.tf` to include multiple availability zones: 

For simplicity, we will define only two public subnets, without private subnets. 

#### List Availability Zones

First, we will define a resource listing availability zones.

```hcl
# subnet.tf

data "aws_availability_zones" "available" {}
```

This resource returns a list of all AZ available in the region configured in the AWS credentials.

#### Add two public subnets

We will be using the terraform `count` directive. `count` is used as a loop, so we can define some resource multiple times. Since we only need two public subnets, naturaly the `count=2`. Let's write two public subnets: 

```hcl
# subnet.tf

resource "aws_subnet" "public" {
  count                   = 2
  cidr_block              = cidrsubnet(aws_vpc.main.cidr_block, 4, 2 + count.index)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  vpc_id                  = aws_vpc.main.id
  map_public_ip_on_launch = true
}
```

We are referencing the `data.aws_availability_zones.available.names` defined about to choose an availability name in our `vpc`. Besides that, we need the route table to define how network traffic is directed within our VPC (i.e., after internet gateway).

```hcl
# subnet.tf

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.default.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.default.id
  }
}

```

The above code will create a route table for our VPC. The `route` says that all the outbound traffic `0.0.0.0/0` will be directed to the internet via the VPC's Internet Gateway. This piece of code essentially makes our subnet using this route table *public*. Now this route table is attached to our VPC, but not to subnet. To attach it to our two subnets, we need to create an association between subnets and this route table: 

```hcl
resource "aws_route_table_association" "public" {
  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}
```

Finally, we will make our route table a main one, just to leave explicit association. 

```hcl
resource "aws_main_route_table_association" "public_main" {
  vpc_id         = aws_vpc.default.id
  route_table_id = aws_route_table.public.id
}
```

## Provision SSL Certificate

let's create an ACM resource. We will do that in new module: `modules/acm`

```tf
# modules/acm/main.tf
resource "aws_acm_certificate" "cert" {
  provider                  = aws.us_east_1
  domain_name               = "your-domain.com"
  validation_method         = "DNS"
  subject_alternative_names = ["www.your-domain.com", "your-domain.com"]

  lifecycle {
    create_before_destroy = true
  }
}
```

This requests an SSL/TLS certificate from AWS Certificate Manager for your domain. We choose DNS validation (simplest in Terraform if using Route 53).Note that we are adding `lifecycle.create_before_destroy`. This is because in case you change something on this resource, since Cloud Front will be using the certificate, this directive allows to duplicate certificate, and replace old one before destroying it thus allowing cloud front to switch certificates without issues.

### DNS Validation via Route 53

Next, we need to create the required DNS record to prove domain ownership to ACM. If you are curious in details, there is a step-by-step way of doing that manually described here [Installing SSL and Moving to HTTPS on Our Website with Let's Encrypt](https://notes.viktorvasylkovskyi.com/posts/adding-ssl-with-ca.md).

```tf
# ssl.tf
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.cert.domain_validation_options : dvo.domain_name => {
      name  = dvo.resource_record_name
      type  = dvo.resource_record_type
      value = dvo.resource_record_value
    }
  }

  name    = each.value.name
  type    = each.value.type
  zone_id = aws_route53_zone.main.zone_id
  records = [each.value.value]
  ttl     = 60
}
```

In the code above, the `for_each` turns the set into a map indexed by `domain_name` (which is unique). We are dynamically generating multiple DNS records (1 per domain to validate) using `for_each`. `aws_acm_certificate.cert.domain_validation_options` is a list of instructions from AWS on how to validate your domain. We loop over each `dvo` (domain validation option), and create a map like:

```tf
{
  "www.your-domain.com" = {
    name  = "_xyz.www.your-domain.com."
    type  = "CNAME"
    value = "_abc.acm-validations.aws."
  }
}
```

This is how AWS verifies domain ownership: you create a DNS record with those values. The

```tf
  records = [each.value.value]
  ttl     = 60
```

- `records`: The actual value to put in the DNS record (like \_abc.acm-validations.aws.)
- `ttl`: Time-to-live (how long DNS resolvers cache it), set to 60 seconds for fast propagation.

Next, we are adding a resource that tells AWS to wait for validation to complete before proceeding. It depends on the DNS record being correct.

```tf
# ssl.tf

resource "aws_acm_certificate_validation" "cert" {
  provider        = aws.us_east_1
  certificate_arn = aws_acm_certificate.cert.arn

  validation_record_fqdns = [
    for record in aws_route53_record.cert_validation : record.fqdn
  ]
}
```

## Provisioning AWS Load Balancer

Now that we have network and SSL certificate, we can start provisioning load balancer itself.

### Creating ALB

First, let's create ALB resource: 

```hcl
# modules/alb/main.tf

resource "aws_lb" "my_app" {
  name               = "my_app-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.security_group]
  subnets            = var.subnets 
}
```

Load balancer will to be inserted our public subnet (hence the `internal=false`), i.e, in a subnet that has access to the public network via gateway. We have only one subnet - `aws_subnet.my_app.id` so the choice is obvious. The `security_groups` have to allow ingress to port `443` that we will define in a moment. Finally the `load_balancer_type=application` is the typical for most web applications. Alternatives are `network` and `gateway` which you are welcome to explore on your own. 

The security group for ALB needs to allow igress for 443 (SSL) and egress for everything is fine for now.

Note we are passing multiple `subnets` created in the network module above. 


### Provision ALB Target Group and ALB Listener

The ALB Listener and ALB Target Group are input and output rules of ALB. We will define that ALB accepts requests at port 443 and use `certificate_arn` our SSL certificate. The only action ALB will do is HTTPS termination and then a simple forward to the ALB Target group - our cluster. 

**Begin with defining ALB Listener:** 

```hcl
# modules/alb/main.tf

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.my_app.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = var.acm_certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.portfolio.arn
  }

  depends_on = [var.aws_acm_certificate_cert]
}

```

And now, we have to define our target group: `target_group_arn`. 

**Defining our Target Group:**

```hcl
# alb.tf

resource "aws_lb_target_group" "my_app" {
  name     = "my_app-tg"
  port     = 80
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    path                = "/"
    protocol            = "HTTP"
    matcher             = "200-399"
    interval            = 30
    timeout             = 15
    healthy_threshold   = 2
    unhealthy_threshold = 5
  }

  depends_on = [aws_lb.my_app]
}
```

From our load balancer we will forward requests into our cluster, which contains container instances listening on port 80. Since we are in our subnet, it is safe to use HTTP. The `health_check` block defines which URL the ALB uses to decide if the target containers are healthy. Here we define the base URL since this is our frontend application. You can read more information about [health checks on AWS docs](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html). `healthy_threshold` and `unhealthy_threshold` define how many (failed) healthchecks a target should be evaluated as healthy or unhealthy. These healthchecks are performed in intervals of seconds defined in interval.

### Attach EC-2 to the Target Group

For Load Balancer to forward requests to the EC-2, we need to attach it to the target group. This is done using `aws_lb_target_group_attachment` resource:

```hcl
resource "aws_lb_target_group_attachment" "ec2_attachment" {
  target_group_arn = aws_lb_target_group.portfolio.arn
  target_id        = var.ec2_instance_id
  port             = 80
}
```

Note port 80 is the HTTP but it is fine, since we already checked for SSL at the load balancer listener.

## Update Route53 to Point to ALB

We have HTTPS on our ALB, now we have to make DNS point to ALB. 

```hcl
# modules/dns/main.tf

resource "aws_route53_zone" "main" {
  name = "example.com"
}

resource "aws_route53_record" "record" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "A"
    
  alias {
    name                   = var.aws_lb_dns_name
    zone_id                = var.aws_lb_zone_id
    evaluate_target_health = true
  }
}
```

## Update Ec-2 launch to serve app from Docker Container

For the Ec-2 we can simply start the docker image using our `user_data`. Here is how we can do that: 

```
# modules/ec2/main.tf

resource "aws_instance" "portfolio" {
  ami                         = var.instance_ami
  instance_type               = var.instance_type
  availability_zone           = var.availability_zone
  security_groups             = [var.security_group_id]
  associate_public_ip_address = true
  subnet_id                   = var.subnet_id
  key_name                    = aws_key_pair.ssh-key.key_name
  user_data = <<-EOF
            #!/bin/bash
            sudo yum update -y || sudo apt-get update -y
            sudo yum install -y docker || sudo apt-get install -y docker.io
            sudo systemctl start docker
            sudo systemctl enable docker

            # Add user to docker group
            sudo usermod -aG docker $USERNAME

            sudo docker run -d -p 80:80 nginx/nginx
            EOF
}
```

Note replace `nginx/nginx` with your docker image. 

## Conclusion

Let's run `terraform init` to install the modules and then `terraform apply --auto-approve` and see our domain working! 

For simplicity purposes here we only provide the modules code, and I will leave to you, felow reader to glue them together using your `main.tf` in the Root Module. Personally I enjoy working with terraform modules because it makes the infrastructure very easy to maintain. Additionally the dependencies between modules are visible in the root module due to the `variables` and `outputs` passed around from the modules. I hope you managed to make it work. If you have some issue please let me know and I will be glad to help. Happy coding!
