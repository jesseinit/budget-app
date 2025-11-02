terraform {
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.45"
    }
  }
}

# Load balancer for ingress traffic
resource "hcloud_load_balancer" "k8s_lb" {
  name               = "${var.project_name}-lb"
  load_balancer_type = "lb11"
  location           = var.location

  labels = {
    environment = "production"
    managed_by  = "terraform"
  }
}

# Attach load balancer to network with explicit IP to avoid conflicts
resource "hcloud_load_balancer_network" "k8s_lb_network" {
  load_balancer_id = hcloud_load_balancer.k8s_lb.id
  network_id       = var.network_id
  ip               = "10.0.0.254" # Use .254 to avoid conflicts with workers
}

# Load balancer targets (all servers)
resource "hcloud_load_balancer_target" "servers" {
  count = length(var.target_servers)

  type             = "server"
  load_balancer_id = hcloud_load_balancer.k8s_lb.id
  server_id        = var.target_servers[count.index]
  use_private_ip   = false
}

# HTTP service (port 80)
# Forward directly to host port 80 where ingress-nginx binds
resource "hcloud_load_balancer_service" "http" {
  load_balancer_id = hcloud_load_balancer.k8s_lb.id
  protocol         = "tcp"
  listen_port      = 80
  destination_port = 80

  health_check {
    protocol = "tcp"
    port     = 80
    interval = 10
    timeout  = 5
    retries  = 3
  }
}

# HTTPS service (port 443)
# Forward directly to host port 443 where ingress-nginx binds
resource "hcloud_load_balancer_service" "https" {
  load_balancer_id = hcloud_load_balancer.k8s_lb.id
  protocol         = "tcp"
  listen_port      = 443
  destination_port = 443

  health_check {
    protocol = "tcp"
    port     = 443
    interval = 10
    timeout  = 5
    retries  = 3
  }
}
