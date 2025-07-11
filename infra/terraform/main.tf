
module "network" {
  source            = "git::https://github.com/vvasylkovskyi/vvasylkovskyi-infra.git//modules/network?ref=main"
  vpc_cidr          = "10.0.0.0/16"
  subnet_cidr       = "10.0.1.0/24"
  availability_zone = var.availability_zone
}

module "security_group" {
  source = "git::https://github.com/vvasylkovskyi/vvasylkovskyi-infra.git//modules/security_group?ref=main"
  vpc_id = module.network.vpc_id
}

module "ec2" {
  source              = "git::https://github.com/vvasylkovskyi/vvasylkovskyi-infra.git//modules/ec2?ref=main"
  instance_ami        = var.instance_ami
  instance_type       = var.instance_type
  availability_zone   = var.availability_zone
  security_group_id   = module.security_group.security_group_ec2
  subnet_id           = module.network.public_subnet_ids[0]
  ssh_public_key      = module.secrets.secrets.ssh_public_key
  ssh_public_key_name = "ec2-instance-key"

  depends_on = []

  user_data = <<-EOF
            #!/bin/bash
            sudo apt-get update -y
            sudo apt-get install -y docker.io
            sudo systemctl start docker
            sudo systemctl enable docker

            # Add user to docker group
            sudo usermod -aG docker $USERNAME

            sudo docker run -d -p 80:80 \
              -e DB_USER=${module.secrets.secrets.mysql_database_username} \
              -e DB_PASSWORD=${module.secrets.secrets.mysql_database_password} \
              -e DB_DATABASE_NAME=${module.secrets.secrets.mysql_database_name} \
              -e DB_HOST=${module.rds.database_host} \
              -e DB_PORT=${module.rds.database_port} \
              -e VIDEO_SERVICE_URL=${var.video_service_url} \
              vvasylkovskyi1/vvasylkovskyi-portfolio:${var.docker_image_hash}

            sudo docker run -d -p 4000:4000 \
              -e DB_USER=${module.secrets.secrets.mysql_database_username} \
              -e DB_PASSWORD=${module.secrets.secrets.mysql_database_password} \
              -e DB_DATABASE_NAME=${module.secrets.secrets.mysql_database_name} \
              -e DB_HOST=${module.rds.database_host} \
              -e DB_PORT=${module.rds.database_port} \
              vvasylkovskyi1/vvasylkovskyi-video-service-elixir:latest
            EOF
}

module "aws_route53_record" {
  source          = "git::https://github.com/vvasylkovskyi/vvasylkovskyi-infra.git//modules/dns?ref=main"
  domain_name     = var.domain_name
  route53_zone_id = var.route53_zone_id
  dns_record      = module.ec2.public_ip
  aws_lb_dns_name = module.alb.aws_lb_dns_name
  aws_lb_zone_id  = module.alb.aws_lb_zone_id
}

module "ssl_acm" {
  source              = "git::https://github.com/vvasylkovskyi/vvasylkovskyi-infra.git//modules/acm?ref=main"
  domain_name         = var.domain_name
  aws_route53_zone_id = module.aws_route53_record.aws_route53_zone_id
}

module "alb" {
  source                   = "git::https://github.com/vvasylkovskyi/vvasylkovskyi-infra.git//modules/alb?ref=main"
  acm_certificate_arn      = module.ssl_acm.aws_acm_certificate_arn
  aws_acm_certificate_cert = module.ssl_acm.aws_acm_certificate_cert
  subnets                  = module.network.public_subnet_ids
  vpc_id                   = module.network.vpc_id
  security_group           = module.security_group.security_group_alb
  ec2_instance_id          = module.ec2.instance_id
  alb_name                 = var.alb_name
}

module "rds" {
  source             = "git::https://github.com/vvasylkovskyi/vvasylkovskyi-infra.git//modules/rds?ref=main"
  security_group     = module.security_group.security_group_rds
  database_name      = module.secrets.secrets.mysql_database_name
  database_username  = module.secrets.secrets.mysql_database_username
  database_password  = module.secrets.secrets.mysql_database_password
  private_subnet_ids = module.network.private_subnet_ids
  public_subnet_ids  = module.network.public_subnet_ids
  database_identifier = "mysql-db"
  database_engine    = "mysql"
  database_engine_version = "8.0"
  db_private_subnet_group_name = "mysql_rds-private-subnet-group"
  db_public_subnet_group_name = "mysql_rds-public-subnet-group"
}


module "secrets" {
  source           = "git::https://github.com/vvasylkovskyi/vvasylkovskyi-infra.git//modules/secrets?ref=main"
  credentials_name = var.credentials_name
}
