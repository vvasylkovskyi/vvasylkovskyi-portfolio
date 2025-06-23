# Provision Datadog Observability on ECS with Terraform

Previously we had EC-2 instance and Datadog agent monitoring instance itself. I recommend you give it a read here before diving into this notes: [Provision Datadog Observability on Ec-2 with Terraform](https://www.vvasylkovskyi.com/posts/provisioning-datadog-on-ec2-with-terraform).

In our previous notes, we had moved away from using single EC-2 to ECS for better infrastructure: [Scaling our infra - from 1 EC-2 to ECS](https://www.vvasylkovskyi.com/posts/provisioning-ecs-and-scaling-our-ec2). As a result, we are no longer serving static html webpage directly from the machine, but we are serving what is inside docker container. Docker containers stop and start as the ECS task dictates while EC-2 instances may remain unchanges, so it is far more interesting to monitor on the docker container level as it provides better isolation of logs and metrics.

In this notes we will describe how to setup Datadog monitoring as a sidecar while using ECS cluster and we will do all this using terraform. 

## Prerequisites



## Defining IAM for the ECS

We are going to need our ECS to have access to the secrets manager to retrieve datadog API Key and other related secrets. So let's define it: 


```hcl
resource "aws_iam_role" "ecs_task_role" {
  name = "ecs_task_role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "secrets_manager_policy" {
  name = "secrets_manager_policy"
  role = aws_iam_role.ec2_instance_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [
          "arn:aws:secretsmanager:${var.aws_region}:${data.aws_caller_identity.current.account_id}:secret:*"
        ]
      }
    ]
  })
}
```

This code snippet just creates a new role and assignes the policy to that role stating tha we can access to secrets manager read thus providing Least Priviledge Principle. Note remember when we defined a caller identity in this notes: [Provision AWS Secret Manager and Store Secrets Securely](https://www.vvasylkovskyi.com/posts/provisioning-aws-secret-manager-and-securing-secrets) like follows: 

```hcl
data "aws_caller_identity" "current" {}
```

Now, we need to attach this policy to our task in `ecs.tf`

```hcl

resource "aws_ecs_task_definition" "my_app" {
  ... rest of the code
  task_role_arn = aws_iam_role.ecs_task_role.arn

}
```

## Provisioning Datadog Agent as a Sidecar in the ECS task definition

```hcl
container_definitions = jsonencode([
    {
      name      = "portfolio"
      image     = "vvasylkovskyi1/vvasylkovskyi-portfolio:latest"
      essential = true
      portMappings = [
        {
          containerPort = 3000
          hostPort      = 80
        }
      ]
    },
    {
      name      = "datadog-agent"
      image     = "gcr.io/datadoghq/agent:latest"
      essential = false
      environment = [
        {
          name  = "DD_API_KEY"
          value = local.secrets.datadog_api_key
        },
        {
          name  = "DD_SITE"
          value = "datadoghq.eu"
        },
        {
          name  = "ECS_FARGATE"
          value = "false"
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/datadog-agent"
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])
```

##

For ECS EC2 launch type, the Datadog Agent must run in network_mode = "bridge" (the default), and you should add the following environment variable to the agent container:

```hcl
{
  "name": "ECS_AGENT_CONTAINER_INSTANCE_METADATA_ENABLED",
  "value": "true"
}
```