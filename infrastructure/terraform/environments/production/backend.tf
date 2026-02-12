// Nebula DNS - Infrastructure Provisioning
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

terraform {
  backend "s3" {
    bucket                      = "nebula-terraform-state"
    key                         = "production/terraform.tfstate"
    region                      = "us-east-1" # Required but ignored by Spaces
    endpoint                    = "https://nyc3.digitaloceanspaces.com"
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_requesting_account_id  = true
    skip_s3_checksum            = true
  }
}
