// Nebula DNS - Infrastructure Provisioning
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

terraform {
  required_version = ">= 1.7.0"
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.36"
    }
  }
}

provider "digitalocean" {
  token = var.do_token
}

module "vpc" {
  source       = "../../modules/vpc-network"
  project_name = "nebula-dns"
  environment  = var.environment
  region       = var.region
}

module "doks" {
  source             = "../../modules/doks-cluster"
  project_name       = "nebula-dns"
  environment        = var.environment
  region             = var.region
  vpc_uuid           = module.vpc.vpc_id
  kubernetes_version = "1.30"
  node_size          = "s-4vcpu-8gb"
  node_count         = 3
  min_nodes          = 3
  max_nodes          = 10
}
