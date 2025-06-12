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

  user_data = <<-EOF
              #!/bin/bash
              sudo yum update -y || sudo apt-get update -y
              sudo yum install -y python3 || sudo apt-get install -y python3
              DD_API_KEY=${var.datadog_api_key} DD_SITE="datadoghq.eu"  bash -c "$(curl -L https://install.datadoghq.com/scripts/install_script_agent7.sh)" &
              echo "<html><body><h1>Hello from Terraform EC2!</h1></body></html>" > index.html
              nohup python3 -m http.server 80 &
              EOF

  user_data_replace_on_change = true

  tags = {
    Name = "portfolio"
  }
}
