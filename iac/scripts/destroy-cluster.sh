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
echo "Step 1: Cleaning up Kubernetes resources and PVCs..."

# Check if kubectl is configured
if kubectl cluster-info &> /dev/null; then
  echo "Cluster is accessible, deleting StatefulSets and PVCs..."

  # Delete StatefulSets (this will delete pods but not PVCs)
  echo "Deleting StatefulSets..."
  kubectl delete statefulset postgres redis -n budget-app --ignore-not-found=true --timeout=60s || true

  # Delete PVCs (this should trigger volume deletion via CSI driver)
  echo "Deleting PersistentVolumeClaims..."
  kubectl delete pvc -n budget-app --all --timeout=60s || true

  # Wait a bit for volume deletion to propagate
  echo "Waiting for volumes to be released..."
  sleep 10

  # Delete the namespace (this will clean up any remaining resources)
  echo "Deleting namespace..."
  kubectl delete namespace budget-app --timeout=60s || true

  echo "Kubernetes cleanup complete."
else
  echo "WARNING: Cannot connect to cluster. Skipping Kubernetes cleanup."
  echo "You may need to manually delete Hetzner Cloud Volumes."
fi

echo ""
echo "Step 2: Destroying infrastructure with Terraform..."
cd ..
terraform destroy -auto-approve

echo ""
echo "Step 3: Cleaning up any orphaned Hetzner Cloud Volumes..."

# Get Hetzner token from terraform.tfvars
HCLOUD_TOKEN=$(grep -E "^hcloud_token" terraform.tfvars | cut -d'"' -f2 2>/dev/null || true)

if [ -n "$HCLOUD_TOKEN" ]; then
  # Check if jq is installed
  if ! command -v jq &> /dev/null; then
    echo "WARNING: jq is not installed. Skipping automatic volume cleanup."
    echo "Install jq with: brew install jq"
    echo "Then run: make cleanup-volumes-auto"
  else
    echo "Fetching Hetzner Cloud volumes..."
    RESPONSE=$(curl -s -H "Authorization: Bearer $HCLOUD_TOKEN" \
      'https://api.hetzner.cloud/v1/volumes')

    ORPHANED_VOLUMES=$(echo "$RESPONSE" | jq -r '.volumes[] | select(.name | contains("pvc")) | "\(.id) \(.name) \(.size) \(.status)"')

    if [ -n "$ORPHANED_VOLUMES" ]; then
      echo "Found orphaned volumes - deleting automatically:"
      printf "%-12s %-45s %-8s %-12s\n" "ID" "NAME" "SIZE" "STATUS"
      echo "$ORPHANED_VOLUMES" | column -t -s $'\t'
      echo ""

      DELETED_COUNT=0
      FAILED_COUNT=0

      echo "$ORPHANED_VOLUMES" | while read -r volume_id volume_name volume_size _; do
        echo "Deleting volume $volume_id ($volume_name - ${volume_size}GB)..."

        DELETE_RESPONSE=$(curl -s -X DELETE \
          -H "Authorization: Bearer $HCLOUD_TOKEN" \
          -w "\n%{http_code}" \
          "https://api.hetzner.cloud/v1/volumes/$volume_id")

        HTTP_CODE=$(echo "$DELETE_RESPONSE" | tail -n1)

        if [ "$HTTP_CODE" = "204" ] || [ "$HTTP_CODE" = "200" ]; then
          echo "  ✓ Deleted successfully"
        else
          echo "  ✗ Failed (HTTP $HTTP_CODE)"
          BODY=$(echo "$DELETE_RESPONSE" | head -n-1)
          echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
        fi
      done
      echo ""
      echo "Volume cleanup complete."
    else
      echo "No orphaned PVC volumes found."
    fi
  fi
else
  echo "WARNING: Could not read Hetzner token. Skipping volume cleanup."
  echo "Run manually: make cleanup-volumes-auto"
fi

echo ""
echo "====================================="
echo "Cluster destroyed successfully!"
echo "====================================="
echo ""
echo "Don't forget to:"
echo "1. Remove kubeconfig: rm ~/.kube/config-budget"
echo "2. Clean up any local terraform state if needed"
