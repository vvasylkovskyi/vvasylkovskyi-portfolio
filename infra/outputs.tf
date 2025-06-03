output "ec2_ip_address" {
  value       = aws_eip.portfolio.public_ip
  description = "The Elastic IP address allocated to the EC2 instance."
}

