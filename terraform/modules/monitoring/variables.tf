variable "project_id" { type = string }
variable "environment" { type = string }

variable "notification_channels" {
  type    = list(string)
  default = []
}

variable "alert_policies" {
  type = map(object({
    display_name = string
    condition    = string
    threshold    = number
    duration     = string
    severity     = string
  }))
}
