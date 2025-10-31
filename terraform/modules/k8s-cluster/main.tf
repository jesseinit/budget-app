terraform {
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.45"
    }
  }
}

# SSH key for server access
resource "hcloud_ssh_key" "k8s_key" {
  name       = "${var.project_name}-key"
  public_key = var.ssh_public_key
}

# Master node (k3s server)
resource "hcloud_server" "master" {
  name        = "${var.project_name}-master"
  server_type = var.master_server_type
  image       = "ubuntu-22.04"
  location    = var.location
  ssh_keys    = [hcloud_ssh_key.k8s_key.id]
  firewall_ids = [var.firewall_id]

  network {
    network_id = var.network_id
    ip         = cidrhost(var.network_subnet, 2) # 10.0.0.2
  }

  user_data = templatefile("${path.module}/templates/master-init.sh", {
    hcloud_token = var.hcloud_token
  })

  labels = {
    role = "master"
    env  = "production"
  }

  public_net {
    ipv4_enabled = true
    ipv6_enabled = false
  }
}

# Worker node (k3s agent)
resource "hcloud_server" "worker" {
  name        = "${var.project_name}-worker"
  server_type = var.worker_server_type
  image       = "ubuntu-22.04"
  location    = var.location
  ssh_keys    = [hcloud_ssh_key.k8s_key.id]
  firewall_ids = [var.firewall_id]

  network {
    network_id = var.network_id
    ip         = cidrhost(var.network_subnet, 3) # 10.0.0.3
  }

  user_data = templatefile("${path.module}/templates/worker-init.sh", {
    master_ip = cidrhost(var.network_subnet, 2)
  })

  labels = {
    role = "worker"
    env  = "production"
  }

  public_net {
    ipv4_enabled = true
    ipv6_enabled = false
  }

  depends_on = [hcloud_server.master]
}

# Wait for master to be ready and get k3s token
resource "null_resource" "get_k3s_token" {
  depends_on = [hcloud_server.master]

  provisioner "local-exec" {
    command = <<-EOT
      sleep 60
      echo "Waiting for k3s to be ready on master..."
    EOT
  }
}
