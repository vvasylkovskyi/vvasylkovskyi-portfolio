output "ec2_ip_address" {
  value       = module.ec2.public_ip
  description = "The Elastic IP address allocated to the EC2 instance."
}

output "ec2_domain_name" {
  value       = module.aws_route53_record.dns_record
  description = "The Elastic IP address allocated to the EC2 instance."
}

output "postgres_database_domain" {
  value       = module.rds.database_host
  description = "Postgres Database Host"
}

output "postgres_database_port" {
  value       = module.rds.database_port
  description = "Postgres Database Port"
}

