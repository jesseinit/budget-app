#!/bin/bash
# Script to fetch kubeconfig from master node

set -e

# Get master IP from terraform output
MASTER_IP=$(cd .. && terraform output -raw master_ip)

if [ -z "$MASTER_IP" ]; then
  echo "Error: Could not get master IP from terraform output"
  exit 1
fi

echo "Fetching kubeconfig from master node at $MASTER_IP..."

# Create .kube directory if it doesn't exist
mkdir -p ~/.kube

# Fetch kubeconfig from master
scp -o StrictHostKeyChecking=no root@$MASTER_IP:/etc/rancher/k3s/k3s.yaml ~/.kube/config-budget

# Replace 127.0.0.1 with master IP
sed -i.bak "s/127.0.0.1/$MASTER_IP/g" ~/.kube/config-budget

echo "Kubeconfig saved to ~/.kube/config-budget"
echo ""
echo "To use this config, run:"
echo "  export KUBECONFIG=~/.kube/config-budget"
echo ""
echo "Or merge with existing config:"
echo "  KUBECONFIG=~/.kube/config:~/.kube/config-budget kubectl config view --flatten > ~/.kube/config-merged"
echo "  mv ~/.kube/config-merged ~/.kube/config"
echo ""
echo "Test the connection:"
echo "  kubectl --kubeconfig=~/.kube/config-budget get nodes"
