// Nebula DNS - Infrastructure Provisioning
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

output "vpc_id" {
  description = "The ID of the VPC"
  value       = digitalocean_vpc.main.id
}

output "vpc_urn" {
  description = "The URN of the VPC"
  value       = digitalocean_vpc.main.urn
}

output "vpc_name" {
  description = "The name of the VPC"
  value       = digitalocean_vpc.main.name
}

output "vpc_ip_range" {
  description = "The IP range of the VPC"
  value       = digitalocean_vpc.main.ip_range
}
