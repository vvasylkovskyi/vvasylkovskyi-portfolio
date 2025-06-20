resource "aws_key_pair" "ssh-key" {
  key_name   = "ssh-key"
  public_key = local.secrets.ssh_public_key
}

resource "aws_instance" "portfolio" {
  ami           = data.aws_ami.ecs.id
  instance_type               = var.instance_type
  availability_zone           = var.availability_zone
  security_groups             = [aws_security_group.portfolio.id]
  associate_public_ip_address = true
  subnet_id                   = aws_subnet.portfolio.id

  key_name = "ssh-key"

  user_data = <<-EOF
              #!/bin/bash
              echo ECS_CLUSTER=${aws_ecs_cluster.portfolio.name} >> /etc/ecs/ecs.config
              EOF

  iam_instance_profile = aws_iam_instance_profile.ec2_instance_profile.name

  user_data_replace_on_change = true

  tags = {
    Name = "portfolio"
  }
}

resource "aws_iam_instance_profile" "ec2_instance_profile" {
  name = "ec2_instance_profile"
  role = aws_iam_role.ec2_instance_role.name
}