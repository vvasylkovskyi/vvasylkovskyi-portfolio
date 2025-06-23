resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
}

resource "aws_eip" "portfolio_1" {
  instance = aws_instance.portfolio_1.id
  domain   = "vpc"
}
