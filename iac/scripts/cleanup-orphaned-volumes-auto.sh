#!/bin/bash
# Script to automatically clean up orphaned Hetzner Cloud Volumes
# WARNING: This script deletes volumes WITHOUT confirmation!

set -e

cd "$(dirname "$0")/.."

echo "=== Hetzner Cloud Volume Auto-Cleanup ==="
echo ""

# Get Hetzner token from terraform.tfvars
HCLOUD_TOKEN=$(grep -E "^hcloud_token" terraform.tfvars | cut -d'"' -f2 2>/dev/null || echo "")

if [ -z "$HCLOUD_TOKEN" ]; then
  echo "ERROR: Could not read hcloud_token from terraform.tfvars"
  echo "Please set HCLOUD_TOKEN environment variable or update terraform.tfvars"
  exit 1
fi

echo "Fetching all Hetzner Cloud volumes..."
RESPONSE=$(curl -s -H "Authorization: Bearer $HCLOUD_TOKEN" \
  'https://api.hetzner.cloud/v1/volumes')

# Check if curl succeeded
if [ $? -ne 0 ]; then
  echo "ERROR: Failed to fetch volumes from Hetzner API"
  exit 1
fi

# Check if jq is installed
if ! command -v jq &> /dev/null; then
  echo "ERROR: jq is not installed. Install it with: brew install jq"
  exit 1
fi

# Find orphaned volumes
ORPHANED_VOLUMES=$(echo "$RESPONSE" | jq -r '.volumes[] | select(.name | contains("pvc")) | "\(.id) \(.name) \(.size) \(.status)"')

if [ -z "$ORPHANED_VOLUMES" ]; then
  echo "No orphaned PVC volumes found."
  echo "Nothing to clean up."
  exit 0
fi

echo "Found orphaned volumes:"
printf "%-12s %-45s %-8s %-12s\n" "ID" "NAME" "SIZE" "STATUS"
echo "$ORPHANED_VOLUMES" | column -t -s $'\t'
echo ""

echo "Deleting volumes automatically..."

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
    DELETED_COUNT=$((DELETED_COUNT + 1))
  else
    echo "  ✗ Failed (HTTP $HTTP_CODE)"
    BODY=$(echo "$DELETE_RESPONSE" | head -n-1)
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
    FAILED_COUNT=$((FAILED_COUNT + 1))
  fi
done

echo ""
echo "Cleanup complete!"
echo ""
echo "Summary:"
echo "  - Deleted: ${DELETED_COUNT} volumes"
echo "  - Failed: ${FAILED_COUNT} volumes"
echo ""
echo "Verify in Hetzner Cloud Console: https://console.hetzner.cloud/projects"
