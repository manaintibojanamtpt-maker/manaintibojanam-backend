variable "project_id" {
  type        = string
  description = "GCP project ID"
}

variable "region" {
  type        = string
  description = "Primary region"
}

variable "environment" {
  type        = string
  description = "Environment name (staging, production, etc.)"
}

variable "vpc_cidr" {
  type        = string
  description = "Primary VPC CIDR"
  default     = "10.10.0.0/16"
}

variable "app_subnet_cidr" {
  type    = string
  default = "10.10.1.0/24"
}

variable "worker_subnet_cidr" {
  type    = string
  default = "10.10.2.0/24"
}

variable "observability_subnet_cidr" {
  type    = string
  default = "10.10.3.0/24"
}

variable "gke_pods_cidr" {
  type    = string
  default = "10.20.0.0/16"
}

variable "gke_services_cidr" {
  type    = string
  default = "10.21.0.0/20"
}
