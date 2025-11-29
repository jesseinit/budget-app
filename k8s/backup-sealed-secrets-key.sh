#!/bin/bash
# Script to backup sealed-secrets encryption key
# NOTE: Sealed-secrets is now installed automatically by Terraform during cluster creation

set -e

echo "=== Sealed Secrets Key Backup Utility ==="
echo ""
echo "NOTE: The sealed-secrets controller is automatically installed during cluster creation."
echo "This script is for backing up the encryption key after cluster creation."
echo ""

# Set kubeconfig if needed
if [ -z "$KUBECONFIG" ]; then
  echo "Setting KUBECONFIG to ~/.kube/config"
  export KUBECONFIG=~/.kube/config
fi

echo "Using kubeconfig: $KUBECONFIG"
echo ""

# Check if sealed-secrets is running
if ! kubectl get deployment sealed-secrets -n kube-system &> /dev/null; then
  echo "Error: Sealed-secrets controller not found in cluster"
  echo "It should have been installed automatically during cluster creation."
  exit 1
fi

echo "Sealed-secrets controller is running ✓"
echo ""

# Backup the key
echo "Backing up sealed-secrets encryption key..."
mkdir -p ../.sealed-secrets-keys
kubectl get secret -n kube-system -l sealedsecrets.bitnami.com/sealed-secrets-key -o yaml > ../.sealed-secrets-keys/sealed-secrets-key.yaml

echo ""
echo "=== Key Backed Up Successfully ==="
echo ""
echo "Key saved to: .sealed-secrets-keys/sealed-secrets-key.yaml"
echo ""
echo "This key will be automatically restored when you recreate the cluster."
echo "Keep this directory safe and never commit it to git!"
echo ""
