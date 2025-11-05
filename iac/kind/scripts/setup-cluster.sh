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
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
KIND_CONFIG="$SCRIPT_DIR/../kind-config.yaml"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Budget App - Local Kind Cluster Setup${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command -v kind &> /dev/null; then
    echo -e "${RED}Error: kind is not installed${NC}"
    echo "Install with: brew install kind"
    echo "Or visit: https://kind.sigs.k8s.io/docs/user/quick-start/#installation"
    exit 1
fi

if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}Error: kubectl is not installed${NC}"
    echo "Install with: brew install kubectl"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: docker is not installed${NC}"
    echo "Install Docker Desktop or Docker Engine"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "${RED}Error: Docker is not running${NC}"
    echo "Please start Docker Desktop or Docker daemon"
    exit 1
fi

echo -e "${GREEN}✓ All prerequisites satisfied${NC}"
echo ""

# Check if cluster already exists
if kind get clusters 2>/dev/null | grep -q "^${CLUSTER_NAME}$"; then
    echo -e "${YELLOW}Cluster '${CLUSTER_NAME}' already exists${NC}"
    read -p "Do you want to delete and recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Deleting existing cluster...${NC}"
        kind delete cluster --name="${CLUSTER_NAME}"
    else
        echo -e "${YELLOW}Using existing cluster${NC}"
        kind export kubeconfig --name="${CLUSTER_NAME}" --kubeconfig="${KUBECONFIG_PATH}"
        echo ""
        echo -e "${GREEN}Cluster '${CLUSTER_NAME}' is ready!${NC}"
        echo ""
        echo -e "${YELLOW}To use the cluster:${NC}"
        echo "  export KUBECONFIG=${KUBECONFIG_PATH}"
        echo "  kubectl get nodes"
        exit 0
    fi
fi

# Create cluster
echo -e "${YELLOW}Creating Kind cluster with 5 nodes (1 control-plane + 4 workers)...${NC}"
kind create cluster --config="${KIND_CONFIG}" --wait=5m

# Export kubeconfig
echo -e "${YELLOW}Exporting kubeconfig to ${KUBECONFIG_PATH}...${NC}"
kind export kubeconfig --name="${CLUSTER_NAME}" --kubeconfig="${KUBECONFIG_PATH}"

# Set context
export KUBECONFIG="${KUBECONFIG_PATH}"

# Wait for nodes to be ready
echo -e "${YELLOW}Waiting for nodes to be ready...${NC}"
kubectl wait --for=condition=Ready nodes --all --timeout=300s

# Install Nginx Ingress Controller
echo -e "${YELLOW}Installing Nginx Ingress Controller...${NC}"
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml

# Wait for ingress controller to be ready
echo -e "${YELLOW}Waiting for Ingress Controller to be ready...${NC}"
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=300s

# Patch ingress controller to use hostPort and run on control plane
echo -e "${YELLOW}Configuring Ingress Controller for Kind port mappings...${NC}"
kubectl patch deployment ingress-nginx-controller -n ingress-nginx --type=json -p='[
  {
    "op": "add",
    "path": "/spec/template/spec/nodeSelector",
    "value": {"ingress-ready": "true"}
  },
  {
    "op": "add",
    "path": "/spec/template/spec/containers/0/ports/0/hostPort",
    "value": 80
  },
  {
    "op": "add",
    "path": "/spec/template/spec/containers/0/ports/1/hostPort",
    "value": 443
  }
]'

# Wait for ingress controller to be rescheduled on control plane
echo -e "${YELLOW}Waiting for Ingress Controller to be rescheduled...${NC}"
sleep 5
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=300s

echo -e "${GREEN}✓ Ingress Controller configured and ready${NC}"

# Install metrics-server for HPA (optional)
echo -e "${YELLOW}Installing metrics-server...${NC}"
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Patch metrics-server for Kind (insecure TLS)
kubectl patch deployment metrics-server -n kube-system --type='json' -p='[
  {
    "op": "add",
    "path": "/spec/template/spec/containers/0/args/-",
    "value": "--kubelet-insecure-tls"
  }
]'

# Create namespaces
echo -e "${YELLOW}Creating namespaces...${NC}"
kubectl create namespace budget-app || true
kubectl create namespace monitoring || true

# Install sealed-secrets with Helm
echo -e "${YELLOW}Installing sealed-secrets controller...${NC}"

# Check if Helm is installed
if ! command -v helm &> /dev/null; then
    echo -e "${RED}Error: helm is not installed${NC}"
    echo "Install with: brew install helm"
    exit 1
fi

# Add sealed-secrets Helm repo
helm repo add sealed-secrets https://bitnami-labs.github.io/sealed-secrets
helm repo update

# Check if we have existing sealed-secrets keys to restore
SEALED_SECRETS_KEY="$SCRIPT_DIR/../../../.sealed-secrets-keys/sealed-secrets-key.yaml"
if [ -f "$SEALED_SECRETS_KEY" ]; then
    echo -e "${YELLOW}Found existing sealed-secrets key, restoring...${NC}"

    # Apply the existing key before installing sealed-secrets
    kubectl apply -f "$SEALED_SECRETS_KEY"

    echo -e "${GREEN}✓ Existing sealed-secrets key restored${NC}"
else
    echo -e "${YELLOW}No existing sealed-secrets key found. A new one will be generated.${NC}"
    echo -e "${YELLOW}Remember to back it up after installation!${NC}"
fi

# Install sealed-secrets controller
helm upgrade --install sealed-secrets sealed-secrets/sealed-secrets \
    --namespace kube-system \
    --set fullnameOverride=sealed-secrets-controller \
    --wait

echo -e "${GREEN}✓ Sealed-secrets controller installed${NC}"

# If no existing key, remind to back it up
if [ ! -f "$SEALED_SECRETS_KEY" ]; then
    echo ""
    echo -e "${YELLOW}⚠️  IMPORTANT: Back up your sealed-secrets key!${NC}"
    echo "Run: make backup-sealed-secrets"
    echo ""
fi

# Label nodes
echo -e "${YELLOW}Labeling nodes...${NC}"
CONTROL_PLANE_NODE=$(kubectl get nodes -o name | grep control-plane | head -n1 | cut -d/ -f2)
WORKER_NODE=$(kubectl get nodes -o name | grep -v control-plane | head -n1 | cut -d/ -f2)

kubectl label node "${CONTROL_PLANE_NODE}" node-role.kubernetes.io/master=true --overwrite || true
kubectl label node "${WORKER_NODE}" node-role.kubernetes.io/worker=true --overwrite || true

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Cluster setup complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Cluster Information:${NC}"
echo "  Cluster Name: ${CLUSTER_NAME}"
echo "  Kubeconfig: ${KUBECONFIG_PATH}"
echo "  Nodes: 5 (1 control-plane + 4 workers)"
echo "  Worker Memory Limits: ~4GB per worker"
echo ""

# Show cluster info
echo -e "${YELLOW}Nodes:${NC}"
kubectl get nodes -o wide

echo ""
echo -e "${YELLOW}Namespaces:${NC}"
kubectl get namespaces

echo ""
echo -e "${YELLOW}To use the cluster:${NC}"
echo "  export KUBECONFIG=${KUBECONFIG_PATH}"
echo "  kubectl get nodes"
echo ""

# Build and load images
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Building and Loading Application Images${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

PROJECT_ROOT="$SCRIPT_DIR/../../.."

# Build backend image
echo -e "${YELLOW}Building backend image...${NC}"
if docker build -t budget-app-server:latest "$PROJECT_ROOT/server"; then
    echo -e "${GREEN}✓ Backend image built${NC}"
else
    echo -e "${RED}✗ Failed to build backend image${NC}"
    exit 1
fi

# Build frontend image
echo -e "${YELLOW}Building frontend image...${NC}"
if docker build -t budget-app-client:latest "$PROJECT_ROOT/client"; then
    echo -e "${GREEN}✓ Frontend image built${NC}"
else
    echo -e "${RED}✗ Failed to build frontend image${NC}"
    exit 1
fi

# Load images into Kind cluster
echo -e "${YELLOW}Loading images into Kind cluster...${NC}"
kind load docker-image budget-app-server:latest --name="${CLUSTER_NAME}"
kind load docker-image budget-app-client:latest --name="${CLUSTER_NAME}"
echo -e "${GREEN}✓ Images loaded into cluster${NC}"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deploying Application${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Deploy application using local overlay
echo -e "${YELLOW}Deploying Budget App to cluster...${NC}"
if kubectl apply -k "$PROJECT_ROOT/k8s/overlays/local/"; then
    echo -e "${GREEN}✓ Application deployed${NC}"
else
    echo -e "${RED}✗ Failed to deploy application${NC}"
    exit 1
fi

# Wait for pods to be ready
echo ""
echo -e "${YELLOW}Waiting for application pods to be ready...${NC}"
echo -e "${YELLOW}This may take a few minutes as images are large...${NC}"

# Wait for StatefulSets
kubectl wait --for=condition=ready pod -l app=postgres -n budget-app --timeout=300s 2>/dev/null || true
kubectl wait --for=condition=ready pod -l app=redis -n budget-app --timeout=300s 2>/dev/null || true

# Wait for Deployments
kubectl wait --for=condition=available deployment/backend -n budget-app --timeout=300s 2>/dev/null || true
kubectl wait --for=condition=available deployment/frontend -n budget-app --timeout=300s 2>/dev/null || true

echo ""
echo -e "${YELLOW}Current pod status:${NC}"
kubectl get pods -n budget-app -o wide

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Health Check${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Wait a bit for ingress to be ready
sleep 5

# Test backend health
echo -e "${YELLOW}Testing backend health...${NC}"
if curl -s -f -H "Host: api.localhost" http://localhost:6080/health >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is healthy${NC}"
    curl -s -H "Host: api.localhost" http://localhost:6080/health
else
    echo -e "${YELLOW}⚠ Backend health check failed (may still be starting)${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Access your application:${NC}"
echo "  Frontend:   http://localhost:6080"
echo "  API Docs:   http://localhost:6080/docs"
echo "  API Health: curl -H 'Host: api.localhost' http://localhost:6080/health"
echo ""
echo -e "${YELLOW}Note:${NC} Using ports 6080/6443 to avoid conflicts with system services"
echo ""
echo -e "${YELLOW}To destroy the cluster:${NC}"
echo "  make kind-destroy"
echo ""
