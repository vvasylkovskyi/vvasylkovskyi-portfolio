output "ec2_ip_address" {
  value = aws_instance.portfolio.public_ip
}

