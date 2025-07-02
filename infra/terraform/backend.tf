resource "aws_s3_bucket" "terraform_state" {
  bucket = var.backend_bucket
}

resource "aws_dynamodb_table" "terraform_lock" {
  name         = var.lock_table
  hash_key     = "LockID"
  billing_mode = "PAY_PER_REQUEST"

  attribute {
    name = "LockID"
    type = "S"
  }
}

terraform {
  backend "s3" {
    bucket         = "vvasylkovskyi-portfolio-terraform-state-backend-v2"
    key            = "terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform_state"
  }
}
