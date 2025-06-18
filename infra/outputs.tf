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

output "dynamodb_table_url" {
  value       = "https://console.aws.amazon.com/dynamodb/home?region=${var.aws_region}#tables:selected=${aws_dynamodb_table.terraform_lock.name};tab=overview"
  description = "Console URL for the DynamoDB table used for Terraform state locking."
}

output "s3_bucket_url" {
  value       = "https://s3.console.aws.amazon.com/s3/buckets/${aws_s3_bucket.terraform_state.id}?region=${var.aws_region}&tab=objects"
  description = "Console URL for the S3 bucket storing Terraform state."
}

output "iam_role_arn" {
  description = "ARN of the IAM role for Secrets Manager access"
  value       = aws_iam_role.secrets_manager_role.arn
}

output "iam_role_name" {
  description = "Name of the IAM role for Secrets Manager access"
  value       = aws_iam_role.secrets_manager_role.name
}

output "instance_profile_arn" {
  description = "ARN of the instance profile"
  value       = aws_iam_instance_profile.secrets_manager_profile.arn
}

output "instance_iam_profile" {
  description = "IAM instance profile attached to the EC2 instance"
  value       = aws_instance.portfolio.iam_instance_profile
}