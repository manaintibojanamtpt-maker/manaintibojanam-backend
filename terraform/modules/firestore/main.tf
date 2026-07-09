resource "google_firestore_database" "default" {
  project     = var.project_id
  name        = "(default)"
  location_id = "asia-south1"
  type        = "FIRESTORE_NATIVE"

  point_in_time_recovery_enablement = var.environment == "production" ? "POINT_IN_TIME_RECOVERY_ENABLED" : "POINT_IN_TIME_RECOVERY_ENABLED"

  deletion_policy = var.environment == "production" ? "ABANDON" : "DELETE"
}

# Scheduled Firestore export — staging soak backups
resource "google_project_iam_member" "firestore_export" {
  project = var.project_id
  role    = "roles/datastore.importExportAdmin"
  member  = "serviceAccount:firebase-adminsdk-fbsvc@${var.project_id}.iam.gserviceaccount.com"
}
