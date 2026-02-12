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

output "clickhouse_service_id" {
  description = "ClickHouse Cloud service ID"
  value       = module.clickhouse.service_id
}

output "clickhouse_endpoints" {
  description = "ClickHouse Cloud service endpoints"
  value       = module.clickhouse.endpoints
  sensitive   = true
}
