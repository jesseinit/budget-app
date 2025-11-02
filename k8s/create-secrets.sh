#!/bin/bash
# Script to create Sealed Secrets from environment variables
# These can be safely committed to git as they're encrypted

set -e

echo "=== Creating Sealed Secrets ==="
echo ""

# Check if kubeseal is installed
if ! command -v kubeseal &> /dev/null; then
  echo "Error: kubeseal is not installed"
  echo ""
  echo "Install it with:"
  echo "  macOS: brew install kubeseal"
  echo "  Linux: Download from https://github.com/bitnami-labs/sealed-secrets/releases"
  exit 1
fi

# Check if required environment variables are set
if [ -z "$GITHUB_TOKEN" ]; then
  echo "Error: GITHUB_TOKEN environment variable is not set"
  echo "Set it with: export GITHUB_TOKEN=your_github_token"
  exit 1
fi

# Optional: Check for Trading212 API key
if [ -z "$TRADING212_API_KEY" ]; then
  echo "Warning: TRADING212_API_KEY not set, using empty string"
  TRADING212_API_KEY=""
fi

# Set kubeconfig if needed
if [ -z "$KUBECONFIG" ]; then
  echo "Setting KUBECONFIG to ~/.kube/config-budget"
  export KUBECONFIG=~/.kube/config-budget
fi

echo "Using kubeconfig: $KUBECONFIG"
echo ""

# Check if Sealed Secrets controller is installed
if ! kubectl get deployment sealed-secrets-controller -n kube-system &> /dev/null; then
  echo "Error: Sealed Secrets controller not found in cluster"
  echo "Install it first by running: ./install-sealed-secrets.sh"
  exit 1
fi

echo "Step 1: Creating application sealed secret..."
kubectl create secret generic budget-app-secrets \
  --from-literal=POSTGRES_USER="budgetuser" \
  --from-literal=POSTGRES_PASSWORD="G8Jwnc4pf16RvGwymdZ1yGSzLFA6yZTo9Pn8Fy2/Ld8=" \
  --from-literal=POSTGRES_DB="budgetdb" \
  --from-literal=DATABASE_URL="postgresql+asyncpg://budgetuser:G8Jwnc4pf16RvGwymdZ1yGSzLFA6yZTo9Pn8Fy2%2FLd8%3D@postgres-rw:5432/budgetdb" \
  --from-literal=REDIS_URL="redis://redis-0.redis-service.budget-app.svc.cluster.local:6379/0" \
  --from-literal=SECRET_KEY="OliQ4uurYA62AMSc2yRQZD5Z0FkMMJTOEdVsp5sL5EAR+PIH+8qML/Pbe/+91Upu" \
  --from-literal=TRADING212_API_KEY="$TRADING212_API_KEY" \
  --namespace=budget-app \
  --dry-run=client -o yaml | \
  kubeseal --format=yaml --cert=base/sealed-secrets-pub-cert.pem > /tmp/sealed-secret-app.yaml

echo "Step 2: Creating GHCR Docker registry sealed secret..."
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=jesseinit \
  --docker-password="$GITHUB_TOKEN" \
  --namespace=budget-app \
  --dry-run=client -o yaml | \
  kubeseal --format=yaml --cert=base/sealed-secrets-pub-cert.pem > /tmp/sealed-secret-ghcr.yaml

echo ""
echo "Step 3: Combining sealed secrets into single file..."
cat /tmp/sealed-secret-app.yaml > base/sealed-secrets.yaml
echo "---" >> base/sealed-secrets.yaml
cat /tmp/sealed-secret-ghcr.yaml >> base/sealed-secrets.yaml
rm /tmp/sealed-secret-app.yaml /tmp/sealed-secret-ghcr.yaml

echo ""
echo "=== Sealed Secrets Created Successfully ==="
echo ""
echo "Generated file (safe to commit to git):"
echo "  - base/sealed-secrets.yaml"
echo ""
echo "Apply with:"
echo "  kubectl apply -f base/sealed-secrets.yaml"
echo ""
echo "Or it's already included in kustomization.yaml"
echo ""
