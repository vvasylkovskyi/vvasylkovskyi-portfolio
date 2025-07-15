# Provisioning Application Load Balancer and connecting it to ECS using Terraform

So in the previous notes we have added ECS to our infrastructure in [Scaling our infra - from 1 EC-2 to ECS](https://www.viktorvasylkovskyi.com/posts/provisioning-ecs-and-scaling-our-ec2). The one only caveat in this architecture is that our DNS mapping still uses CloudFront which then points to the origin and the origin is our EC-2 instance. This obviously doesn't provide the advantages of using cluster or machines, since we still only use 1 single EC-2 instance, there will be other instances that are not utilized. 

In this notes, we will introduce the Application Load Balancer (ALB) which is the server that takes over the task of load balancing, i.e., distribution of requests to the available Container Instances and ECS tasks.

## Prerequisites

I highly recommend that you get familiar with my series of notes about how to setup you web server using single EC-2 instance. It provides the foundations of working here such as provisioning of the VPC and all the related basic infrastructure. Additionally, get familiar with:  

  - [Provision SSL and HTTPS with Terraform using Cloudfront, ACM, Route53 and Ec2](https://www.viktorvasylkovskyi.com/posts/provisioning-ssl-certificate-on-cloudfront-with-terraform)
  - [Scaling our infra - from 1 EC-2 to ECS](https://www.viktorvasylkovskyi.com/posts/provisioning-ecs-and-scaling-our-ec2)

## Overview

Adding load balancer has a few requirements from the cloud provider which makes adding load balancer task not "just adding load balancer". One of the hard requirements of load balancer is existence of at least two different subnets in two availability zones. Besides, for it to make sense we will create two machines where load balancer will distribute traffic to (although tecnically only one machine is enough). 

So here is the list of tasks we will perform to successfully add a load balancer: 

  - Add two subnets in different availability zones
  - Create a load balancer pointing to those two subnets
  - A Load Balancer Listener that will accept traffic from HTTPS
  - A SSL Certificate for HTTPS to use on load balancer
  - A Target Group - the VPC where load balancer will send traffic to and port 80
  - Add Load Balancer to the ECS

## Creating ALB with terraform

First, let's create ALB resource: 

```hcl
# alb.tf

resource "aws_lb" "my_app" {
  name               = "my_app-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.my_app.id]
  subnets            = [aws_subnet.my_app.id]
}
```

Load balancer will to be inserted our public subnet (hence the `internal=false`), i.e, in a subnet that has access to the public network via gateway. We have only one subnet - `aws_subnet.my_app.id` so the choice is obvious. The `security_groups` have to allow ingress to port `443` that we will define in a moment. Finally the `load_balancer_type=application` is the typical for most web applications. Alternatives are `network` and `gateway` which you are welcome to explore on your own. 

### Update Security Groups

We will no longer need to access to any instance using port `80` so we will update our security groups to allow only ports `22` and `443` for SSH and HTTPS access respectively.

```hcl
# security_group.tf
resource "aws_security_group" "my_app" {
  vpc_id = aws_vpc.main.id

  ingress {
    cidr_blocks = [
      "0.0.0.0/0"
    ]
    from_port = 22
    to_port   = 22
    protocol  = "tcp"
  }

  ingress {
    cidr_blocks = [
      "0.0.0.0/0"
    ]
    from_port = 443
    to_port   = 443
    protocol  = "tcp"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

### Provision ALB Target Group and ALB Listener

The ALB Listener and ALB Target Group are input and output rules of ALB. We will define that ALB accepts requests at port 443 and use `certificate_arn` our SSL certificate. The only action ALB will do is HTTPS termination and then a simple forward to the ALB Target group - our cluster. 

**Begin with defining ALB Listener:** 

```hcl
# alb.tf

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.my_app.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = aws_acm_certificate.cert.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.my_app.arn
  }

  depends_on = [aws_acm_certificate.cert]
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
  vpc_id   = aws_vpc.main.id

  health_check {
    path                = "/"
    protocol            = "HTTP"
    matcher             = "200-399"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 2
  }

  depends_on = [aws_lb.my_app]
}
```

From our load balancer we will forward requests into our cluster, which contains container instances listening on port 80. Since we are in our subnet, it is safe to use HTTP. The `health_check` block defines which URL the ALB uses to decide if the target containers are healthy. Here we define the base URL since this is our frontend application. You can read more information about [health checks on AWS docs](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html). `healthy_threshold` and `unhealthy_threshold` define how many (failed) healthchecks a target should be evaluated as healthy or unhealthy. These healthchecks are performed in intervals of seconds defined in interval.

### Attach ALB to our ECS cluster

Now that the ALB is working, final step is to assign this ALB to our ECS. This is accomplished by using `load_balancer` block at our ECS service.

```hcl
# ecs.tf

resource "aws_ecs_service" "my_app" {
  # ...existing code...
  load_balancer {
    target_group_arn = aws_lb_target_group.my_app.arn
    container_name   = "my_app"
    container_port   = 3000
  }
  # ...existing code...
}
```

### Update Route53 to Point to ALB

Finally, in this setup for simplicity purpose, we will remove cloud front and use ALB directly. This is acceptable since we have HTTPS on our ALB, and we do not need Cloud Front features for now (we were using cloud front as HTTPS termination). This will simplify our setup and reduce costs. 

```hcl
resource "aws_route53_record" "www_https" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "www.example.com"
  type    = "A"

  alias {
    name                   = aws_lb.my_app.dns_name
    zone_id                = aws_lb.my_app.zone_id
    evaluate_target_health = true
  }
}
```

Note, we can also get rid of our `aws_route53_record.origin` since we are not going to need it anymore. Finally, We can also remove `cloud_front.tf` or just comment it for now. 

### Add outputs

Let's add some outputs for debugging. We have created ALB, so let's add all the related outputs: 

```hcl
# outputs.tf

output "alb_dns_name" {
  value       = aws_lb.my_app.dns_name
  description = "The DNS name of the Application Load Balancer"
}

output "alb_arn" {
  value       = aws_lb.my_app.arn
  description = "The ARN of the Application Load Balancer"
}

output "alb_listener_arn" {
  value       = aws_lb_listener.https.arn
  description = "The ARN of the ALB HTTPS listener"
}

output "alb_target_group_arn" {
  value       = aws_lb_target_group.my_app.arn
  description = "The ARN of the ALB Target Group"
}

output "route53_www_record" {
  value       = aws_route53_record.www_https.fqdn
  description = "The FQDN of the www Route53 record"
}
```

## Testing

That should be it. Let's run `terraform apply --auto-approve` and see our AWS in action... If you followed up until here you should see the folowing output

```sh
╷
│ Error: creating ELBv2 application Load Balancer (my_app-alb): operation error Elastic Load Balancing v2: CreateLoadBalancer, https response error StatusCode: 400, RequestID: e8fc608c-14b1-46ff-9f74-5832d0e64d2f, api error ValidationError: At least two subnets in two different Availability Zones must be specified
│ 
│   with aws_lb.my_app,
│   on alb.tf line 1, in resource "aws_lb" "my_app":
│    1: resource "aws_lb" "my_app" {
│ 
```

This means that ALB requires at least two subnets in two different availability zones - a common requirement for high availability and security setup when using load balancer. Let's fix it

## Adding Availability Zones

To fix the above error, and meet requirements of having load balancer, we need to: 

  - Create at least two subnets, each in a different AZ within our VPC.
  - Update our `aws_lb` resource to include both subnet IDs:
 
### Adding two availability zones

We already have a VPC and a Gateway and a subnet within our VPC. You can refer to the setup in this notes: [Deploying EC2 instance on AWS with Terraform](https://www.viktorvasylkovskyi.com/posts/provisioning-ec2-on-aws-with-terraform). So in here we will be building on top these notes. 

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

### Update AWS_LB with two subnets

Adding two subnets in load balancer is simply referencing them in `aws_lb` like follows:

```hcl
resource "aws_lb" "my_app" {
  name               = "my_app-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.my_app.id]
  subnets            = aws_subnet.public[*].id
}
```

This will pass all public subnet IDs (created with `count = 2`) to the ALB, satisfying the requirement for subnets in multiple AZs.

### Scaling - moving to 2 EC-2 instances

Now, we are going to do something that is not the best practice, but since this article is already complex enough, and for the demo purpose, we will manually increate the EC-2 instances count. Let's modify the `aws_instance.my_app`: 

```hcl
resource "aws_instance" "my_app" {
  count = 2
  ... rest of code ...
  availability_zone           = data.aws_availability_zones.available.names[count.index]
  subnet_id                   = aws_subnet.public[count.index].id


  user_data = <<-EOF
              #!/bin/bash
              echo ECS_CLUSTER=${aws_ecs_cluster.portfolio.name} >> /etc/ecs/ecs.config
              EOF
}
```

Note, now we are using `count` to describe how many instances we want to create. These two instances will be used by the ECS cluster which will deploy the docker images on them. Further, the load balancer will be distrubiting traffic on them. 

Finally update the `desired_count` on ECS Cluster. 

```hcl

resource "aws_ecs_service" "my_app" {
  desired_count   = 2
...

}

```

Test everything with `terraform apply --auto-approve`.

## Conclusion 

And that is it! Here we have successfully added a load balancer that distributes the traffic across two instances of our app. This is great scalability improvement. However, there is a catch. We are not taking the full advantage of cloud resources management, since now we have 2 EC-2 instances, we are going to spend double $$. Even when resources are not utilized. The cloud platforms are great especially for the ability to scale the servers up and down based on demand. This is accomplished using Auto Scaling Group and we are going to look into it in the next note: 
  - [Provisioning Auto Scaling Group with Terraform and connecting it to our Load Balancer and ECS](https://www.viktorvasylkovskyi.com/posts/provisioning-auto-scaling-group)
