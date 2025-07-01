# Provisioning PostgresSQL RDBMS on AWS with Terraform

In our previous notes we discussed about how to launch a simple HTTPS web server running docker container. You can read about it here: [Provisioning Application Load Balancer and connecting it to ECS using Terraform](https://www.vvasylkovskyi.com/posts/provisioning-alb-and-connecting-to-ecs). Although it is not scaled to multiple instances or clusters, it represents a minimal working production environment. 

We have also advanced into making our servers stateless, by removing the data from them and using the database, about which we can find information here: [End-to-End Local PostgreSQL Workflow for Full-Stack Development](https://www.vvasylkovskyi.com/posts/postgres-sql-local-database). This works great locally, however the database is baked into docker image and sits on the EC-2 node, so our server is still stateful. For the production environment we need to provision a database on AWS. So this note will talk about that. 

## Github Code

Full code available on `https://github.com/vvasylkovskyi/vvasylkovskyi-infra/tree/vv-https-server-ec2-and-load-balancer-v2`. You can clone that and apply the infra yourself, all you need to do is to modify the variables for your domain.

## Overview 

To provision RDS and use it on our server we need to define a couple of things: 

  - AWS DB security groups
  - Private subnets where the database can stay. 
  - Add new secrets for the secure database access
  - Add database itself - RDS resource
  - Provide those secrets to the EC-2 instance so that the app can connect

### AWS DB Security Groups

We will define very basic security group for the database - the one that accepts connections on port `5432`, an official postgresSQL database port. 

```hcl
resource "aws_security_group" "rds" {
  vpc_id = var.vpc_id

  ingress {
    cidr_blocks = ["0.0.0.0/0"]
    from_port   = 5432
    to_port     = 5432
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

### Update Network to include both private and public subnets

It is best practice to run database in a private subnet, accessible only by our internal servers. So this is a great oportunity for us to create private subnets and organize our VPC a bit better. 

Here is the updated `network/main.tf`

```hcl
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
}

resource "aws_internet_gateway" "portfolio" {
  vpc_id = aws_vpc.main.id
}

data "aws_availability_zones" "available" {}

# Create 2 public subnets
resource "aws_subnet" "public" {
  count                   = 2
  cidr_block              = cidrsubnet(aws_vpc.main.cidr_block, 4, count.index)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  vpc_id                  = aws_vpc.main.id
  map_public_ip_on_launch = true
}

# Create 2 private subnets
resource "aws_subnet" "private" {
  count                   = 2
  cidr_block              = cidrsubnet(aws_vpc.main.cidr_block, 4, 2 + count.index)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  vpc_id                  = aws_vpc.main.id
  map_public_ip_on_launch = false
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.portfolio.id
  }
}

resource "aws_route_table_association" "public" {
  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Private route table (no IGW route)
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id
}

resource "aws_route_table_association" "private" {
  count          = 2
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

resource "aws_main_route_table_association" "public_main" {
  vpc_id         = aws_vpc.main.id
  route_table_id = aws_route_table.public.id
}
```

Note this is a very similar setup to having only 2 public subnets, we just added more subnets. These private subnets will then be passed to the `RDS` module.

### Add new secrets for the secure database access

One of my previous notes explains very well how to add new secrets using AWS Secrets Manager. You can read about it: [Provision AWS Secret Manager and Store Secrets Securely](https://www.vvasylkovskyi.com/posts/provisioning-aws-secret-manager-and-securing-secrets). 

We need to add three new secrets: 

```sh
database_name=
database_username=
database_password=
```

## Adding RDS Resource

Now we are finally ready to add a new database. Additionally, we need to specify the AWS DB Subnet group - which is a group containing our private subnets: 

```hcl
resource "aws_db_subnet_group" "default" {
  name       = "rds-private-subnet-group"
  subnet_ids = [for id in var.private_subnet_ids : id]

  tags = {
    Name = "RDS Private Subnet Group"
  }
}

resource "aws_db_instance" "postgres" {
  identifier         = "postgres-db"
  engine             = "postgres"
  engine_version     = "15"
  instance_class     = "db.t3.micro"
  allocated_storage  = 20
  storage_type       = "gp2"
  username           = var.database_username
  password           = var.database_password
  db_name            = var.database_name
  vpc_security_group_ids = [var.security_group]
  db_subnet_group_name = aws_db_subnet_group.default.name
  skip_final_snapshot    = true # for dev; not recommended in prod
}
```

Note the `allocated_storage` means 20GB allocated for this database, and we are using PostgresSQL database here. 

The `skip_final_snapshot` is a parameter used in AWS RDS (Relational Database Service) operations, such as when deleting a database instance with Terraform or the AWS CLI. If `skip_final_snapshot = true`, AWS will not create a final backup (snapshot) of your RDS instance before deleting it. We will keep it as is for our testing purpose, but it is recommended to set it to false for production use.


## Provide those secrets to the EC-2 instance so that the app can connect

Finally, we will update our EC-2 `user_data` so that it can start with the right environment variables that our app will use to connect to the database. The environment variables were defined here: [End-to-End Local PostgreSQL Workflow for Full-Stack Development](https://www.vvasylkovskyi.com/posts/postgres-sql-local-database). 

These are the variables that we need: 

```sh
DB_USER=
DB_PASSWORD=
DB_DATABASE_NAME=
DB_HOST=
DB_PORT=
```

So let's update our Ec-2: 

```hcl
resource "aws_instance" "portfolio" {
  ami                         = var.instance_ami
  instance_type               = var.instance_type
  availability_zone           = var.availability_zone
  security_groups             = [var.security_group_id]
  associate_public_ip_address = true
  subnet_id                   = var.subnet_id
  key_name                    = aws_key_pair.ssh-key.key_name
  user_data = <<-EOF
            #!/bin/bash
            sudo yum update -y || sudo apt-get update -y
            sudo yum install -y docker || sudo apt-get install -y docker.io
            sudo systemctl start docker
            sudo systemctl enable docker
            sudo docker run -d -p 80:80 \
              -e DB_USER=${var.database_username} \
              -e DB_PASSWORD=${var.database_password} \
              -e DB_DATABASE_NAME=${var.database_name} \
              -e DB_HOST=${var.database_host} \
              -e DB_PORT=${var.database_port} \
              vvasylkovskyi1/vvasylkovskyi-portfolio:latest
            EOF
}

```

Adding environment variables in the `user_data` is simple - using same linux commands for docker as usual. Note that database `database_username`, `database_password` and `database_name` should come from your `secrets` via variables into modules. The `database_host` and `database_port` are the outputs of the `RDS` module. 


## Add Outputs

We will add outputs to know what is the database host: 

```hcl
output "database_host" {
  description = "The hostname of the RDS instance"
  value       = aws_db_instance.postgres.address
}

output "database_port" {
  description = "The port of the RDS instance"
  value       = aws_db_instance.postgres.port
}
```

## Test infra

Run `terraform init` and `terraform apply --auto-approve` to see the changes reflected. Navigate to your AWS console to find your database. For me it was here - https://us-east-1.console.aws.amazon.com/rds/home?region=us-east-1. 

## Applying Schema and Seeding Database

For now our database is empty and doesn't have the tables that we need. For simplicity in this notes, we will temporarily expose our database into the public network, log into using ssh and apply our seeding. Note, this is not recommended for production environment. 

### Change to database to public

We need to change our database to use public network like follows: 

```hcl
resource "aws_db_instance" "postgres" {
  ...
  db_subnet_group_name = aws_db_subnet_group.public.name
  publicly_accessible = true
}
```

Now, we can connect using `psql` like follows: 

```sh
psql \
  --host=<database-url>.rds.amazonaws.com \
  --port=<database-port> \
  --username=<username> \     
  --dbname=<db-name>
```

And from there we can run the scripts. We can do it like follows from github actions (note you need to define the right secrets): 

```yml
name: Migrate & Seed DB

on:
  workflow_dispatch:

jobs:
  migrate-seed:
    runs-on: ubuntu-latest

    env:
      PGHOST: ${{ secrets.PGHOST }}
      PGUSER: ${{ secrets.PGUSER }}
      PGPASSWORD: ${{ secrets.PGPASSWORD }}
      PGDATABASE: ${{ secrets.PGDATABASE }}
      PGPORT: ${{ secrets.PGPORT }}

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Install PostgreSQL client
        run: sudo apt-get update && sudo apt-get install -y postgresql-client

      - name: Run schema.sql
        run: psql -f path/to/schema.sql

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18' # or whatever you use

      - name: Install dependencies
        run: npm ci

      - name: Run seed script
        run: npm run seed # or whatever command runs your TypeScript script

      # Optional: If your seed script is raw .ts
      - name: Run TypeScript seed directly
        run: npx tsx path/to/seed.ts
```

## Conclusion

We have successfully provisioned PostgreSQL database using terraform! There is a catch though, this database is empty and needs to have some tables and seed data, similarly to what we did for the local database here: [End-to-End Local PostgreSQL Workflow for Full-Stack Development](https://www.vvasylkovskyi.com/posts/postgres-sql-local-database).