resource "aws_autoscaling_group" "ecs" {
  name                      = "ecs-asg"
  min_size                  = 1
  max_size                  = 1
  desired_capacity          = 1
  vpc_zone_identifier       = aws_subnet.public[*].id
  launch_template {
    id      = aws_launch_template.ecs.id
    version = "$Latest"
  }
  health_check_type         = "EC2"
  health_check_grace_period = 300
  protect_from_scale_in     = true 

  tag {
    key                 = "Name"
    value               = "ecs-instance"
    propagate_at_launch = true
  }
}

resource "aws_ecs_capacity_provider" "asg" {
  name = "asg-provider"
  auto_scaling_group_provider {
    auto_scaling_group_arn         = aws_autoscaling_group.ecs.arn
    managed_termination_protection = "ENABLED"
    managed_scaling {
      status                    = "ENABLED"
      target_capacity           = 100
      minimum_scaling_step_size = 1
      maximum_scaling_step_size = 1
      instance_warmup_period    = 300
    }
  }
}

resource "aws_ecs_cluster_capacity_providers" "portfolio" {
  cluster_name       = aws_ecs_cluster.portfolio.name
  capacity_providers = [aws_ecs_capacity_provider.asg.name]
  default_capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.asg.name
    weight            = 1
    base              = 1
  }
}