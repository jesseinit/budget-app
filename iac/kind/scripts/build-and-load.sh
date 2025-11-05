#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
CLUSTER_NAME="budget-app-local"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$SCRIPT_DIR/../../.."

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Build & Load Images for Kind${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if cluster exists
if ! kind get clusters 2>/dev/null | grep -q "^${CLUSTER_NAME}$"; then
    echo -e "${RED}Error: Cluster '${CLUSTER_NAME}' does not exist${NC}"
    echo "Run 'make kind-setup' first"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "${RED}Error: Docker is not running${NC}"
    exit 1
fi

cd "$PROJECT_ROOT"

# Build images locally (for current architecture)
echo -e "${YELLOW}Building images for local architecture...${NC}"
echo ""

echo -e "${YELLOW}Building API image...${NC}"
docker build -t budget-app-server:latest ./server

echo ""
echo -e "${YELLOW}Building Client image...${NC}"
docker build -t budget-app-client:latest ./client

echo ""
echo -e "${GREEN}✓ Images built successfully${NC}"
echo ""

# Load images into Kind
echo -e "${YELLOW}Loading images into Kind cluster...${NC}"
echo ""

kind load docker-image budget-app-server:latest --name="${CLUSTER_NAME}"
echo -e "${GREEN}✓ Loaded budget-app-server:latest${NC}"

kind load docker-image budget-app-client:latest --name="${CLUSTER_NAME}"
echo -e "${GREEN}✓ Loaded budget-app-client:latest${NC}"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Build & Load Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Images are now available in the cluster:${NC}"
echo "  - budget-app-server:latest"
echo "  - budget-app-client:latest"
echo ""
echo -e "${YELLOW}To deploy using local images:${NC}"
echo "  make deploy-kind"
echo ""
echo -e "${YELLOW}Or manually:${NC}"
echo "  kubectl apply -k k8s/overlays/local/"
echo ""
echo -e "${GREEN}The local overlay automatically configures:${NC}"
echo "  ✓ Uses local image names (budget-app-server:latest)"
echo "  ✓ Sets imagePullPolicy: Never"
echo "  ✓ Removes imagePullSecrets (not needed for local images)"
echo ""
