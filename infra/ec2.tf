resource "aws_key_pair" "ssh-key" {
  key_name   = "ssh-key"
  public_key = local.secrets.ssh_public_key
}

resource "aws_launch_template" "ecs" {
  name_prefix   = "ecs-"
  image_id      = data.aws_ami.ecs.id
  instance_type = var.instance_type
  key_name      = aws_key_pair.ssh-key.key_name
  user_data     = base64encode(<<-EOF
    #!/bin/bash
    echo ECS_CLUSTER=${aws_ecs_cluster.portfolio.name} >> /etc/ecs/ecs.config
  EOF
  )
  vpc_security_group_ids = [aws_security_group.portfolio.id]

  iam_instance_profile {
    arn = aws_iam_instance_profile.ec2_instance_profile.arn
  }
}



resource "aws_iam_instance_profile" "ec2_instance_profile" {
  name = "ec2_instance_profile"
  role = aws_iam_role.ec2_instance_role.name
}