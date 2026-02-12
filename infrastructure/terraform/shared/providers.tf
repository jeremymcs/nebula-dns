// Nebula DNS - Infrastructure Provisioning
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

variable "do_token" {
  description = "DigitalOcean API token with read+write access"
  type        = string
  sensitive   = true
}

provider "digitalocean" {
  token = var.do_token
}
