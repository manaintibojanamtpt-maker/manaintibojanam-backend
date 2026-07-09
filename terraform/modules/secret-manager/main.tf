resource "google_secret_manager_secret" "secrets" {
  for_each = var.secrets

  project   = var.project_id
  secret_id = "${var.environment}-${each.key}"

  replication {
    auto {}
  }

  labels = merge(
    {
      environment = var.environment
      managed-by  = "terraform"
    },
    each.value.labels
  )
}

# Placeholder versions — real values injected via CI / ops (never in git)
resource "google_secret_manager_secret_version" "placeholder" {
  for_each = var.secrets

  secret      = google_secret_manager_secret.secrets[each.key].id
  secret_data = "REPLACE_VIA_CI_OR_OPS"

  lifecycle {
    ignore_changes = [secret_data]
  }
}
