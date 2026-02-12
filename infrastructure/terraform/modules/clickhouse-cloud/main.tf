# Nebula DNS - ClickHouse Cloud Terraform Module
# Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

terraform {
  required_providers {
    clickhouse = {
      source  = "ClickHouse/clickhouse"
      version = "~> 0.2"
    }
  }
}

resource "clickhouse_service" "analytics" {
  name           = var.service_name
  cloud_provider = var.cloud_provider
  region         = var.region
  tier           = var.tier

  ip_access = [
    {
      source      = "0.0.0.0/0"
      description = "Allow all (restrict after DOKS egress IP is known)"
    }
  ]

  min_total_memory_gb  = var.min_total_memory_gb
  max_total_memory_gb  = var.max_total_memory_gb
  idle_scaling         = var.idle_scaling
  idle_timeout_minutes = var.idle_timeout_minutes
}
