#!/bin/bash
# Script to deploy Budget App to Kubernetes cluster

set -e

echo "=== Deploying Budget App to Kubernetes ==="
echo ""

# Check if kubeconfig is set
if [ -z "$KUBECONFIG" ]; then
  echo "Setting KUBECONFIG to ~/.kube/config"
  export KUBECONFIG=~/.kube/config
fi

echo "Using kubeconfig: $KUBECONFIG"
echo ""

# Verify cluster connectivity
echo "Step 1: Verifying cluster connectivity..."
kubectl cluster-info
echo ""

# Check if namespace exists
if kubectl get namespace budget-app &> /dev/null; then
  echo "Namespace 'budget-app' already exists"
  read -p "Do you want to delete and recreate? (yes/no): " RECREATE
  if [ "$RECREATE" = "yes" ]; then
    echo "Deleting existing namespace..."
    kubectl delete namespace budget-app
    echo "Waiting for namespace deletion to complete..."
    sleep 10
  fi
fi

# Check if sealed secrets exist
echo ""
echo "Step 2: Checking for sealed secrets..."
if [ ! -f base/sealed-secrets.yaml ]; then
  echo "Warning: Sealed secrets not found!"
  echo "You need to generate them first by running:"
  echo "  1. ./install-sealed-secrets.sh  (one-time setup)"
  echo "  2. ./fetch-cert.sh              (fetch encryption certificate)"
  echo "  3. export GITHUB_TOKEN=your_token"
  echo "  4. ./create-secrets.sh          (generate sealed secrets)"
  echo ""
  read -p "Do you want to continue without secrets? (yes/no): " CONTINUE
  if [ "$CONTINUE" != "yes" ]; then
    echo "Aborted."
    exit 1
  fi
fi

# Apply manifests
echo ""
echo "Step 3: Applying Kubernetes manifests..."
kubectl apply -k base/

echo ""
echo "Step 3: Waiting for resources to be created (10 seconds)..."
sleep 10

# Check deployment status
echo ""
echo "Step 4: Checking deployment status..."
echo ""
echo "--- Namespaces ---"
kubectl get namespaces | grep budget-app

echo ""
echo "--- Secrets ---"
kubectl get secrets -n budget-app

echo ""
echo "--- StatefulSets ---"
kubectl get statefulsets -n budget-app

echo ""
echo "--- Deployments ---"
kubectl get deployments -n budget-app

echo ""
echo "--- Services ---"
kubectl get services -n budget-app

echo ""
echo "--- Ingress ---"
kubectl get ingress -n budget-app

echo ""
echo "--- Pods ---"
kubectl get pods -n budget-app

echo ""
echo "--- PersistentVolumeClaims ---"
kubectl get pvc -n budget-app

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "To monitor pod logs, run:"
echo "  kubectl logs -f -n budget-app -l app=backend"
echo "  kubectl logs -f -n budget-app -l app=frontend"
echo "  kubectl logs -f -n budget-app -l app=postgres"
echo "  kubectl logs -f -n budget-app -l app=redis"
echo ""
echo "To check pod status:"
echo "  kubectl get pods -n budget-app -w"
echo ""
echo "Access the application at:"
echo "  http://167.233.9.178"
