variable "project_id" { type = string }
variable "environment" { type = string }

variable "service_accounts" {
  type = map(object({
    display_name = string
    roles        = list(string)
  }))
  description = "Map of service account short name to config"
}
