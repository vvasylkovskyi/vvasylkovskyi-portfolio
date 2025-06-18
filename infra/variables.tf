variable "availability_zone" {
  description = "Availability zone of resources"
  type        = string
}

variable "instance_ami" {
  description = "ID of the AMI used"
  type        = string
}

variable "instance_type" {
  description = "Type of the instance"
  type        = string
}

variable "ssh_public_key" {
  description = "Public SSH key for logging into EC2 instance"
  type        = string
}

variable "datadog_api_key" {
  description = "An API key to interact with Datadog"
  type        = string
}

variable "datadog_app_key" {
  description = "An App key to interact with Datadog"
  type        = string
}

variable "datadog_api_url" {
  description = "Datadog API URL"
  type        = string
}

variable "pagerduty_token" {
  type        = string
  description = "PagerDuty API token"
}

variable "pagerduty_service_region" {
  type        = string
  description = "PagerDuty service region"
  default     = "eu" # Default US region. Supported value: us. 
}

variable "pagerduty_subdomain" {
  type        = string
  description = "PagerDuty subdomain"
}

variable "pagerduty_datadog_integration_key" {
  type        = string
  description = "PagerDuty service integration key with datadog"
}

variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1" # Default AWS region
}
