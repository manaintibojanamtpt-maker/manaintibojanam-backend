resource "google_artifact_registry_repository" "containers" {
  project       = var.project_id
  location      = var.region
  repository_id = "bhojanos-${var.environment}"
  description   = "BhojanOS ${var.environment} container images"
  format        = "DOCKER"

  labels = {
    environment = var.environment
    managed-by  = "terraform"
  }
}
