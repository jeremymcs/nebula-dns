// Nebula DNS - Infrastructure Provisioning
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>

output "cluster_id" {
  description = "The ID of the Kubernetes cluster"
  value       = digitalocean_kubernetes_cluster.main.id
}

output "cluster_name" {
  description = "The name of the Kubernetes cluster"
  value       = digitalocean_kubernetes_cluster.main.name
}

output "cluster_endpoint" {
  description = "The endpoint of the Kubernetes cluster"
  value       = digitalocean_kubernetes_cluster.main.endpoint
}

output "cluster_kubeconfig" {
  description = "The kubeconfig for accessing the cluster"
  value       = digitalocean_kubernetes_cluster.main.kube_config[0].raw_config
  sensitive   = true
}

output "cluster_token" {
  description = "The cluster token for authentication"
  value       = digitalocean_kubernetes_cluster.main.kube_config[0].token
  sensitive   = true
}
