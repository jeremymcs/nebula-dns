# Nebula DNS - ClickHouse Cloud Terraform Module Outputs
# Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

output "service_id" {
  description = "ClickHouse Cloud service ID"
  value       = clickhouse_service.analytics.id
}

output "endpoints" {
  description = "ClickHouse Cloud service endpoints"
  value       = clickhouse_service.analytics.endpoints
  sensitive   = true
}

output "iam_role" {
  description = "IAM role for S3 access (if applicable)"
  value       = try(clickhouse_service.analytics.iam_role, null)
}
