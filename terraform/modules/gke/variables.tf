variable "project_id" { type = string }
variable "environment" { type = string }
variable "region" { type = string }
variable "network_name" { type = string }
variable "subnetwork_name" { type = string }
variable "pods_range_name" { type = string }
variable "services_range_name" { type = string }

variable "node_count" {
  type    = number
  default = 3
}

variable "machine_type" {
  type    = string
  default = "e2-standard-4"
}
