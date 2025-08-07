# Provisioning EC2 Instances with Terraform Modules – Best Practices Guide

So I have decided to destroy my complex infra with [ECS cluster and Auto Scaling Group](https://www.viktorvasylkovskyi.com/posts/provisioning-auto-scaling-group) and try something new. The reason for the destruction of the great infra above, I realized that as the infrastructure grows, it becomes so much harded to maintain it, especially when writing the code in a very poor way like I did - I am a beginner, bear with me. 

In this notes, we are going to learn how to organise terraform code using best practices like terraform modules. For the sake of simplicity we will reduce the code to the very basic example. 

## Setup

Our new terraform setup is going to consist of EC-2 instance that is accessible via SSH. The instance is naturally situated inside the VPC and with the security groups and subnets such that we can access it via SSH or HTTP. We will also create an Elastic IP address for our instance so that the IP address is consistent. 

Here is the workspace basic code structure. 

```sh
ec2.tf
main.tf
network.tf
outputs.tf
variables.tf
security_group.tf
terraform.tfvars
```

There is not much code, so I will paste here the repository for us to fork from. The repository can be found [https://github.com/vvasylkovskyi/viktorvasylkovskyi-infra](https://github.com/vvasylkovskyi/viktorvasylkovskyi-infra).

Make sure to clone it, run `terraform init` and `terraform apply --auto-approve`. Check you EIP address in console and access it via SSH using `ssh ubuntu@ip-address` to double check that the instance loaded correctly. 

Let's begin refactoring

## Creating Terraform Modules

Modularizing Terraform means splitting our infrastructure code into reusable, logical components called modules. This improves maintainability, reusability, and clarity, especially as our infrastructure grows.

The best practices are separation of concerns, using inputs and outputs for modules. There are `Root Module` and `Child Modules`, where root module is the directory where the terraform commands are meant to run, and child modules are the ones that contain reusable code.

We will create 3 modules: `network`, `ec2` and `security_group`. 

The overall folder structure should look like follows: 

```sh
/modules
  /network
    main.tf
    variables.tf
    outputs.tf
  /ec2
    main.tf
    variables.tf
    outputs.tf
  /security_group
    main.tf
    variables.tf
    outputs.tf
main.tf
variables.tf
outputs.tf
versions.tf
terraform.tfvars
```

### Module: network

```hcl
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
}

resource "aws_subnet" "portfolio" {
  cidr_block        = var.subnet_cidr
  vpc_id            = aws_vpc.main.id
  availability_zone = var.availability_zone
}

resource "aws_internet_gateway" "portfolio" {
  vpc_id = aws_vpc.main.id
}

resource "aws_route_table" "portfolio" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.portfolio.id
  }
}

resource "aws_route_table_association" "subnet-association" {
  subnet_id      = aws_subnet.portfolio.id
  route_table_id = aws_route_table.portfolio.id
}
```

  - Variables:
```hcl
# variables.tf

variable "vpc_cidr" { type = string }
variable "subnet_cidr" { type = string }
variable "availability_zone" { type = string }
```

- Outputs:

```hcl
output "vpc_id" { value = aws_vpc.main.id }
output "subnet_id" { value = aws_subnet.portfolio.id }
```

### Module: security_group

```hcl
resource "aws_security_group" "portfolio" {
  name   = "SSH port for API"
  vpc_id = var.vpc_id

  ingress {
    cidr_blocks = ["0.0.0.0/0"]
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
  }


  ingress {
    cidr_blocks = ["0.0.0.0/0"]
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

  - Variables:
```hcl
# variables.tf

variable "vpc_id" { type = string }
```

- Outputs:

```hcl
output "security_group_id" { value = aws_security_group.portfolio.id }
```

### Module: ec2

```hcl
resource "aws_key_pair" "ssh-key" {
  key_name   = "ssh-key"
  public_key = var.ssh_public_key
}

resource "aws_instance" "portfolio" {
  ami                         = var.instance_ami
  instance_type               = var.instance_type
  availability_zone           = var.availability_zone
  security_groups             = [var.security_group_id]
  associate_public_ip_address = true
  subnet_id                   = var.subnet_id
  key_name                    = aws_key_pair.ssh-key.key_name
}

resource "aws_eip" "portfolio" {
  instance = aws_instance.portfolio.id
  domain   = "vpc"
}
```

  - Variables:
```hcl
# variables.tf

variable "instance_ami" { type = string }
variable "instance_type" { type = string }
variable "availability_zone" { type = string }
variable "security_group_id" { type = string }
variable "subnet_id" { type = string }
variable "ssh_public_key" { type = string }
```

- Outputs:

```hcl
output "instance_id" { value = aws_instance.portfolio.id }
output "public_ip"   { value = aws_eip.portfolio.public_ip }
```


### Using modules - route module

The root modules will reference the children modules and assign the variables. 

```hcl
# main.tf

module "network" {
  source            = "./modules/network"
  vpc_cidr          = "10.0.0.0/16"
  subnet_cidr       = "10.0.1.0/24"
  availability_zone = var.availability_zone
}

module "security_group" {
  source = "./modules/security_group"
  vpc_id = module.network.vpc_id
}

module "ec2" {
  source            = "./modules/ec2"
  instance_ami      = var.instance_ami
  instance_type     = var.instance_type
  availability_zone = var.availability_zone
  security_group_id = module.security_group.security_group_id
  subnet_id         = module.network.subnet_id
  ssh_public_key    = local.secrets.ssh_public_key
}
```

And the outputs:

```hcl
# outputs.tf

output "ec2_ip_address" {
  value       = module.ec2.public_ip
  description = "The Elastic IP address allocated to the EC2 instance."
}
```

## Install modules and apply

The modules have to be installed, so we need to run `terraform init` first. After that run `terraform apply --auto-approve` to see that everything works ok. You should see something like this on terminal:

```sh

Apply complete! Resources: 3 added, 0 changed, 0 destroyed.

Outputs:
ec2_ip_address = "your-ip"
```

## Adding DNS module pointing to our instance and a simple HTTP server

Now to make things interesting, we will create a simple web server and two environments - dev and prod. A common requirement for web applications. 

To accomplish that, we need to create: 

   - DNS module
   - Update EC-2 Module to launch HTTP server
   - Make dev and prod environments

### DNS Module

Similarly, we will create the `module` called `dns` with 3 files in it - main, variables, outputs. 

```hcl
# main.tf
resource "aws_route53_record" "www" {
  zone_id = var.main_zone_id
  name    = var.domain_name
  type    = "A"
  ttl     = 60
  records = [var.dns_record]
}

```

Variables:

```hcl
# variables.tf

variable "main_zone_id" { type = string }
variable "domain_name" { type = string }
variable "dns_record" { type = string }
```

```hcl
# outputs.tf
output "dns_record" {
  value       = aws_route53_record.record.fqdn
  description = "The FQDN of the www Route53 record"
}
```
We will leave `outputs.tf` black for now. 

Now in our `route53.tf`: 

```hcl
# route53.tf

resource "aws_route53_zone" "main" {
  name = "viktorvasylkovskyi.com"
}

module "aws_route53_record" {
  source       = "./modules/dns"
  domain_name  = var.domain_name
  main_zone_id = aws_route53_zone.main.zone_id
  dns_record   = module.ec2.public_ip
}
```

Note, the `domain_name` is your domain name that you should own. Declare this variable in your `variables.tf` in the root module, and define it in `terraform.tfvars`. 

### Updating our EC-2 to start HTTP server

Now, let's update our `ec2` module in `main.tf`. We are going to add a `user_data` that will instantiate a simple http server on the startup of the machine. Add the following: 

```hcl
# ec2.main.tf

resource "aws_instance" "app" {
  ... your instance previous code ...
  user_data = <<-EOF
              #!/bin/bash
              sudo yum update -y || sudo apt-get update -y
              sudo yum install -y python3 || sudo apt-get install -y python3
              echo "<html><body><h1>Hello from Terraform EC2!</h1></body></html>" > index.html
              nohup python3 -m http.server 80 &
              EOF
}
```


### Adding outputs
Add outputs at the root module:

```hcl
# outputs.tf

output "ec2_domain_name" {
  value       = module.aws_route53_record.dns_record
  description = "The Elastic IP address allocated to the EC2 instance."
}
```

### Apply changes

Run `terraform init` and `terraform apply --auto-approve` and see your server working. You should be able to open browser at `var.domain_name`.

## Adding dev and production environments

The great thing about modules is that we can reuse them. Let's reuse them in two environments: prod and dev. We need to refactor our code such that we have new folder structure: 

```sh
environments/
  dev/
    main.tf
    terraform.tfvars
    variables.tf
  prod/
    main.tf
    terraform.tfvars
    variables.tf
modules/
```

Note, since our environments will be pretty much the same, the `terraform.tfvars` are going to drive the change of the environments. 

Example of the `terraform.tfvars` in `dev`

```hcl
availability_zone = "us-east-1a"
instance_ami      = "ami-xxxx"
instance_type     = "t2.micro"
domain_name       = "dev.example.com"
```

and in `prod`

```hcl
availability_zone = "us-east-1b"
instance_ami      = "ami-yyyy"
instance_type     = "t3.medium"
domain_name       = "prod.example.com"
```

Now, you can apply. 

## Applying multiple environments

You can apply both environments using `terraform apply`. Just jump into the folder and run apply. 

## Conclusion

By modularizing our Terraform code, we make our infrastructure more organized, reusable, and easier to maintain. This approach not only saves time as our projects grow, but also helps us avoid duplication and mistakes. With modules, scaling and evolving your infrastructure becomes a much smoother process. If needed, you can find full code here - `https://github.com/vvasylkovskyi/viktorvasylkovskyi-infra`. 

Next we are going to [Provisioning Application Load Balancer and connecting it to Ec-2 instance using Terraform](https://www.viktorvasylkovskyi.com/posts/provisioning-alb-as-ssl-termination-and-ec2). Keep iterating, keep improving, and happy hacking! 