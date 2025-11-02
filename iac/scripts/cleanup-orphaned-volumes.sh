#!/bin/bash
# Script to clean up orphaned Hetzner Cloud Volumes
# Use this if you've already destroyed the cluster and volumes remain

set -e

cd "$(dirname "$0")/.."

echo "=== Hetzner Cloud Volume Cleanup ==="
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
  echo "WARNING: jq is not installed. Install it with: brew install jq"
  echo ""
  echo "Raw API response:"
  echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
  echo ""
  echo "Please install jq to use this script, or manually delete volumes from:"
  echo "https://console.hetzner.cloud/projects"
  exit 1
fi

# Parse and display all volumes
echo ""
echo "All Hetzner Cloud Volumes:"
echo "-------------------------------------------"
printf "%-12s %-45s %-8s %-12s %-12s\n" "ID" "NAME" "SIZE" "STATUS" "SERVER"
echo "$RESPONSE" | jq -r '.volumes[] | "\(.id)\t\(.name)\t\(.size)GB\t\(.status)\t\(.server // "detached")"' | \
  column -t -s $'\t'

echo ""
echo "-------------------------------------------"
echo "Volumes from StatefulSets (containing 'pvc'):"
ORPHANED_VOLUMES=$(echo "$RESPONSE" | jq -r '.volumes[] | select(.name | contains("pvc")) | "\(.id) \(.name) \(.size) \(.status)"')

if [ -z "$ORPHANED_VOLUMES" ]; then
  echo "No orphaned PVC volumes found."
  echo ""
  echo "All volumes listed above. Delete manually if needed."
  exit 0
fi

printf "%-12s %-45s %-8s %-12s\n" "ID" "NAME" "SIZE" "STATUS"
echo "$ORPHANED_VOLUMES" | column -t -s $'\t'
echo ""

read -p "Delete these volumes? This action cannot be undone! (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
  echo "Aborted."
  exit 0
fi

echo ""
echo "Deleting volumes..."

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
echo "Cleanup complete!"
echo ""
echo "Verify in Hetzner Cloud Console: https://console.hetzner.cloud/projects"
