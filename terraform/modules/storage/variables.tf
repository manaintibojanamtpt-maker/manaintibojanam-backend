variable "project_id" { type = string }
variable "environment" { type = string }
variable "region" { type = string }

variable "buckets" {
  type = map(object({
    storage_class = optional(string, "STANDARD")
    versioning    = optional(bool, true)
    lifecycle_days = optional(number, 90)
  }))
}
