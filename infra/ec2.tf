resource "aws_key_pair" "ssh-key" {
  key_name   = "ssh-key"
  public_key = var.ssh_public_key
}

resource "aws_instance" "portfolio" {
  ami                         = var.instance_ami
  instance_type               = var.instance_type
  availability_zone           = var.availability_zone
  security_groups             = [aws_security_group.portfolio.id]
  associate_public_ip_address = true
  subnet_id                   = aws_subnet.portfolio.id

  key_name = "ssh-key"

  tags = {
    Name = "portfolio"
  }
}

