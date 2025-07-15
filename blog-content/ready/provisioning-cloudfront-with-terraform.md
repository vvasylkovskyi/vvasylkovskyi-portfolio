# Provision CloudFront CDN with Terraform

Previously we have seen how to setup an EC-2 instance, run a simple web server and expose it at your domain using Route53. This allows us to access our web server using HTTP at port 80. The natural next step in that setup is to use HTTPS (HTTP + SSL) and enforce access at port 443 instead. We will do it here by adding Cloudfront and ACM to our terraform setup. Let's dive in.

## Disclaimer

It is a good practice to place HTTPS termination in different place in architecture than a server itself due to good software design practices such as separation of concerns. In this approach, I chose to work with Cloudfront, however you can use other options as HTTPS termination like AWS Load Balancer (ALB) or AWS API Gateway. Since we have only 1 instance so far, Cloudfront will work great.

## Adding Cloudfront distribution

I will confess that it is not super easy to add CloudFront + ACM for HTTPS for a beginner, so I will break down the steps from simplest cloud architecture to most complicated one hopefully clarifying the steps and the reason for taking them.

First step to add an HTTPS using Cloudfront is naturally to create a Cloudfront distribution. Cloudfront distribution is a CDN network that expands copies of your data towards other geografical locations. From the programmer point of view, Cloudfront is a URL - the distribution URL that uses the content from the `origin`. Hence these are the two fundamental pieces that we need for now to make sure the distribution works. So let's dive in.

### Adding Cloudfront - Creating Origin Server

First thing is to define our origin endpoint. We can do it using Route53, where the origin is a URL pointing to our Ec-2 instance. Let's do it

```tf
# Route53.tf

resource "aws_route53_zone" "main" {
  name = "viktorvasylkovskyi.com"
}

resource "aws_route53_record" "origin" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "origin.your-domain.com"
  type    = "A"
  ttl     = 300

  records = [aws_eip.portfolio.public_ip]
}
```

You can test now by running `terraform apply`. Note, this `origin.your-domain.com` is going to be available on HTTP now.

### Adding Cloudfront - Define Distribution

Now that we have an origin, we can create distribution:

```tf
# cloud_front.tf

resource "aws_cloudfront_distribution" "cdn" {
  enabled             = true
  default_root_object = "index.html"

  origin {
    domain_name = aws_route53_record.origin.fqdn
    origin_id   = aws_route53_record.origin.fqdn

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = aws_route53_record.origin.fqdn

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  price_class = "PriceClass_100"

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
}
```

Whoa! that is alot of configs. One of the main pieces there is the `target_origin_id`. This will be pointing to our `origin.your-domain.com`. For now we will use `cloudfront_default_certificate` which is CloudFront certificate.

Let's add a test output:

```tf
# output.tf

output "cloudfront_distribution_domain_name" {
  value = aws_cloudfront_distribution.cdn.domain_name
}
```

We will use this to test.

## Apply changes

Run `terraform apply` and observe the `cloudfront_distribution_domain_name` output. It should return something like

```sh
d123456789abcdef.cloudfront.net.
```

If everything went well then you should be able to open the URL in the browser.

## Conclusion

I started this notes explaining how to add HTTPS using CloudFront, but I ended-up realizing that two concepts at the same time can be confusing so I decided to split them in two. This way, we can test things in sequence, and ensure that all the preconditions work for SSL. Next let's explore about how to add SSL certificate to our CloudFront distribution.

### ACM Certificate for HTTPS

Cloudfront requires SSL certificates to be in `us-east-1` region regardles of where our resources are. So we will begin by adding a new provider:

```tf
# ssl.tf

provider "aws" {
  alias                    = "us_east_1"
  region                   = "us-east-1"
  shared_credentials_files = ["./.aws-credentials"]
  profile                  = "terraform"
}
```

Note, even if your original provider is `us-east-1`, we need to define the alias for SSL to work. Next, let's create an ACM resource.

```tf
# ssl.tf
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

This requests an SSL/TLS certificate from AWS Certificate Manager for your domain. We choose DNS validation (simplest in Terraform if using Route 53).

Note that we are adding `lifecycle.create_before_destroy`. This is because in case you change something on this resource, since Cloud Front will be using the certificate, this directive allows to duplicate certificate, and replace old one before destroying it thus allowing cloud front to switch certificates without issues.

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

The FQDNS stands for Fully Qualified Domain Name btw.

### Adding CloudFront Distribution

In the next step we are going to create a cloudfront distribution which contains an endpoint with HTTPS termination and is a place where we are going to place our SSL certificate. First we need to set a rule to wait for the certificate to be validated before creating the distribution.

```tf
# cloud_front.tf

resource "aws_cloudfront_distribution" "cdn" {
  depends_on = [aws_acm_certificate_validation.cert]
}
```

Next, we are going to add origin pointing to our ec2 instance.

```tf
# cloud_front.tf

resource "aws_cloudfront_distribution" "cdn" {
  depends_on = [aws_acm_certificate_validation.cert]

  origin {
    domain_name = aws_instance.portfolio.public_dns
    origin_id   = "ec2-origin"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }
}
```

This section defines where CloudFront fetches content from — your EC2 public DNS. Even though CloudFront will serve HTTPS to users, it talks to the EC2 instance over HTTP (http-only).

**Default Cache Behavior**: This forces all incoming requests to use HTTPS, even if the user types `http://.` Other parts configure what methods to allow (GET, HEAD) and what to cache (in this case, not much since it's a basic setup).

```tf
resource "aws_cloudfront_distribution" "cdn" {
  depends_on = [aws_acm_certificate_validation.cert]

  origin {
    domain_name = aws_instance.portfolio.public_dns
    origin_id   = "ec2-origin"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

    enabled             = true
  default_root_object = "index.html"

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "ec2-origin"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  price_class = "PriceClass_100"
}
```

**Viewer certificate:** Tells CloudFront to use the validated ACM certificate for https://www.your-domain.com.

```tf
# cloud_front.tf

resource "aws_cloudfront_distribution" "cdn" {
  depends_on = [aws_acm_certificate_validation.cert]

  origin {
    domain_name = aws_instance.portfolio.public_dns
    origin_id   = "ec2-origin"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  enabled             = true
  default_root_object = "index.html"

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "ec2-origin"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  price_class = "PriceClass_100"

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.cert.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
}
```

### Route 53 Record Pointing to CloudFront

Now that Cloudfront setup is done, it is going to be available between our ec2 instance and our DNS. So now we have the Cloudfront doing SSL and sending requests to the ec2 instance. The last step is to enable our DNS Route 53 to send.

```tf
# route53.tf

resource "aws_route53_record" "www_https" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "www.your-domain.com"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.cdn.domain_name
    zone_id                = aws_cloudfront_distribution.cdn.hosted_zone_id
    evaluate_target_health = false
  }
}
```

This sets an alias A record in Route 53 so your domain `www.your-domain.com` points to the CloudFront distribution instead of the EC2 directly. Note, make sure that you remove the previous `aws_route53_record: www` that was setting your Route53 to be HTTP.

Lastly, let's not forget to expose port 443 in our VPC security group:

```tf
# security_group.tf

resource "aws_security_group" "my-app" {
  name   = "SSH Port"
  vpc_id = aws_vpc.main.id

  ...

  ingress {
    cidr_blocks = [
      "0.0.0.0/0"
    ]
    from_port = 443
    to_port   = 443
    protocol  = "tcp"
  }

  ...
}
```

### Output

Finally, let's add some output for debugging:

```tf
# output.tf

output "https_url" {
  value       = "https://www.your-domain.com"
  description = "Public HTTPS endpoint for the EC2 app."
}
```

## Applying changes

Since we have added new provider (alias), we need to install it using `terraform init` first.

```sh
terraform init
```

All should be working now, lets try to provision our new infrastructure. Run: `terraform apply --auto-approve`.

## Final Validations

You should be able to open your app using `https://www.your-domain.com`. However if it is not working, we can troubleshoot:

### Check DNS propagation

Run:

```sh
dig www.your-domain.com +short
```

If it still returns an IP address, it means the A record is pointing directly to EC2 and not CloudFront — which won't support HTTPS directly.

## Conclusion

We have covered quite a bit of things today:

- SSL certificate via ACM
- HTTPS access via CloudFront
- DNS validation using Route 53
- A secure, CDN-backed endpoint for your EC2 app at https://www.your-domain.com
