#!/bin/bash
set -e

# Update system
apt-get update
apt-get upgrade -y

# Install basic utilities
apt-get install -y curl wget git vim htop

# Configure swap
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Wait for master to be ready and get k3s token
echo "Waiting for master node to be ready..."
sleep 90

# Get k3s token from master
until K3S_TOKEN=$(ssh -o StrictHostKeyChecking=no root@${master_ip} "cat /var/lib/rancher/k3s/server/node-token" 2>/dev/null); do
  echo "Waiting for k3s token from master..."
  sleep 10
done

# Install k3s as agent (worker)
curl -sfL https://get.k3s.io | K3S_URL=https://${master_ip}:6443 \
  K3S_TOKEN=$K3S_TOKEN \
  INSTALL_K3S_EXEC="agent --node-ip=10.0.0.3" sh -

echo "Worker node setup complete!"
echo "Joined cluster at ${master_ip}:6443"
