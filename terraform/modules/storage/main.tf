resource "google_storage_bucket" "buckets" {
  for_each = var.buckets

  name          = "bhojanos-${var.environment}-${each.key}"
  project       = var.project_id
  location      = var.region
  storage_class = each.value.storage_class
  force_destroy = var.environment != "production"

  uniform_bucket_level_access = true

  versioning {
    enabled = each.value.versioning
  }

  lifecycle_rule {
    condition {
      age = each.value.lifecycle_days
    }
    action {
      type = "Delete"
    }
  }

  labels = {
    environment = var.environment
    managed-by  = "terraform"
  }
}
