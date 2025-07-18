availability_zone = "us-east-1a"
instance_ami      = "ami-09e67e426f25ce0d7"
instance_type     = "t2.micro"
domain_name       = "www.viktorvasylkovskyi.com"
route53_zone_id   = "viktorvasylkovskyi.com"
credentials_name  = "portfolio/app/credentials"
docker_image_hash_portfolio_fe = "23d70910f8d22152db0a0430a5e42ba9fb88fb13"
docker_image_hash_video_service = ""
lock_table        = "terraform_state"
aws_region        = "us-east-1"
backend_bucket    = "vvasylkovskyi-portfolio-terraform-state-backend-v2"
alb_name          = "portfolio"
video_service_url = "http://video-service:4000"