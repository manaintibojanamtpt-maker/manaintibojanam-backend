output "network_id" {
  value = google_compute_network.main.id
}

output "network_name" {
  value = google_compute_network.main.name
}

output "gke_subnetwork_name" {
  value = google_compute_subnetwork.gke.name
}

output "gke_pods_range_name" {
  value = "pods"
}

output "gke_services_range_name" {
  value = "services"
}

output "app_subnet_id" {
  value = google_compute_subnetwork.app.id
}

output "worker_subnet_id" {
  value = google_compute_subnetwork.workers.id
}
