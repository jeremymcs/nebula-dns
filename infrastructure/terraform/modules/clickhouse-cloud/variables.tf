# Nebula DNS - ClickHouse Cloud Terraform Module Variables
# Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

variable "service_name" {
  description = "ClickHouse Cloud service name"
  type        = string
}

variable "cloud_provider" {
  description = "ClickHouse Cloud infrastructure provider (aws, gcp, azure)"
  type        = string
  default     = "aws"
}

variable "region" {
  description = "Cloud region for ClickHouse service"
  type        = string
  default     = "us-east-1"
}

variable "tier" {
  description = "Service tier (development, production)"
  type        = string
  default     = "development"
}

variable "min_total_memory_gb" {
  description = "Minimum memory in GB"
  type        = number
  default     = 24
}

variable "max_total_memory_gb" {
  description = "Maximum memory in GB"
  type        = number
  default     = 48
}

variable "idle_scaling" {
  description = "Allow scaling to zero when idle"
  type        = bool
  default     = true
}

variable "idle_timeout_minutes" {
  description = "Minutes before scaling to zero"
  type        = number
  default     = 5
}
