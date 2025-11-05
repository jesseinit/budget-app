#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
CLUSTER_NAME="budget-app-local"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Load Docker Images into Kind Cluster${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

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

# Function to load image
load_image() {
    local image=$1
    echo -e "${YELLOW}Loading image: ${image}${NC}"

    if docker image inspect "${image}" &> /dev/null; then
        kind load docker-image "${image}" --name="${CLUSTER_NAME}"
        echo -e "${GREEN}✓ Loaded ${image}${NC}"
    else
        echo -e "${RED}✗ Image ${image} not found locally${NC}"
        echo "  Build it first with: docker build -t ${image} <path>"
        return 1
    fi
}

# Default images to load (modify as needed)
IMAGES=(
    "budget-app-client:latest"
    "budget-app-server:latest"
)

# Check if specific images were provided as arguments
if [ $# -gt 0 ]; then
    IMAGES=("$@")
fi

echo -e "${YELLOW}Images to load:${NC}"
for img in "${IMAGES[@]}"; do
    echo "  - ${img}"
done
echo ""

# Load each image
SUCCESS=0
FAILED=0

for img in "${IMAGES[@]}"; do
    if load_image "${img}"; then
        ((SUCCESS++))
    else
        ((FAILED++))
    fi
done

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Summary${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Successfully loaded: ${SUCCESS}"
if [ ${FAILED} -gt 0 ]; then
    echo -e "${RED}Failed: ${FAILED}${NC}"
fi
echo ""

if [ ${FAILED} -eq 0 ]; then
    echo -e "${YELLOW}Images are now available in the cluster!${NC}"
    echo -e "${YELLOW}Update your K8s manifests to use:${NC}"
    echo "  imagePullPolicy: Never  # or IfNotPresent"
else
    echo -e "${RED}Some images failed to load. Build them first.${NC}"
    exit 1
fi
