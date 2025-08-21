# Provisioning API Gateway and connecting it to Ec-2 instance using Terraform

In this notes we will provision an API Gateway on AWS using Terraform and connect it to our Ec-2 instance, thus turning an API Gateway into our entry point. It is a common pattern to offload the SSL termination off your application, and instead make other cloud resource act as an SSL proxy. In cloud, three resources can act as SSL termination: Load Balancer, a Content Delivery Network Origin, or an API Gateway.

I have setup both myself, and my motivation to use API Gateway is that both AWS Load Balancer and Cloudfront CDN are unnecessarily expensive for my personal projects. Pricing model in ALB is pay per hour (around $0.0225/hour for ALB in us-east-1 ≈ $16/month), while in API Gateway is Pay per request (e.g., $3.50 per million requests for REST APIs). Since I do not have much of traffic, I am surelly below million requests, I will give it a try and move to API Gateway to save extra $12 per month.

## Security Disclaimer

When using API Gateway and an EC-2 instance, the way to make it work is to expose EC-2 publicly and then provide an IP address to API Gateway know where to forward traffic to. This means exposing EC-2 port 80 to a public network and is an extra attack surface. Use it at your own risk. To minimize the attack risk, we will set firewall to accept connections on port 80 only from of API Gateway.

## Previous Notes

Previously I have written notes about how to provision SSL using both LB and CDN, feel free to give it a read if you like:

- [Provisioning Application Load Balancer and connecting it to Ec-2 instance using Terraform](https://www.viktorvasylkovskyi.com/posts/provisioning-alb-as-ssl-termination-and-ec2)
- [Provision CloudFront CDN with Terraform](https://www.viktorvasylkovskyi.com/posts/provisioning-cloudfront-with-terraform)

## Prerequisites

Make sure you have base running, I suggest having a look at my previous notes: [Provisioning EC-2 Instance on Terraform using Modules and best practices](https://www.viktorvasylkovskyi.com/posts/terraform-modularizing). There we setup basic http server using EC-2.

## Github Code

Full code available on `https://github.com/vvasylkovskyi/viktorvasylkovskyi-infra`. You can clone that and apply the infra yourself, all you need to do is to modify the variables for your domain.

## Overview

If you have followed

We will do the following:

- Provision SSL certificate using ACM, for our API Gateway
- Provision API Gateway itself, and make it proxy requests to EC-2 instance
- Update Route53 to point our DNS to the Load Balancer
- Update EC-2 Instance to enable port 80, and update the security group with rule to accept incomming traffic only from API Gateway.

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

## Provisioning AWS API Gateway

Now that we have network and SSL certificate, we can start provisioning the API Gateway itself.

### Creating API Gateway

First, let's create API Gateway resource:

```hcl
# modules/api-gateway/main.tf

resource "aws_apigatewayv2_api" "this" {
  name          = var.api_name
  protocol_type = "HTTP"
}
```

The above creates an API Container for a new API Gateway HTTP API (v2 is the newer version). We tell the API name an tell it that it is an HTTP API. It could be also web socket one if using `protocol_type = WEBSOCKET`.

### Creating Integration to Ec2

Now, we are going to define the integration between our ec2 and the new api gateway:

```hcl
resource "aws_apigatewayv2_integration" "ec2" {
  api_id                 = aws_apigatewayv2_api.this.id
  integration_type       = "HTTP_PROXY"
  integration_uri        = var.ec2_public_url
  integration_method     = "ANY"
  payload_format_version = "1.0"
}
```

We define the both `uri`s above - the API Gateway and the EC-2 instance. `integration_type` tells that it is an HTTP Proxy meaning that all requests are forwarded into `integration_url` as is. `payload_format_version` is simply to ensure the request/response payload use HTTP/1.1 passthrough formatting.

Notice that `ec2_public_url` has to be a full URL like: `"http://<public-ec2-ip>:8080"`

### Integration Routes

Now that we have integration done, we need to specify when to activate it, i.e., on which request route. In our case it is all the requests should be routed to EC-2, so we need to say "whatever the request route/path, proxy it to ec2". Saying it in terraform language is like following:

```hcl
resource "aws_apigatewayv2_route" "proxy" {
  api_id    = aws_apigatewayv2_api.this.id
  route_key = "ANY /{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.ec2.id}"
}
```

The `ANY` - match all HTTP methods: `GET`, `POST`, `PUT`, etc., `/{proxy+}` is to match any pathname, and the `target` is naturally the target our ec2 integration.

### Adding Stage

API Gateways require definition of deployment and stage. Stages exist because API Gateway is designed for API lifecycle management. They allow us define environments like `dev` vs `prod`. Let's start coding it:

```hcl
resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.this.id
  name        = "$default"
  auto_deploy = true
}
```

We will specify `$default` stage meaning we do not have production and dev environment, we only have 1 environment, since this is enough for our use case. Note, it bigger projects, we could have wanted multiple stages for better deployment strategies of API like separate environments (dev/staging/prod) but only a single API definition.

- https://api.example.com/dev/... → forwards to dev EC2
- https://api.example.com/prod/... → forwards to prod EC2

the `auto_deploy = true` means changes to routes/integrations are automatically deployed (no need for manual deploys).

### Custom Domain Mapping

Finally we have all the integration and rules in place, we are going to move a big higher in the picture and assing DNS and SSL to our Gateway API. It is pretty simple to do:

```hcl
resource "aws_apigatewayv2_domain_name" "custom" {
  domain_name = var.domain_name

  domain_name_configuration {
    certificate_arn = var.acm_certificate_arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }
}
```

We simply specify the `domain_name` for DNS and the `certificate_arn` for SSL. `endpoint_type = "REGIONAL"` means that the API Gateway is deployed regionally and is not optimized for edge like for example in cloudfront. Finally we glue it all together in the mapping:

```hcl
resource "aws_apigatewayv2_api_mapping" "mapping" {
  api_id      = aws_apigatewayv2_api.this.id
  domain_name = aws_apigatewayv2_domain_name.custom.id
  stage       = aws_apigatewayv2_stage.default.id
}
```

Together, these ensure our API is available at https://api.example.com instead of the ugly default abcdef123.execute-api.us-east-1.amazonaws.com.

### Adding Route53 alias record

Finally, we want to make our DNS entry point at the custom domain in API Gateway:

```hcl
resource "aws_route53_record" "api" {
  zone_id = var.route53_zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_apigatewayv2_domain_name.custom.domain_name_configuration[0].target_domain_name
    zone_id                = aws_apigatewayv2_domain_name.custom.domain_name_configuration[0].hosted_zone_id
    evaluate_target_health = false
  }
}
```

## Using it as a module

Now that we have defined all the moving pieces of the API Gateway module, we can use it in our terraform as follows:

```hcl
module "api_gateway" {
  source              = "git::https://github.com/your-repo/infra.git//modules/api-gateway?ref=main"
  api_name            = "my-api"
  domain_name         = "myapp.example.com"
  acm_certificate_arn = module.ssl_acm.aws_acm_certificate_arn
  ec2_public_url      = "http://${module.ec2.public_ip}:80"
}
```

## Updating Ec-2 firewall rules

We have added an API Gateway and told it that our ec2 is ready to listen on port 80. Next we need to update the firewall security groups of our ec-2 instance so that the port 80 is actually opened. Once it is opened, we will harden the rule by saying that it should accept connections only from our API Gateway. Let's update the Ec-2 security group. From [Deploying EC2 instance on AWS with Terraform](https://www.viktorvasylkovskyi.com/posts/provisioning-ec2-on-aws-with-terraform), our security group originally looks like this:

```hcl
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

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

We will update it with port 80:

```hcl
resource "aws_security_group" "my_app" {
  name   = "SSH port for API"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = data.aws_ip_ranges.apigw.cidr_blocks
  }
}
```

And the `cird_blocks` are the IP ranges that are allowed for that security group, in our case inbound traffic for port 80. The `data.aws_ip_ranges.apigw.cidr_blocks` come from the official AWS public IP ranges JSON. It will not work just like that, we need to make terraform fetch this JSON by writing it down:

```hcl
data "aws_ip_ranges" "apigw" {
  services = ["API_GATEWAY"]  # Only API Gateway IPs
  regions  = ["us-east-1"]    # Your API Gateway region
}
```

We can also output them to see what IPs are those:

```hcl
output "apigw_ips" {
  value = data.aws_ip_ranges.apigw.cidr_blocks
}
```

## Testing

Now that we have all the code in place, I will let you glue the modules together. I suggest you follow my previous notes to get familiar, or use my open source infra project as an example https://github.com/vvasylkovskyi/viktorvasylkovskyi-infra.

Once the code is ready, run `terraform init` and `terraform apply --auto-approve` and see that your infra is working now with the API Gateway!

## Conclusion

And that is a wrap! We have provisioned the setup that achieves the following:

- Users hit https://api.example.com
- DNS (Route 53) resolves to API Gateway
- API Gateway terminates SSL (using ACM cert)
- Routes any request → EC2 backend (via public IP).

I hope you managed to make it work and, like me, if you are migrating from CloudFront or ALB, you will manage so save couple of $. Full code available at https://github.com/vvasylkovskyi/vvasylkovskyi-infra/tree/vv-adding-api-gateway. If you have some issue please let me know and I will be glad to help. Happy coding!
