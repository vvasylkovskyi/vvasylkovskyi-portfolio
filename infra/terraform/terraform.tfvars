availability_zone = "us-east-1a"
instance_ami      = "ami-09e67e426f25ce0d7"
instance_type     = "t2.micro"
domain_name       = "www.viktorvasylkovskyi.com"
route53_zone_id   = "viktorvasylkovskyi.com"
credentials_name  = "portfolio/app/credentials"
docker_image_hash_portfolio_fe = "2e25d9e570774e9c88858b4ca508026c406f5001"
docker_image_hash_video_service = ""
lock_table        = "terraform_state"
aws_region        = "us-east-1"
backend_bucket    = "vvasylkovskyi-portfolio-terraform-state-backend-v2"
alb_name          = "portfolio"
video_service_url = "http://video-service:4000"