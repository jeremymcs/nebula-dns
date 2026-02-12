// Nebula DNS - Valkey Managed Database Resources
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

resource "digitalocean_database_cluster" "valkey" {
  name                 = "${var.project_name}-${var.environment}-valkey"
  engine               = "valkey"
  version              = "7"
  size                 = var.valkey_node_size
  region               = var.region
  node_count           = var.valkey_node_count
  private_network_uuid = var.vpc_uuid
}

resource "digitalocean_database_firewall" "valkey" {
  cluster_id = digitalocean_database_cluster.valkey.id
  rule {
    type  = "k8s"
    value = var.doks_cluster_id
  }
}
