# Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
terraform {
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.36"
    }
  }
}
