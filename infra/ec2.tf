resource "aws_key_pair" "ssh-key" {
  key_name   = "ssh-key"
  public_key = local.secrets.ssh_public_key
}

resource "aws_instance" "portfolio" {
  ami                         = var.instance_ami
  instance_type               = var.instance_type
  availability_zone           = var.availability_zone
  security_groups             = [aws_security_group.portfolio.id]
  associate_public_ip_address = true
  subnet_id                   = aws_subnet.portfolio.id

  key_name = "ssh-key"

  user_data = templatefile("${path.module}/user_data.tpl", {
    datadog_api_key = local.secrets.datadog_api_key
  })

  iam_instance_profile = aws_iam_instance_profile.secrets_manager_profile.name

  user_data_replace_on_change = true

  tags = {
    Name = "portfolio"
  }
}

resource "aws_iam_instance_profile" "secrets_manager_profile" {
  name = "secrets_manager_profile"
  role = aws_iam_role.secrets_manager_role.name
}