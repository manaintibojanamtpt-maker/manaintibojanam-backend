variable "project_id" { type = string }
variable "environment" { type = string }

variable "enable_redis" {
  type        = bool
  description = "Redis optional for v1 soak — disabled by default per blueprint"
  default     = false
}

variable "region" { type = string }
variable "network_id" { type = string }
