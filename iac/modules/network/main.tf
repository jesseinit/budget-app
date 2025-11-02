terraform {
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.45"
    }
  }
}

# Private network for cluster communication
resource "hcloud_network" "k8s_network" {
  name     = "${var.project_name}-network"
  ip_range = var.network_cidr
}

# Subnet for the network
resource "hcloud_network_subnet" "k8s_subnet" {
  network_id   = hcloud_network.k8s_network.id
  type         = "cloud"
  network_zone = var.network_zone
  ip_range     = var.network_cidr
}

# Firewall rules for cluster security
resource "hcloud_firewall" "k8s_firewall" {
  name = "${var.project_name}-firewall"

  # SSH access from admin IP
  rule {
    direction = "in"
    protocol  = "tcp"
    port      = "22"
    source_ips = [
      var.admin_ip
    ]
  }

  # Kubernetes API server access from admin IP
  rule {
    direction = "in"
    protocol  = "tcp"
    port      = "6443"
    source_ips = [
      var.admin_ip
    ]
  }

  # HTTP traffic (for ingress via load balancer)
  rule {
    direction = "in"
    protocol  = "tcp"
    port      = "80"
    source_ips = [
      "0.0.0.0/0",
      "::/0"
    ]
  }

  # HTTPS traffic (for ingress via load balancer)
  rule {
    direction = "in"
    protocol  = "tcp"
    port      = "443"
    source_ips = [
      "0.0.0.0/0",
      "::/0"
    ]
  }

  # Kubelet API (internal cluster communication)
  rule {
    direction = "in"
    protocol  = "tcp"
    port      = "10250"
    source_ips = [
      var.network_cidr
    ]
  }

  # etcd server client API (for k3s)
  rule {
    direction = "in"
    protocol  = "tcp"
    port      = "2379-2380"
    source_ips = [
      var.network_cidr
    ]
  }

  # Flannel VXLAN (k3s default CNI)
  rule {
    direction = "in"
    protocol  = "udp"
    port      = "8472"
    source_ips = [
      var.network_cidr
    ]
  }

  # NodePort services range
  rule {
    direction = "in"
    protocol  = "tcp"
    port      = "30000-32767"
    source_ips = [
      "0.0.0.0/0",
      "::/0"
    ]
  }

  # Allow all outbound traffic
  rule {
    direction = "out"
    protocol  = "tcp"
    port      = "any"
    destination_ips = [
      "0.0.0.0/0",
      "::/0"
    ]
  }

  rule {
    direction = "out"
    protocol  = "udp"
    port      = "any"
    destination_ips = [
      "0.0.0.0/0",
      "::/0"
    ]
  }

  rule {
    direction = "out"
    protocol  = "icmp"
    destination_ips = [
      "0.0.0.0/0",
      "::/0"
    ]
  }
}
