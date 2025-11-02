output "master_ip" {
  description = "Public IP of master node"
  value       = hcloud_server.master.ipv4_address
}

output "worker_ips" {
  description = "Public IPs of worker nodes"
  value       = hcloud_server.worker[*].ipv4_address
}

output "master_private_ip" {
  description = "Private IP of master node"
  value       = tolist(hcloud_server.master.network)[0].ip
}

output "worker_private_ips" {
  description = "Private IPs of worker nodes"
  value       = [for w in hcloud_server.worker : tolist(w.network)[0].ip]
}

output "master_server_id" {
  description = "ID of master server"
  value       = hcloud_server.master.id
}

output "worker_server_ids" {
  description = "IDs of worker servers"
  value       = hcloud_server.worker[*].id
}
