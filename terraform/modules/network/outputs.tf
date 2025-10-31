output "network_id" {
  description = "ID of the created network"
  value       = hcloud_network.k8s_network.id
}

output "subnet_cidr" {
  description = "CIDR block of the subnet"
  value       = hcloud_network_subnet.k8s_subnet.ip_range
}

output "firewall_id" {
  description = "ID of the firewall"
  value       = hcloud_firewall.k8s_firewall.id
}
