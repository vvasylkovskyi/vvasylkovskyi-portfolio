provider "aws" {
  region                   = var.aws_region
  shared_credentials_files = ["~/.aws/credentials"]
  profile                  = "vvasylkovskyi"
}

provider "pagerduty" {
  token          = var.pagerduty_token
  service_region = var.pagerduty_service_region
}

provider "datadog" {
  api_key = var.datadog_api_key
  app_key = var.datadog_app_key
  api_url = var.datadog_api_url
}
