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
  description = "DigitalOcean region where the cluster will be created"
  type        = string
}

variable "kubernetes_version" {
  description = "Kubernetes version for the cluster"
  type        = string
  default     = "1.30"
}

variable "vpc_uuid" {
  description = "UUID of the VPC where the cluster will be created"
  type        = string
}

variable "node_size" {
  description = "Size of worker nodes (e.g., s-4vcpu-8gb)"
  type        = string
  default     = "s-4vcpu-8gb"
}

variable "node_count" {
  description = "Initial number of worker nodes"
  type        = number
  default     = 3
}

variable "auto_scale" {
  description = "Enable auto-scaling for the node pool"
  type        = bool
  default     = true
}

variable "min_nodes" {
  description = "Minimum number of nodes when auto-scaling is enabled"
  type        = number
  default     = 3
}

variable "max_nodes" {
  description = "Maximum number of nodes when auto-scaling is enabled"
  type        = number
  default     = 10
}

variable "auto_upgrade" {
  description = "Enable automatic Kubernetes version upgrades"
  type        = bool
  default     = true
}

variable "ha_control_plane" {
  description = "Enable highly available control plane"
  type        = bool
  default     = true
}
