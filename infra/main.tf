provider "aws" {
  region                   = var.aws_region
  shared_credentials_files = ["~/.aws/credentials"]
  profile                  = "vvasylkovskyi"
}

provider "pagerduty" {
  token          = local.secrets.pagerduty_token
  service_region = local.secrets.pagerduty_service_region
}

provider "datadog" {
  api_key = local.secrets.datadog_api_key
  app_key = local.secrets.datadog_app_key
  api_url = local.secrets.datadog_api_url
}
