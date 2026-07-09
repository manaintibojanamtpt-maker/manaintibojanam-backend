resource "google_monitoring_notification_channel" "email" {
  count = length(var.notification_channels) > 0 ? 0 : 1

  project      = var.project_id
  display_name = "BhojanOS ${var.environment} Ops Email"
  type         = "email"

  labels = {
    email_address = "staging-ops@bhojanos.com"
  }
}

resource "google_monitoring_alert_policy" "policies" {
  for_each = var.alert_policies

  project      = var.project_id
  display_name = "bhojanos-${var.environment}-${each.key}"
  combiner     = "OR"
  enabled      = true

  conditions {
    display_name = each.value.display_name

    condition_threshold {
      filter          = each.value.condition
      duration        = each.value.duration
      comparison      = "COMPARISON_GT"
      threshold_value = each.value.threshold

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }

  notification_channels = var.notification_channels

  alert_strategy {
    auto_close = "604800s"
  }

  user_labels = {
    environment = var.environment
    severity    = each.value.severity
  }
}

# Log sink for spine workers
resource "google_logging_project_sink" "spine_workers" {
  name        = "bhojanos-${var.environment}-spine-workers"
  project     = var.project_id
  destination = "storage.googleapis.com/bhojanos-${var.environment}-logs"

  filter = <<-EOT
    resource.type="k8s_container"
    resource.labels.namespace_name="bhojanos-${var.environment}-spine"
  EOT

  unique_writer_identity = true
}
