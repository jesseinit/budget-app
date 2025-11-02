output "master_ip" {
  description = "Public IP address of the master node"
  value       = module.k8s_cluster.master_ip
}

output "worker_ips" {
  description = "Public IP addresses of the worker nodes"
  value       = module.k8s_cluster.worker_ips
}

output "master_private_ip" {
  description = "Private IP address of the master node"
  value       = module.k8s_cluster.master_private_ip
}

output "worker_private_ips" {
  description = "Private IP addresses of the worker nodes"
  value       = module.k8s_cluster.worker_private_ips
}

output "loadbalancer_ip" {
  description = "Public IP address of the load balancer"
  value       = module.loadbalancer.lb_ip
}

output "network_id" {
  description = "ID of the private network"
  value       = module.network.network_id
}

output "kubeconfig_command" {
  description = "Command to fetch kubeconfig from master node"
  value       = "scp root@${module.k8s_cluster.master_ip}:/etc/rancher/k3s/k3s.yaml ~/.kube/config && sed -i 's/127.0.0.1/${module.k8s_cluster.master_ip}/g' ~/.kube/config"
}

output "ssh_master" {
  description = "SSH command for master node"
  value       = "ssh root@${module.k8s_cluster.master_ip}"
}

output "ssh_workers" {
  description = "SSH commands for worker nodes"
  value       = [for ip in module.k8s_cluster.worker_ips : "ssh root@${ip}"]
}
