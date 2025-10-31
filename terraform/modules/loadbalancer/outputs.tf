output "lb_ip" {
  description = "Public IPv4 address of the load balancer"
  value       = hcloud_load_balancer.k8s_lb.ipv4
}

output "lb_id" {
  description = "ID of the load balancer"
  value       = hcloud_load_balancer.k8s_lb.id
}
