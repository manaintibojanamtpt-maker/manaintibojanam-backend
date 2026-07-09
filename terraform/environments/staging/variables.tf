variable "project_id" {
  type        = string
  description = "GCP project ID for staging"
  default     = "bhojanos-staging"
}

variable "region" {
  type    = string
  default = "asia-south1"
}
