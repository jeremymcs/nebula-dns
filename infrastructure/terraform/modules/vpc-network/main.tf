// Nebula DNS - Infrastructure Provisioning
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

resource "digitalocean_vpc" "main" {
  name     = "${var.project_name}-${var.environment}-vpc"
  region   = var.region
  ip_range = var.ip_range
}
