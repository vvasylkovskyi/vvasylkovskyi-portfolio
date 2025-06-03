resource "aws_internet_gateway" "portfolio" {
  vpc_id = aws_vpc.main.id
  tags = {
    Name = "portfolio"
  }
}
