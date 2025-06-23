data "aws_ami" "ecs" {
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "name"
    values = ["amzn2-ami-ecs-hvm-*-x86_64-ebs"]
  }
}

resource "aws_ecs_cluster" "portfolio" {
  name = "portfolio-cluster"
}

resource "aws_ecs_task_definition" "portfolio" {
  family                   = "portfolio-task"
  network_mode             = "bridge"
  requires_compatibilities = ["EC2"]
  cpu                      = "256"
  memory                   = "512"
  task_role_arn = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name      = "portfolio"
      image     = "vvasylkovskyi1/vvasylkovskyi-portfolio:latest"
      essential = true
      portMappings = [
        {
          containerPort = 80
          hostPort      = 80
        }
      ]
    },
    # {
    #   name      = "datadog-agent"
    #   image     = "gcr.io/datadoghq/agent:latest"
    #   essential = false
    #   environment = [
    #     {
    #       name  = "DD_API_KEY"
    #       value = local.secrets.datadog_api_key
    #     },
    #     {
    #       name  = "DD_SITE"
    #       value = "datadoghq.eu"
    #     },
    #     {
    #       name  = "ECS_FARGATE"
    #       value = "false"
    #     },
    #     {
    #       name  = "DD_ECS_AGENT_CONTAINER_INSTANCE_METADATA_ENABLED"
    #       value = "true"
    #     }
    #   ]
    #   # logConfiguration = {
    #   #   logDriver = "awslogs"
    #   #   options = {
    #   #     "awslogs-group"         = "/ecs/datadog-agent"
    #   #     "awslogs-region"        = var.aws_region
    #   #     "awslogs-stream-prefix" = "ecs"
    #   #   }
    #   # }
    # }
  ])
}

resource "aws_ecs_service" "portfolio" {
  name            = "portfolio-service"
  cluster         = aws_ecs_cluster.portfolio.id
  task_definition = aws_ecs_task_definition.portfolio.arn
  desired_count   = 2
  launch_type     = "EC2"

  load_balancer {
    target_group_arn = aws_lb_target_group.portfolio.arn
    container_name   = "portfolio"
    container_port   = 80
  }

  deployment_minimum_healthy_percent = 0
  deployment_maximum_percent         = 100
}