output "master_ip" {
  description = "Public IP of master node"
  value       = hcloud_server.master.ipv4_address
}

output "worker_ip" {
  description = "Public IP of worker node"
  value       = hcloud_server.worker.ipv4_address
}

output "master_private_ip" {
  description = "Private IP of master node"
  value       = hcloud_server.master.network[0].ip
}

output "worker_private_ip" {
  description = "Private IP of worker node"
  value       = hcloud_server.worker.network[0].ip
}

output "master_server_id" {
  description = "ID of master server"
  value       = hcloud_server.master.id
}

output "worker_server_id" {
  description = "ID of worker server"
  value       = hcloud_server.worker.id
}
