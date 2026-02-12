// Nebula DNS - Infrastructure Provisioning
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

variable "do_token" {
  description = "DigitalOcean API token with read+write access"
  type        = string
  sensitive   = true
}

variable "region" {
  description = "DigitalOcean region for the infrastructure"
  type        = string
  default     = "nyc3"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "clickhouse_org_id" {
  description = "ClickHouse Cloud organization ID"
  type        = string
  sensitive   = true
}

variable "clickhouse_token_key" {
  description = "ClickHouse Cloud API token key"
  type        = string
  sensitive   = true
}

variable "clickhouse_token_secret" {
  description = "ClickHouse Cloud API token secret"
  type        = string
  sensitive   = true
}
