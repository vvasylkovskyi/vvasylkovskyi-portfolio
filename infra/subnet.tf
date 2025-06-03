
resource "aws_subnet" "portfolio" {
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 3, 1)
  vpc_id            = aws_vpc.main.id
  availability_zone = var.availability_zone
}

resource "aws_route_table" "portfolio" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.portfolio.id
  }

  tags = {
    Name = "portfolio"
  }
}

resource "aws_route_table_association" "subnet-association" {
  subnet_id      = aws_subnet.portfolio.id
  route_table_id = aws_route_table.portfolio.id
}
