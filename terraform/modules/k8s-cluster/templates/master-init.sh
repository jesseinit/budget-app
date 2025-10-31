#!/bin/bash
set -e

# Update system
apt-get update
apt-get upgrade -y

# Install basic utilities
apt-get install -y curl wget git vim htop

# Configure swap (recommended for small servers)
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Install k3s as server (master)
curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="server \
  --node-ip=10.0.0.2 \
  --advertise-address=10.0.0.2 \
  --disable=traefik \
  --disable=servicelb \
  --write-kubeconfig-mode=644 \
  --cluster-cidr=10.42.0.0/16 \
  --service-cidr=10.43.0.0/16 \
  --kube-apiserver-arg=service-node-port-range=80-32767" sh -

# Wait for k3s to be ready
until kubectl get nodes &> /dev/null; do
  echo "Waiting for k3s to be ready..."
  sleep 5
done

echo "k3s master node is ready!"

# Install Hetzner Cloud CSI driver
kubectl apply -f https://raw.githubusercontent.com/hetznercloud/csi-driver/main/deploy/kubernetes/hcloud-csi.yml

# Create hcloud secret for CSI driver
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Secret
metadata:
  name: hcloud
  namespace: kube-system
stringData:
  token: ${hcloud_token}
EOF

# Install Nginx Ingress Controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/cloud/deploy.yaml

# Create storage class for Hetzner volumes
cat <<EOF | kubectl apply -f -
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: hcloud-volumes
provisioner: csi.hetzner.cloud
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
reclaimPolicy: Retain
EOF

# Set as default storage class
kubectl patch storageclass hcloud-volumes -p '{"metadata": {"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}'

# Save k3s token for worker to join
K3S_TOKEN=$(cat /var/lib/rancher/k3s/server/node-token)
echo $K3S_TOKEN > /root/k3s-token.txt

echo "Master node setup complete!"
echo "K3s token saved to /root/k3s-token.txt"
echo "Kubeconfig available at /etc/rancher/k3s/k3s.yaml"
