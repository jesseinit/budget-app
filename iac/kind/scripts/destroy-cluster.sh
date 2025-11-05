#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
CLUSTER_NAME="budget-app-local"
KUBECONFIG_PATH="$HOME/.kube/config-budget-local"

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Budget App - Destroy Local Kind Cluster${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# Check if kind is installed
if ! command -v kind &> /dev/null; then
    echo -e "${RED}Error: kind is not installed${NC}"
    exit 1
fi

# Check if cluster exists
if ! kind get clusters 2>/dev/null | grep -q "^${CLUSTER_NAME}$"; then
    echo -e "${YELLOW}Cluster '${CLUSTER_NAME}' does not exist${NC}"
    echo "Nothing to destroy."
    exit 0
fi

# Show cluster info before deletion
echo -e "${YELLOW}Current cluster:${NC}"
export KUBECONFIG="${KUBECONFIG_PATH}"
if [ -f "${KUBECONFIG_PATH}" ]; then
    kubectl get nodes 2>/dev/null || true
fi
echo ""

# Confirm deletion
echo -e "${RED}WARNING: This will delete the entire cluster and all its resources!${NC}"
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Aborted.${NC}"
    exit 0
fi

# Delete cluster
echo -e "${YELLOW}Deleting Kind cluster '${CLUSTER_NAME}'...${NC}"
kind delete cluster --name="${CLUSTER_NAME}"

# Remove kubeconfig
if [ -f "${KUBECONFIG_PATH}" ]; then
    echo -e "${YELLOW}Removing kubeconfig file...${NC}"
    rm -f "${KUBECONFIG_PATH}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Cluster destroyed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}To create a new cluster:${NC}"
echo "  ./scripts/setup-cluster.sh"
echo ""
