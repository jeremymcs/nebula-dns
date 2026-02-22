// Nebula DNS - Infrastructure Provisioning
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

terraform {
  required_version = ">= 1.7.0"
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.36"
    }
    clickhouse = {
      source  = "ClickHouse/clickhouse"
      version = "~> 0.2"
    }
  }
}

provider "digitalocean" {
  token = var.do_token
}

# Note: ClickHouse Cloud provider requires separate auth
# Set CLICKHOUSE_TOKEN_KEY and CLICKHOUSE_TOKEN_SECRET env vars
provider "clickhouse" {
  organization_id = var.clickhouse_org_id
  token_key       = var.clickhouse_token_key
  token_secret    = var.clickhouse_token_secret
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
  kubernetes_version = "1.32.10-do.3"
  node_size          = "s-4vcpu-8gb"
  node_count         = 3
  min_nodes          = 3
  max_nodes          = 10
}

module "databases" {
  source          = "../../modules/managed-databases"
  project_name    = "nebula-dns"
  environment     = var.environment
  region          = var.region
  vpc_uuid        = module.vpc.vpc_id
  doks_cluster_id = module.doks.cluster_id

  # PostgreSQL
  postgres_node_size  = "db-s-2vcpu-4gb"
  postgres_node_count = 2
  postgres_pool_size  = 50

  # Valkey
  valkey_node_size  = "db-s-1vcpu-2gb"
  valkey_node_count = 2
}

module "clickhouse" {
  source          = "../../modules/clickhouse-cloud"
  service_name    = "nebula-dns-${var.environment}"
  tier            = "production"
  region          = "us-east-1"   # ClickHouse Cloud region (not DO region)
  admin_password  = var.clickhouse_admin_password
}
