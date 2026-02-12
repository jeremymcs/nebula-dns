// Nebula DNS - Managed Databases Module Variables
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

variable "project_name" {
  description = "Name of the project for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g., production, staging)"
  type        = string
}

variable "region" {
  description = "DigitalOcean region for database clusters"
  type        = string
  default     = "nyc3"
}

variable "vpc_uuid" {
  description = "UUID of the VPC to place databases in"
  type        = string
}

variable "doks_cluster_id" {
  description = "DOKS cluster ID for firewall rule (restricts DB access to cluster)"
  type        = string
}

# PostgreSQL configuration
variable "postgres_node_size" {
  description = "PostgreSQL instance size"
  type        = string
  default     = "db-s-2vcpu-4gb"
}

variable "postgres_node_count" {
  description = "Number of PostgreSQL nodes (2+ for HA)"
  type        = number
  default     = 2
}

variable "postgres_version" {
  description = "PostgreSQL version"
  type        = string
  default     = "16"
}

variable "postgres_pool_size" {
  description = "PgBouncer connection pool size"
  type        = number
  default     = 50
}

variable "postgres_pool_mode" {
  description = "PgBouncer pool mode (transaction, session, statement)"
  type        = string
  default     = "transaction"
}

# Valkey configuration
variable "valkey_node_size" {
  description = "Valkey instance size"
  type        = string
  default     = "db-s-1vcpu-2gb"
}

variable "valkey_node_count" {
  description = "Number of Valkey nodes (2+ for HA)"
  type        = number
  default     = 2
}
