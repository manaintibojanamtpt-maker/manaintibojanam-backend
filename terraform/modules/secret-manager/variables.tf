variable "project_id" { type = string }
variable "environment" { type = string }

variable "secrets" {
  type = map(object({
    labels = optional(map(string), {})
  }))
  description = "Secret IDs to create (values populated manually or via CI)"
}
