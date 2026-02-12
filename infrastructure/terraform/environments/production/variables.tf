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
