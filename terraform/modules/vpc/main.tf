resource "google_compute_network" "main" {
  name                    = "bhojanos-${var.environment}-vpc"
  project                 = var.project_id
  auto_create_subnetworks = false
  routing_mode            = "REGIONAL"
}

resource "google_compute_subnetwork" "app" {
  name          = "bhojanos-${var.environment}-app"
  project       = var.project_id
  region        = var.region
  network       = google_compute_network.main.id
  ip_cidr_range = var.app_subnet_cidr

  private_ip_google_access = true
}

resource "google_compute_subnetwork" "workers" {
  name          = "bhojanos-${var.environment}-workers"
  project       = var.project_id
  region        = var.region
  network       = google_compute_network.main.id
  ip_cidr_range = var.worker_subnet_cidr

  private_ip_google_access = true
}

resource "google_compute_subnetwork" "observability" {
  name          = "bhojanos-${var.environment}-obs"
  project       = var.project_id
  region        = var.region
  network       = google_compute_network.main.id
  ip_cidr_range = var.observability_subnet_cidr

  private_ip_google_access = true
}

# GKE secondary ranges
resource "google_compute_subnetwork" "gke" {
  name          = "bhojanos-${var.environment}-gke"
  project       = var.project_id
  region        = var.region
  network       = google_compute_network.main.id
  ip_cidr_range = "10.10.4.0/24"

  private_ip_google_access = true

  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = var.gke_pods_cidr
  }

  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = var.gke_services_cidr
  }
}

resource "google_compute_router" "main" {
  name    = "bhojanos-${var.environment}-router"
  project = var.project_id
  region  = var.region
  network = google_compute_network.main.id
}

resource "google_compute_router_nat" "main" {
  name                               = "bhojanos-${var.environment}-nat"
  project                            = var.project_id
  router                             = google_compute_router.main.name
  region                             = var.region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"

  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}

# Private Service Access for Firestore / managed services
resource "google_compute_global_address" "private_service_range" {
  name          = "bhojanos-${var.environment}-psa"
  project       = var.project_id
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.main.id
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.main.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_service_range.name]
}

# Firewall — deny all ingress by default; allow internal + health checks
resource "google_compute_firewall" "deny_all_ingress" {
  name    = "bhojanos-${var.environment}-deny-all-ingress"
  project = var.project_id
  network = google_compute_network.main.name

  direction = "INGRESS"
  priority  = 65534

  deny {
    protocol = "all"
  }

  source_ranges = ["0.0.0.0/0"]
}

resource "google_compute_firewall" "allow_internal" {
  name    = "bhojanos-${var.environment}-allow-internal"
  project = var.project_id
  network = google_compute_network.main.name

  direction = "INGRESS"
  priority  = 1000

  allow {
    protocol = "tcp"
  }

  allow {
    protocol = "udp"
  }

  allow {
    protocol = "icmp"
  }

  source_ranges = [var.vpc_cidr, var.gke_pods_cidr, var.gke_services_cidr]
}

resource "google_compute_firewall" "allow_health_checks" {
  name    = "bhojanos-${var.environment}-allow-health-checks"
  project = var.project_id
  network = google_compute_network.main.name

  direction = "INGRESS"
  priority  = 1001

  allow {
    protocol = "tcp"
    ports    = ["80", "443", "8080", "9090", "3000"]
  }

  source_ranges = ["35.191.0.0/16", "130.211.0.0/22"]
  target_tags   = ["bhojanos-${var.environment}-lb"]
}
