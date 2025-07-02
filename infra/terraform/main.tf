
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
  source            = "git::https://github.com/vvasylkovskyi/vvasylkovskyi-infra.git//modules/ec2?ref=main"
  instance_ami      = var.instance_ami
  instance_type     = var.instance_type
  availability_zone = var.availability_zone
  security_group_id = module.security_group.security_group_ec2
  subnet_id         = module.network.public_subnet_ids[0]
  ssh_public_key    = module.secrets.secrets.ssh_public_key
  database_name     = module.secrets.secrets.database_name
  database_username = module.secrets.secrets.database_username
  database_password = module.secrets.secrets.database_password
  database_host     = module.rds.database_host
  database_port     = module.rds.database_port
  docker_image_hash = var.docker_image_hash
}

module "aws_route53_record" {
  source          = "git::https://github.com/vvasylkovskyi/vvasylkovskyi-infra.git//modules/dns?ref=main"
  domain_name     = var.domain_name
  dns_record      = module.ec2.public_ip
  aws_lb_dns_name = module.alb.aws_lb_dns_name
  aws_lb_zone_id  = module.alb.aws_lb_zone_id
}

module "ssl_acm" {
  source              = "git::https://github.com/vvasylkovskyi/vvasylkovskyi-infra.git//modules/acm?ref=main"
  domain_name         = var.domain_name
  route53_zone        = module.aws_route53_record.aws_route53_zone_name
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
}

module "rds" {
  source             = "git::https://github.com/vvasylkovskyi/vvasylkovskyi-infra.git//modules/rds?ref=main"
  security_group     = module.security_group.security_group_rds
  database_name      = module.secrets.secrets.database_name
  database_username  = module.secrets.secrets.database_username
  database_password  = module.secrets.secrets.database_password
  private_subnet_ids = module.network.private_subnet_ids
  public_subnet_ids  = module.network.public_subnet_ids
}

module "secrets" {
  source           = "git::https://github.com/vvasylkovskyi/vvasylkovskyi-infra.git//modules/secrets?ref=main"
  credentials_name = var.credentials_name
}
