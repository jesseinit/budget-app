#!/bin/bash
set -e

# Set kubeconfig for k3s
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

echo "=== Installing Cluster Add-ons ==="

# Install Helm (required for package management)
echo "Installing Helm..."
curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Add Helm repositories
echo "Adding Helm repositories..."
helm repo add sealed-secrets https://bitnami-labs.github.io/sealed-secrets || echo "Repo already exists"
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx || echo "Repo already exists"
helm repo update

# Restore sealed-secrets key if it exists (must be done before Helm install)
if [ -f /root/sealed-secrets-key.yaml ]; then
  echo "Restoring sealed-secrets encryption key..."
  kubectl apply -f /root/sealed-secrets-key.yaml || echo "Key already exists, continuing..."
  echo "Sealed-secrets key will be used by the controller"
fi

# Install Sealed Secrets Controller using Helm
echo "Installing Sealed Secrets Controller..."
helm upgrade --install sealed-secrets sealed-secrets/sealed-secrets \
  --namespace kube-system \
  --wait \
  --timeout 5m

if [ -f /root/sealed-secrets-key.yaml ]; then
  # Restart controller to pick up the pre-installed key
  echo "Restarting sealed-secrets controller to use restored key..."
  kubectl rollout restart deployment/sealed-secrets -n kube-system || echo "Could not restart deployment"
  kubectl wait --for=condition=available --timeout=300s deployment/sealed-secrets -n kube-system || true
  echo "Sealed-secrets key restored successfully"
else
  echo "No sealed-secrets key backup found at /root/sealed-secrets-key.yaml"
  echo "A new encryption key has been generated. Remember to back it up!"
fi

# Install Nginx Ingress Controller using Helm with DaemonSet and HostPort
echo "Installing Nginx Ingress Controller..."
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.kind=DaemonSet \
  --set controller.hostPort.enabled=true \
  --set controller.hostPort.ports.http=80 \
  --set controller.hostPort.ports.https=443 \
  --set controller.service.type=ClusterIP \
  --set controller.publishService.enabled=false \
  --wait \
  --timeout 5m

echo "Nginx Ingress Controller installed successfully"

echo "=== Cluster Add-ons Installation Complete ==="
