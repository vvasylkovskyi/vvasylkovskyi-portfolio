# Provision SSL and HTTPS with Terraform using Cloudfront, ACM, Route53 and Ec2

At this point, you should have provisioned EC-2 and CloudFront. If not, check these notes:

- [Deploying EC2 instance on AWS with Terraform](https://www.viktorvasylkovskyi.com/posts/provisioning-ec2-on-aws-with-terraform)
- [Provision DNS records with Terraform](https://www.viktorvasylkovskyi.com/posts/provisioning-dns-records-with-terraform)
- [Provision CloudFront CDN with Terraform](https://www.viktorvasylkovskyi.com/posts/provisioning-cloudfront-with-terraform)

In this note, we will provision SSL certificate using ACM, and add HTTPS termination on our Cloudfront distribution.

## ACM Certificate for HTTPS

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

This requests an SSL/TLS certificate from AWS Certificate Manager for your domain. We choose DNS validation (simplest in Terraform if using Route 53).Note that we are adding `lifecycle.create_before_destroy`. This is because in case you change something on this resource, since Cloud Front will be using the certificate, this directive allows to duplicate certificate, and replace old one before destroying it thus allowing cloud front to switch certificates without issues.

## DNS Validation via Route 53

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

## Adding new Route53 for HTTPS pointing to CloudFront Distribution

Now that we have successfully validated the certificate, next lets ensure that we have a URL that will be using cloud front distribution. Here we essentially are adding new Route53 record, which will be pointing to the cloudfront distribution URL:

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

## Making CloudFront Distribution use our new certificatie

Now that we have a certificate, and we can access to our cloudfront distribution from a custom domain name such as `http://www.your-domain.com`. But of course we want it to be `https` (with an `s` as in SSL). So the next step to do that is to instruct our CloudFront to use the right certificate.

First we need to set a rule to wait for the certificate to be validated before creating the distribution.

```tf
# cloud_front.tf

resource "aws_cloudfront_distribution" "cdn" {
  depends_on = [aws_acm_certificate_validation.cert]
  aliases = ["www.your-domain.com"]
}
```

The `aliases` create `Alternate domain names` also known as `CNAME`. This is essential for our SSL handshake to work well. Next, we already have rules that instruct CloudFront to redirect traffic to our origin which is our ec-2 instance. The only missing piece is to change the `viewer_certificate`. **Viewer certificate:** Tells CloudFront to use the validated ACM certificate for https://www.your-domain.com.

```tf
# cloud_front.tf

resource "aws_cloudfront_distribution" "cdn" {
  depends_on = [aws_acm_certificate_validation.cert]
  aliases = ["www.your-domain.com"]

  ...
  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.cert.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  ...
}
```

And that is it. All set for cloudfront and ACM.

## Update security groups to allow port 443

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

### Check for SSL handshake

Run:

```sh
curl -Iv https://www.your-domain.com
```

## Conclusion

We have covered quite a bit of things today:

- SSL certificate via ACM
- HTTPS access via CloudFront
- DNS validation using Route 53
- A secure, CDN-backed endpoint for your EC2 app at https://www.your-domain.com

That was alot, hope you have all set well! Happy hacking.
