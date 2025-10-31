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

# Attach load balancer to network
resource "hcloud_load_balancer_network" "k8s_lb_network" {
  load_balancer_id = hcloud_load_balancer.k8s_lb.id
  network_id       = var.network_id
}

# HTTP target (port 80)
resource "hcloud_load_balancer_target" "lb_target" {
  type             = "server"
  load_balancer_id = hcloud_load_balancer.k8s_lb.id

  dynamic "server_target" {
    for_each = var.target_servers
    content {
      server_id = server_target.value
    }
  }

  use_private_ip = false
}

# HTTP service (port 80)
resource "hcloud_load_balancer_service" "http" {
  load_balancer_id = hcloud_load_balancer.k8s_lb.id
  protocol         = "http"
  listen_port      = 80
  destination_port = 80

  health_check {
    protocol = "http"
    port     = 80
    interval = 10
    timeout  = 5
    retries  = 3
    http {
      path         = "/"
      status_codes = ["2??", "3??"]
    }
  }

  http {
    redirect_http = false
    sticky_sessions = false
  }
}

# HTTPS service (port 443)
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
