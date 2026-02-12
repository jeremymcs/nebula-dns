// Nebula DNS - Infrastructure Provisioning
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

output "vpc_id" {
  description = "The ID of the VPC"
  value       = module.vpc.vpc_id
}

output "cluster_id" {
  description = "The ID of the Kubernetes cluster"
  value       = module.doks.cluster_id
}

output "cluster_endpoint" {
  description = "The endpoint of the Kubernetes cluster"
  value       = module.doks.cluster_endpoint
}

output "kubeconfig" {
  description = "The kubeconfig for accessing the cluster"
  value       = module.doks.cluster_kubeconfig
  sensitive   = true
}

output "postgres_connection_uri" {
  value     = module.databases.postgres_connection_uri
  sensitive = true
}

output "postgres_direct_uri" {
  value     = module.databases.postgres_direct_uri
  sensitive = true
}

output "valkey_connection_uri" {
  value     = module.databases.valkey_connection_uri
  sensitive = true
}

output "clickhouse_service_id" {
  description = "ClickHouse Cloud service ID"
  value       = module.clickhouse.service_id
}

output "clickhouse_endpoints" {
  description = "ClickHouse Cloud service endpoints"
  value       = module.clickhouse.endpoints
  sensitive   = true
}
