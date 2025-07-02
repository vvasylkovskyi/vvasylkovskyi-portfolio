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

variable "domain_name" {
  description = "domain name"
  type        = string
}

variable "docker_image_hash" {
  description = "Docker Image Hash"
  type        = string
}

variable "credentials_name" {
  description = "path for the secrets"
  type        = string
}
