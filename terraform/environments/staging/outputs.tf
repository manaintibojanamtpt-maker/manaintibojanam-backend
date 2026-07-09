output "gke_cluster_name" {
  value = module.gke.cluster_name
}

output "artifact_registry_url" {
  value = module.artifact_registry.repository_url
}

output "service_account_emails" {
  value = module.iam.service_account_emails
}

output "evidence_bucket" {
  value = "bhojanos-staging-evidence"
}

output "namespace" {
  value = "bhojanos-staging-spine"
}
