// Nebula DNS - Infrastructure Provisioning
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

resource "digitalocean_kubernetes_cluster" "main" {
  name         = "${var.project_name}-${var.environment}"
  region       = var.region
  version      = var.kubernetes_version
  vpc_uuid     = var.vpc_uuid
  auto_upgrade = var.auto_upgrade
  surge_upgrade = true
  ha           = var.ha_control_plane

  node_pool {
    name       = "${var.project_name}-${var.environment}-workers"
    size       = var.node_size
    node_count = var.node_count
    auto_scale = var.auto_scale
    min_nodes  = var.min_nodes
    max_nodes  = var.max_nodes
    labels = {
      environment = var.environment
      workload    = "general"
    }
  }

  maintenance_policy {
    day        = "sunday"
    start_time = "04:00"
  }
}
