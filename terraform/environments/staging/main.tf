terraform {
  backend "gcs" {
    bucket = "bhojanos-terraform-state"
    prefix = "staging"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

locals {
  environment = "staging"
}

module "vpc" {
  source = "../../modules/vpc"

  project_id  = var.project_id
  region      = var.region
  environment = local.environment
}

module "iam" {
  source = "../../modules/iam"

  project_id  = var.project_id
  environment = local.environment

  service_accounts = {
    "api-sa" = {
      display_name = "Staging API service account"
      roles = [
        "roles/datastore.user",
        "roles/secretmanager.secretAccessor",
      ]
    }
    "outbox-sa" = {
      display_name = "Event outbox publisher"
      roles = [
        "roles/datastore.user",
        "roles/secretmanager.secretAccessor",
      ]
    }
    "order-projection-sa" = {
      display_name = "Order projection worker"
      roles = [
        "roles/datastore.user",
        "roles/secretmanager.secretAccessor",
      ]
    }
    "menu-projection-sa" = {
      display_name = "Menu projection worker"
      roles = [
        "roles/datastore.user",
        "roles/secretmanager.secretAccessor",
      ]
    }
    "replay-sa" = {
      display_name = "Replay service"
      roles = [
        "roles/datastore.user",
        "roles/secretmanager.secretAccessor",
      ]
    }
    "ops-ci" = {
      display_name = "CI/CD deployment"
      roles = [
        "roles/container.developer",
        "roles/artifactregistry.writer",
        "roles/secretmanager.secretAccessor",
      ]
    }
    "prod-flag-guard-sa" = {
      display_name = "Production flag guard (read-only prod flags)"
      roles = [
        "roles/secretmanager.secretAccessor",
      ]
    }
  }
}

module "secrets" {
  source = "../../modules/secret-manager"

  project_id  = var.project_id
  environment = local.environment

  secrets = {
    "firebase-sa-json"           = { labels = { component = "firestore" } }
    "launchdarkly-sdk-key"       = { labels = { component = "flags" } }
    "launchdarkly-api-token"     = { labels = { component = "flags" } }
    "otel-exporter-otlp-headers" = { labels = { component = "observability" } }
    "grafana-api-key"            = { labels = { component = "observability" } }
    "replay-admin-token"         = { labels = { component = "replay" } }
    "pagerduty-staging-key"      = { labels = { component = "alerting" } }
  }
}

module "storage" {
  source = "../../modules/storage"

  project_id  = var.project_id
  environment = local.environment
  region      = var.region

  buckets = {
    "evidence" = { lifecycle_days = 90 }
    "backups"  = { lifecycle_days = 365 }
    "logs"     = { lifecycle_days = 30 }
    "checkpoints" = { lifecycle_days = 90 }
    "snapshots"   = { lifecycle_days = 90 }
    "replay-corpus" = { lifecycle_days = 180 }
  }
}

module "artifact_registry" {
  source = "../../modules/artifact-registry"

  project_id  = var.project_id
  environment = local.environment
  region      = var.region
}

module "firestore" {
  source = "../../modules/firestore"

  project_id  = var.project_id
  environment = local.environment
}

module "gke" {
  source = "../../modules/gke"

  project_id          = var.project_id
  environment         = local.environment
  region              = var.region
  network_name        = module.vpc.network_name
  subnetwork_name     = module.vpc.gke_subnetwork_name
  pods_range_name     = module.vpc.gke_pods_range_name
  services_range_name = module.vpc.gke_services_range_name
  node_count          = 3
  machine_type        = "e2-standard-4"

  depends_on = [module.vpc]
}

# Redis disabled for v1 soak — see blueprint §3
module "redis" {
  source = "../../modules/redis"

  project_id   = var.project_id
  environment  = local.environment
  region       = var.region
  network_id   = module.vpc.network_id
  enable_redis = false
}

module "monitoring" {
  source = "../../modules/monitoring"

  project_id  = var.project_id
  environment = local.environment

  alert_policies = {
    "outbox-depth-high" = {
      display_name = "Outbox depth > 1000 for 5m"
      condition    = "metric.type=\"custom.googleapis.com/outbox_depth\" resource.type=\"k8s_container\""
      threshold    = 1000
      duration     = "300s"
      severity     = "critical"
    }
    "projection-lag-high" = {
      display_name = "Projection lag > 30s"
      condition    = "metric.type=\"custom.googleapis.com/projection_lag_ms\""
      threshold    = 30000
      duration     = "300s"
      severity     = "warning"
    }
    "parity-below-97" = {
      display_name = "Parity below 97%"
      condition    = "metric.type=\"custom.googleapis.com/order_parity_match_rate\""
      threshold    = 0.97
      duration     = "600s"
      severity     = "critical"
    }
    "prod-spine-flag-on" = {
      display_name = "Production spine flag enabled"
      condition    = "metric.type=\"custom.googleapis.com/prod_spine_flags_enabled_count\""
      threshold    = 0
      duration     = "60s"
      severity     = "critical"
    }
  }
}
