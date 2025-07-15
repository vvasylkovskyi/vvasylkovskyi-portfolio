# Provisioning Auto Scaling Group with Terraform and connecting it to our Load Balancer and ECS

In the previous notes we have introduced alot of new resources: 

 - New Load Balancer attached to our ECS
 - Two public subnets in different availability zones for load balancer
 - increased the number of EC-2 instances from 1 to 2. 

You can read more about it in [Provisioning Application Load Balancer and connecting it to ECS using Terraform](https://www.viktorvasylkovskyi.com/posts/provisioning-alb-and-connecting-to-ecs). 

But we have been managing the EC-2 instances manually by hardcoding two instances. There is a better way - launching instances on demand as the need for more resources appear. Similarly, as the load decreases and number of resources needed is lower, we can decommision some instances. This is a job for Auto Scaling Group:

## Why Use an Auto Scaling Group?

  - Manages EC2 instance count automatically (based on desired, min, max, or scaling policies).
  - Replaces unhealthy instances automatically.
  - Distributes instances across subnets/AZs for high availability.
  - Integrates with ECS Capacity Providers for seamless scaling of ECS tasks.

For ECS EC2 Auto Scaling Group we need a minimal setup using `Launch Template`, `Auto Scaling Group` and `ECS Capacity Provider`. We will talk in detail about each one of them


## Provisioning EC-2 Instances using AWS Launch Template

AWS Launch template defines how EC2 instances for ECS should be launched (AMI, instance type, user data, security groups, IAM profile). We will use the resources already defined for our AWS Launch template for ecs. 

```hcl
# ec2.tf

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
```

Here we will be using same ssh key for all instances which is not great, but it is ok for our incremental improvement in infrastructure. 

Next, this launch template will be used in AWS Autoscaling Group. 

## Adding Autoscaling group

Auto scaling group manages the EC2 instances, keeps the desired count, and replaces unhealthy ones. Distributes across our public subnets. Let's begin by adding minimal auto scaling group resource: 

```hcl
# auto_scaling_group.tf 

resource "aws_autoscaling_group" "ecs" {
  name                      = "ecs-asg"
  min_size                  = 1
  max_size                  = 4
  desired_capacity          = 2
  vpc_zone_identifier       = aws_subnet.public[*].id
  launch_template {
    id      = aws_launch_template.ecs.id
    version = "$Latest"
  }
  health_check_type         = "EC2"
  health_check_grace_period = 300
  protect_from_scale_in     = true 
}
```

The above ASG will keep at least 1 and at most 4 instances running, aiming at 2 by default. It will launch them in all subnets that we have as per `vpc_zone_identifier`. For the health check, the ASG will be using EC-2 health check types and wait for 300 seconds before checking instance health. Note, ` protect_from_scale_in=true` essentially protects the ECS instances from being terminated in the event of ASG scale-in. 


## Adding ECS Capacity Provider

Capacity provider connects ASG and ECS, so that ECS can scale EC-2 instances as needed. Let's define it: 

```hcl
# auto_scaling_group.tf

resource "aws_ecs_capacity_provider" "asg" {
  name = "asg-provider"
  auto_scaling_group_provider {
    auto_scaling_group_arn         = aws_autoscaling_group.ecs.arn
    managed_termination_protection = "ENABLED"
    managed_scaling {
      status                    = "ENABLED"
      target_capacity           = 100
      minimum_scaling_step_size = 1
      maximum_scaling_step_size = 4
      instance_warmup_period    = 300
    }
  }
}
```

Note we are linking our Auto Scaling Group here `auto_scaling_group_arn`. the `managed_termination_protection=ENABLED` states that EC 2 instances running ECS tasks will not be terminated unless they are drained first. 

The `managed_scaling` is where the main scaling definition resised. The Status enabled allows ECS to automatically scale the ASG based on the needs of our ECS tasks. The `target_capacity=100` means that ECS will try to keep the ASG at 100% capacity for running tasks (i.e., enough EC2 instances to run all the tasks). `minimum_scaling_step_size` / `maximum_scaling_step_size`:
Controls how many instances to add/remove at a time when scaling.

Finally, let's tell to our ECS Cluster to use the capacity provider defined above

```hcl
# auto_scaling_group.tf

resource "aws_ecs_cluster_capacity_providers" "portfolio" {
  cluster_name       = aws_ecs_cluster.portfolio.name
  capacity_providers = [aws_ecs_capacity_provider.asg.name]
  default_capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.asg.name
    weight            = 1
    base              = 1
  }
}
```

  - `default_capacity_provider_strategy`: Sets the default strategy for how ECS should use the capacity provider when launching tasks:
  - `weight`: If you have multiple providers, this controls the proportion of tasks placed on each. Here, only one is used.
  - `base`: The minimum number of tasks to run on this provider before considering others (if you had more than one).

## Conclusion

With this setup, we’ve automated EC2 management for our ECS cluster using an Auto Scaling Group and capacity provider. Now, our infrastructure can scale up or down based on demand, keeping things efficient and highly available—no more manual instance management. This is a solid foundation for a production-ready, self-healing ECS environment.