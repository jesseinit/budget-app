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
  name         = "${var.project_name}-master"
  server_type  = var.master_server_type
  image        = "ubuntu-24.04"
  location     = var.location
  ssh_keys     = [hcloud_ssh_key.k8s_key.id]
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

# Worker nodes (k3s agents)
resource "hcloud_server" "worker" {
  count = var.worker_count

  name         = "${var.project_name}-worker-${count.index + 1}"
  server_type  = var.worker_server_type
  image        = "ubuntu-24.04"
  location     = var.location
  ssh_keys     = [hcloud_ssh_key.k8s_key.id]
  firewall_ids = [var.firewall_id]

  network {
    network_id = var.network_id
    ip         = cidrhost(var.network_subnet, 3 + count.index) # 10.0.0.3, 10.0.0.4, etc.
  }

  user_data = templatefile("${path.module}/templates/worker-init.sh", {
    master_ip = cidrhost(var.network_subnet, 2)
    node_ip   = cidrhost(var.network_subnet, 3 + count.index)
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

# Copy configuration files to master
resource "null_resource" "copy_config_files" {
  depends_on = [hcloud_server.master]

  triggers = {
    master_id     = hcloud_server.master.id
    script_hash   = filemd5("${path.module}/templates/install-cluster-addons.sh")
  }

  provisioner "local-exec" {
    command = <<-EOT
      set -e  # Exit on any error

      echo "Waiting for master node to be ready for SSH..."

      # Wait for SSH to be ready with retries (max 2 minutes)
      MAX_RETRIES=24
      RETRY_COUNT=0
      RETRY_DELAY=5

      while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        if ssh -i ${var.ssh_private_key_path} \
            -o StrictHostKeyChecking=no \
            -o UserKnownHostsFile=/dev/null \
            -o ConnectTimeout=5 \
            -o BatchMode=yes \
            root@${hcloud_server.master.ipv4_address} "echo 'SSH ready'" >/dev/null 2>&1; then
          echo "SSH connection established successfully!"
          break
        fi

        RETRY_COUNT=$((RETRY_COUNT + 1))
        if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
          echo "SSH not ready yet, retrying in $RETRY_DELAY seconds... (attempt $RETRY_COUNT/$MAX_RETRIES)"
          sleep $RETRY_DELAY
        else
          echo "ERROR: SSH connection failed after $MAX_RETRIES attempts"
          exit 1
        fi
      done

      ssh-keyscan -H ${hcloud_server.master.ipv4_address} >> ~/.ssh/known_hosts 2>/dev/null || true

      # Copy cluster addons installation script
      echo "Copying cluster addons installation script to master..."
      scp -i ${var.ssh_private_key_path} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
        "${path.module}/templates/install-cluster-addons.sh" \
        root@${hcloud_server.master.ipv4_address}:/root/install-cluster-addons.sh

      # Verify the script was copied
      ssh -i ${var.ssh_private_key_path} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
        root@${hcloud_server.master.ipv4_address} "test -f /root/install-cluster-addons.sh && echo 'Script copied successfully' || (echo 'ERROR: Script not found on master!'; exit 1)"

      # Copy sealed-secrets key if it exists
      if [ -f "${path.root}/../../.sealed-secrets-keys/sealed-secrets-key.yaml" ]; then
        echo "Copying sealed-secrets key to master..."
        scp -i ${var.ssh_private_key_path} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
          "${path.root}/../../.sealed-secrets-keys/sealed-secrets-key.yaml" \
          root@${hcloud_server.master.ipv4_address}:/root/sealed-secrets-key.yaml
        echo "Sealed-secrets key copied successfully"
      else
        echo "No sealed-secrets key found to copy (this is OK for first-time setup)"
      fi

      echo "All configuration files copied successfully"
    EOT
  }
}

# Wait for master to be ready and install cluster add-ons
resource "null_resource" "install_cluster_addons" {
  depends_on = [null_resource.copy_config_files]

  provisioner "local-exec" {
    command = <<-EOT
      echo "Waiting for k3s to be ready on master..."
      # Wait for master to be accessible and k3s to be running
      for i in {1..30}; do
        if ssh -i ${var.ssh_private_key_path} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@${hcloud_server.master.ipv4_address} "kubectl get nodes" 2>/dev/null; then
          echo "Master is ready!"
          break
        fi
        echo "Waiting for k3s to be ready... ($i/30)"
        sleep 10
      done

      echo "Installing cluster add-ons (Helm, Sealed Secrets, Nginx Ingress)..."
      ssh -i ${var.ssh_private_key_path} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@${hcloud_server.master.ipv4_address} \
        "chmod +x /root/install-cluster-addons.sh && /root/install-cluster-addons.sh"

      echo "Cluster add-ons installed successfully"
    EOT
  }

  triggers = {
    master_id = hcloud_server.master.id
  }
}

# Join workers to the cluster
resource "null_resource" "join_workers" {
  count      = var.worker_count
  depends_on = [null_resource.install_cluster_addons, hcloud_server.worker]

  provisioner "local-exec" {
    command = <<-EOT
      echo "Joining worker-${count.index + 1} to cluster..."
      ssh-keygen -R ${hcloud_server.worker[count.index].ipv4_address} 2>/dev/null || true

      # Get k3s token from master
      K3S_TOKEN=$(ssh -i ${var.ssh_private_key_path} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@${hcloud_server.master.ipv4_address} "cat /var/lib/rancher/k3s/server/node-token")

      # Check if k3s-agent is already running
      AGENT_STATUS=$(ssh -i ${var.ssh_private_key_path} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@${hcloud_server.worker[count.index].ipv4_address} "systemctl is-active k3s-agent 2>/dev/null || echo 'inactive'")

      if [ "$AGENT_STATUS" != "active" ]; then
        echo "Installing k3s agent on worker-${count.index + 1}..."
        ssh -i ${var.ssh_private_key_path} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@${hcloud_server.worker[count.index].ipv4_address} \
          "curl -sfL https://get.k3s.io | K3S_URL=https://${cidrhost(var.network_subnet, 2)}:6443 K3S_TOKEN=$K3S_TOKEN INSTALL_K3S_EXEC='agent --node-ip=${cidrhost(var.network_subnet, 3 + count.index)} --flannel-iface=enp7s0' sh -"
        echo "Worker-${count.index + 1} joined successfully"
      else
        echo "Worker-${count.index + 1} already joined, skipping..."
      fi
    EOT
  }

  triggers = {
    worker_id = hcloud_server.worker[count.index].id
  }
}

