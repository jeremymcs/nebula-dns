// Nebula DNS - Infrastructure Provisioning
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g., production, staging)"
  type        = string
}

variable "region" {
  description = "DigitalOcean region where the VPC will be created"
  type        = string
  default     = "nyc3"
}

variable "ip_range" {
  description = "IP range for the VPC in CIDR notation"
  type        = string
  default     = "10.10.0.0/16"
}
