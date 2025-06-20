variable "availability_zone" {
  description = "Availability zone of resources"
  type        = string
}

variable "instance_type" {
  description = "Type of the instance"
  type        = string
}

variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1" # Default AWS region
}
