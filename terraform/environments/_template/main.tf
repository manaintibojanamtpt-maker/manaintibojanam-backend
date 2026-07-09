# Environment template — copy and customize for non-staging environments.
# Staging is fully implemented in ../staging/

terraform {
  backend "gcs" {
    bucket = "bhojanos-terraform-state"
    prefix = "ENVIRONMENT_NAME"
  }
}

# Replace ENVIRONMENT_NAME with: development, qa, integration, production, dr, sandbox
# Set enabled = false to skip resource creation until environment is needed.

variable "enabled" {
  type    = bool
  default = false
}

variable "project_id" {
  type = string
}

variable "region" {
  type    = string
  default = "asia-south1"
}

# When enabled, mirror staging module calls from ../staging/main.tf
# with environment-specific sizing and IAM restrictions.
