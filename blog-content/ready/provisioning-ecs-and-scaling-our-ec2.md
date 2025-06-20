# Scaling our infra - from 1 EC-2 to ECS

In these notes we are going to level up our infrastructure setup. Mainly we are going to scale it from one EC-2 instance to having a cluster, potentially with 2 instances for starters. This provides alot of benefits among which are rolling updates, higher availability and more. Let's get started

## Prerequisites

This article assumes that you already have a VPC provisioned using Terraform and that your AWS environment is properly configured. Since remote state storage requires provisioning resources within AWS, I recommend reading this article to set that up first: [Deploying EC2 instance on AWS with Terraform](https://www.vvasylkovskyi.com/posts/provisioning-ec2-on-aws-with-terraform).

## Provisioning ECS with terraform

We are going to have to migrate from single EC-2 instance to the cluster of EC-2 managed by ECS cluster. So here is what is going to happen: 

  - We will create an ECS Cluster
  - Update EC-2 Instance to join the ECS cluster
  - Create an ECS service - this is the service that manages the deployment and lifecycle of our containers.
  - Create an ECS task definition - what the cluster instances will do. This is essentially where we tell it to run docker images
  - Provide the right AMI to EC-2 instance


### Create ECS Cluster

An ECS cluster is a logical grouping of EC2 instances where our containers will be scheduled and run. We need an ECS cluster to manage and orchestrate Docker containers using Amazon ECS.

```hcl
# ecs.tf

resource "aws_ecs_cluster" "my_app" {
  name = "my_app-cluster"
}
```

### Updating Ec-2 instances to join the cluster

Now that the instances will be part of the cluster, they will all follow the same pattern of functioning, since they are essentially replicas of each other. So, instead of configuring single instance of how it should behave, we are going to delegate this configuration to the cluster. All that the instance have to do is to join the cluster on boot, so let's modify our `ec2.tf`

```hcl
# ec2.tf

resource "aws_instance" "my_app" {
  # ...existing code...

  user_data = <<-EOF
              #!/bin/bash
              echo ECS_CLUSTER=${aws_ecs_cluster.my_app.name} >> /etc/ecs/ecs.config
              EOF

  # ...existing code...
}
```

The above code appends line to `/etc/ecs/ecs.config` specifying cluster name. This tells the ECS agent on the instance to register with the specified cluster, allowing ECS to schedule containers on this EC2 instance.

### Create an ECS Service

Here we are going to define ECS service that will manage the lifecycle of the deplyoment of containers. It ensures the desired number of container instances are running, handles rolling updates and can integrate with load balancers. Let's define it: 


```hcl
resource "aws_ecs_service" "portfolio" {
  name            = "portfolio-service"
  cluster         = aws_ecs_cluster.portfolio.id
  task_definition = aws_ecs_task_definition.portfolio.arn
  desired_count   = 1
  launch_type     = "EC2"

  deployment_minimum_healthy_percent = 0
  deployment_maximum_percent         = 100
}
```

We are yet to write the `task_definition` resource which is essentially telling to the service about what is the task that the cluster instances have to do when they start. For now, we will specify only 1 instance, of type EC2. The `deployment_maximum_percent` and `deployment_minimum_healthy_percent` define how to deploy new instances and tear down old ones. We will come back to them later in our setup. 

We specify the `launch_type` - EC2 which corresponds with our `aws_instance` which are EC-2. Remember the `aws_instance` provides the compute resources (CPU, memory, networking) where the containers can run, while `aws_ecs_service` (ECS Service) tell ECS *what* containers to run, how many, and manages their lifecycle on the cluster.

### Create an ECS Task Definition

Now, finally we will define what is the task to perform: `aws_ecs_task_definition`

```hcl
# ecs.tf

resource "aws_ecs_task_definition" "my_app" {
  family                   = "my_app-task"
  network_mode             = "bridge"
  requires_compatibilities = ["EC2"]
  cpu                      = "256"
  memory                   = "512"

  container_definitions = jsonencode([
    {
      name      = "<your-app-name>"
      image     = "<your-docker-image-path>"
      essential = true
      portMappings = [
        {
          containerPort = 80
          hostPort      = 80
        }
      ]
    }
  ])
}
```

Here we specify the task, that it is intended to run on EC2 instances (not Fargate) - `requires_compatibilities=["EC2"]`, sets the amount of CPU units to reserve for the task (256 = 0.25 vCPU) and 512 MiB of memory.

Finally we specify the container definitions about what image to run, its name, and port mappings. The `essential` tells the task that if the container stops, the task stops.


### Provide the right AMI to EC-2 instance

If you are using a standard Linux Amazon Machine Image (AMI), chances are that something will not work with your setup. For ECS, you should use an ECS-optimized AMI, which comes pre-installed with the ECS agent and Docker, making it ready to join your ECS cluster and run containers.

In Terraform we can fetch the latest ECS-optimized AMI like follows: 


```hcl
data "aws_ami" "ecs" {
  most_recent = true
  owners      = ["amazon"]
  filter {
    name   = "name"
    values = ["amzn2-ami-ecs-hvm-*-x86_64-ebs"]
  }
}
```

Then, use `data.aws_ami.ecs.id` as the `ami` value for our `aws_instance` resource. This ensures your EC2 instance is ready for ECS out of the box. Let's add it. 

```hcl
resource "aws_instance" "portfolio" {
  ami           = data.aws_ami.ecs.id
  # ...other config...
}
```

To test, let's run `terraform apply --auto-approve` and check if ECS process was started successfully and docker containers are running. Previously we had attributed a fixed IP address to our EC-2 instance, so we can use it for SSH. Note the new AMI speicies `ec2-user` and not `ubuntu`

```bash
ssh -i /path/to/your/private-key.pem ec2-user@<EC2_PUBLIC_IP>
sudo systemctl status ecs
sudo docker ps
sudo cat /var/log/ecs/ecs-agent.log | tail -n 50
```

### Attaching IAM role for ECS instances

By that far, if you had run the `docker ps` and `cat /var/log/ecs/ecs-agent.log | tail -n 50` you most likely have an `AccessDeniedException: ` since we did not attach the AWS Ec2 container service for our ec2. This means that our cluster is not managing to access to ec2 to register docker container instance. 

Remember from [the previous notes about adding AWS Secrets Manager](https://www.vvasylkovskyi.com/posts/provisioning-aws-secret-manager-and-securing-secrets), we had set the secrets manager IAM to our EC-2 so that it can access to the datadog API keys.

So we already have a role and a profile that Ec-2 uses. We only need to add a new policy to that role - the one that grants EC2 instance permissions needed by the ECS agent to manage the instance (register in ecs cluster, manage containers).

So we only need to add this

```hcl
# iam.tf

resource "aws_iam_role_policy_attachment" "ec2_instance_ecs_policy" {
  role       = aws_iam_role.ec2_instance_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role"
}
```

### Add outputs

Let's add Terraform outputs to help validate that our ECS cluster and related resources are set up correctly:

```hcl
output "ecs_cluster_id" {
  value       = aws_ecs_cluster.my_app.id
  description = "The ECS Cluster ID"
}

output "ecs_cluster_arn" {
  value       = aws_ecs_cluster.my_app.arn
  description = "The ECS Cluster ARN"
}

output "ecs_service_name" {
  value       = aws_ecs_service.portfolio.name
  description = "The ECS Service Name"
}

output "ecs_task_definition_arn" {
  value       = aws_ecs_task_definition.my_app.arn
  description = "The ECS Task Definition ARN"
}
```

Run `terraform apply --auto-approve` and see the results. If you navigate to `www.your-domain.com` then you should see you app from the docker container running. Remember, our setup remains to be `DNS -> CloudFront -> SSL -> Instance Hostname -> Fixed IP address of EC2 instance`. Even though we created a cluster here, we are not using it yet in our DNS configuration!

### Fixing the CloudFront Default root object

In our previous notes on setting up Cloudfront we had defined the `cloud_front.tf` where we were serving static asset `index.html` at the root. 

```hcl
  default_root_object = "index.html"
```

Since we are moving to the conteinerized solution, when a user visits `/` if our app does not serve a static `index.html` at the root path which is the case for server side rendered apps (Next, Node.js, Express), CloudFront will return a 404. Thus to reconcile things we need to remove the above line so that cloudfront proxies `/` request down to the container. 

## Conclusion

Whoa! We just moved from serving a static website to serving an actual application from docker image. We had to create an ECS cluster managed by AWS. Even though, we have a cluster in our infrastructure, we are still not taking advantage of it since we are using a static IP address for the EC-2 instance directly. To improve this, we will add a load balancer in the next notes, and make sure that our DNS points to it. You can find the notes about it in [Provisioning AWS Load Balancer and connecting it to ECS cluster](https://www.vvasylkovskyi.com/posts/provisioning-alb-and-connecting-to-ecs). Happy hacking!