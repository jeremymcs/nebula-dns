// Nebula DNS - PostgreSQL Managed Database Resources
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

resource "digitalocean_database_cluster" "postgres" {
  name                 = "${var.project_name}-${var.environment}-pg"
  engine               = "pg"
  version              = var.postgres_version
  size                 = var.postgres_node_size
  region               = var.region
  node_count           = var.postgres_node_count
  private_network_uuid = var.vpc_uuid

  maintenance_window {
    day  = "sunday"
    hour = "04:00:00"
  }
}

resource "digitalocean_database_db" "nebula" {
  cluster_id = digitalocean_database_cluster.postgres.id
  name       = "nebula"
}

resource "digitalocean_database_user" "nebula" {
  cluster_id = digitalocean_database_cluster.postgres.id
  name       = "nebula"
}

resource "digitalocean_database_connection_pool" "pgbouncer" {
  cluster_id = digitalocean_database_cluster.postgres.id
  name       = "pgbouncer-pool"
  mode       = var.postgres_pool_mode
  size       = var.postgres_pool_size
  db_name    = digitalocean_database_db.nebula.name
  user       = digitalocean_database_user.nebula.name
}

resource "digitalocean_database_firewall" "postgres" {
  cluster_id = digitalocean_database_cluster.postgres.id
  rule {
    type  = "k8s"
    value = var.doks_cluster_id
  }
}
