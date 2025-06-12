output "ec2_ip_address" {
  value       = aws_eip.portfolio.public_ip
  description = "The Elastic IP address allocated to the EC2 instance."
}

output "ec2_http_url" {
  value       = "http://${aws_instance.portfolio.public_dns}"
  description = "The public DNS-based HTTP URL to access the EC2 instance."
}

# output "ec2_https_domain" {
#   value       = "https://${aws_route53_record.notes_https.name}"
#   description = "The domain name pointing to your EC2 instance."
# }

output "cloudfront_distribution_arn" {
  value = aws_cloudfront_distribution.cdn.arn
}
output "cloudfront_distribution_domain_name" {
  value = aws_cloudfront_distribution.cdn.domain_name
}

output "cloudfront_origin_route53_fqdn" {
  value = aws_route53_record.origin.fqdn
}

output "aws_acm_certificate_cert_arn" {
  value = aws_acm_certificate.cert.arn
}

output "datadog_integration_key" {
  value = pagerduty_service_integration.datadog_integration.integration_key
}
