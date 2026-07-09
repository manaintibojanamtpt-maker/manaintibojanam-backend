resource "google_service_account" "accounts" {
  for_each = var.service_accounts

  project      = var.project_id
  account_id   = "${var.environment}-${each.key}"
  display_name = each.value.display_name
}

resource "google_project_iam_member" "sa_roles" {
  for_each = {
    for pair in flatten([
      for sa_name, sa in var.service_accounts : [
        for role in sa.roles : {
          key  = "${sa_name}-${replace(role, "/", "-")}"
          sa   = sa_name
          role = role
        }
      ]
    ]) : pair.key => pair
  }

  project = var.project_id
  role    = each.value.role
  member  = "serviceAccount:${google_service_account.accounts[each.value.sa].email}"
}

# Workload Identity bindings — populated by GKE module
resource "google_service_account_iam_member" "workload_identity" {
  for_each = var.service_accounts

  service_account_id = google_service_account.accounts[each.key].name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[bhojanos-${var.environment}-spine/${var.environment}-${each.key}]"
}
