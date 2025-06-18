data "aws_caller_identity" "current" {}

data "aws_secretsmanager_secret" "app_secrets" {
  name = "portfolio/app/credentials"
}

data "aws_secretsmanager_secret_version" "current" {
  secret_id = data.aws_secretsmanager_secret.app_secrets.id
}

locals {
  secrets = jsondecode(data.aws_secretsmanager_secret_version.current.secret_string)
}