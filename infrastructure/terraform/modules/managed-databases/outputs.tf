// Nebula DNS - Managed Databases Module Outputs
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

# PostgreSQL outputs
output "postgres_host" {
  description = "PostgreSQL cluster host"
  value       = digitalocean_database_cluster.postgres.host
  sensitive   = true
}

output "postgres_port" {
  description = "PostgreSQL cluster port"
  value       = digitalocean_database_cluster.postgres.port
}

output "postgres_user" {
  description = "PostgreSQL username"
  value       = digitalocean_database_user.nebula.name
}

output "postgres_password" {
  description = "PostgreSQL password"
  value       = digitalocean_database_user.nebula.password
  sensitive   = true
}

output "postgres_database" {
  description = "PostgreSQL database name"
  value       = digitalocean_database_db.nebula.name
}

output "postgres_connection_uri" {
  description = "PostgreSQL connection string via PgBouncer pool"
  value       = digitalocean_database_connection_pool.pgbouncer.uri
  sensitive   = true
}

output "postgres_direct_uri" {
  description = "PostgreSQL direct connection string for migrations (bypasses pool)"
  value       = "postgresql://${digitalocean_database_user.nebula.name}:${digitalocean_database_user.nebula.password}@${digitalocean_database_cluster.postgres.host}:${digitalocean_database_cluster.postgres.port}/${digitalocean_database_db.nebula.name}?sslmode=require"
  sensitive   = true
}

# Valkey outputs
output "valkey_host" {
  description = "Valkey cluster host"
  value       = digitalocean_database_cluster.valkey.host
  sensitive   = true
}

output "valkey_port" {
  description = "Valkey cluster port"
  value       = digitalocean_database_cluster.valkey.port
}

output "valkey_password" {
  description = "Valkey password"
  value       = digitalocean_database_cluster.valkey.password
  sensitive   = true
}

output "valkey_connection_uri" {
  description = "Valkey connection string with TLS (rediss://)"
  value       = "rediss://:${digitalocean_database_cluster.valkey.password}@${digitalocean_database_cluster.valkey.host}:${digitalocean_database_cluster.valkey.port}"
  sensitive   = true
}

output "valkey_tls_enabled" {
  description = "Whether TLS is enabled for Valkey (always true for managed Valkey)"
  value       = true
}
