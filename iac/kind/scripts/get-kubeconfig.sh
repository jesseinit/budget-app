#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
CLUSTER_NAME="budget-app-local"
KUBECONFIG_PATH="$HOME/.kube/config-budget-local"

echo -e "${YELLOW}Exporting kubeconfig for cluster '${CLUSTER_NAME}'...${NC}"

# Check if kind is installed
if ! command -v kind &> /dev/null; then
    echo -e "${RED}Error: kind is not installed${NC}"
    exit 1
fi

# Check if cluster exists
if ! kind get clusters 2>/dev/null | grep -q "^${CLUSTER_NAME}$"; then
    echo -e "${RED}Error: Cluster '${CLUSTER_NAME}' does not exist${NC}"
    echo "Run ./setup-cluster.sh first"
    exit 1
fi

# Export kubeconfig
kind export kubeconfig --name="${CLUSTER_NAME}" --kubeconfig="${KUBECONFIG_PATH}"

echo -e "${GREEN}✓ Kubeconfig exported to: ${KUBECONFIG_PATH}${NC}"
echo ""
echo -e "${YELLOW}To use this cluster:${NC}"
echo "  export KUBECONFIG=${KUBECONFIG_PATH}"
echo "  kubectl get nodes"
