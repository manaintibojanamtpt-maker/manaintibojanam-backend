# Redis Memorystore — OPTIONAL for staging v1 soak.
# Blueprint: not required for initial 72h soak; enable only if lag tests require checkpoint cache.

resource "google_redis_instance" "cache" {
  count = var.enable_redis ? 1 : 0

  name           = "bhojanos-${var.environment}-redis"
  project        = var.project_id
  region         = var.region
  tier           = "STANDARD_HA"
  memory_size_gb = 1
  redis_version  = "REDIS_7_0"

  authorized_network = var.network_id

  labels = {
    environment = var.environment
    managed-by  = "terraform"
  }
}
