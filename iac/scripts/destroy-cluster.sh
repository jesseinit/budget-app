#!/bin/bash
# Script to destroy the entire cluster

set -e

echo "=== WARNING: This will destroy the entire cluster and all data! ==="
echo ""

read -p "Are you absolutely sure you want to destroy the cluster? (type 'destroy' to confirm): " confirm
if [ "$confirm" != "destroy" ]; then
  echo "Aborted."
  exit 0
fi

echo ""
echo "Destroying infrastructure..."
cd ..
terraform destroy -auto-approve

echo ""
echo "Cluster destroyed successfully."
echo ""
echo "Don't forget to:"
echo "1. Remove kubeconfig: rm ~/.kube/config"
echo "2. Clean up any local terraform state if needed"
