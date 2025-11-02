#!/bin/bash
# Complete cluster setup script

set -e

echo "=== Budget App Kubernetes Cluster Setup ==="
echo ""

# Check if terraform is initialized
if [ ! -d "../.terraform" ]; then
  echo "Error: Terraform not initialized. Run 'terraform init' first."
  exit 1
fi

# Check if terraform.tfvars exists
if [ ! -f "../terraform.tfvars" ]; then
  echo "Error: terraform.tfvars not found."
  echo "Copy terraform.tfvars.example to terraform.tfvars and fill in your values."
  exit 1
fi

echo "Step 1: Validating Terraform configuration..."
cd ..
terraform validate
if [ $? -ne 0 ]; then
  echo "Error: Terraform validation failed"
  exit 1
fi

echo ""
echo "Step 2: Planning infrastructure changes..."
terraform plan -out=tfplan

echo ""
read -p "Do you want to apply these changes? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
  echo "Aborted."
  exit 0
fi

echo ""
echo "Step 3: Creating infrastructure..."
terraform apply tfplan
rm -f tfplan

echo ""
echo "Step 4: Waiting for cluster to be ready..."

# Get master IP
MASTER_IP=$(terraform -chdir=. output -raw master_ip)

# Determine which SSH key to use
if [ -f ~/.ssh/hetzner_rsa ]; then
  SSH_KEY=~/.ssh/hetzner_rsa
else
  SSH_KEY=~/.ssh/id_rsa
fi

# Wait for k3s to be ready on master node
MAX_RETRIES=40
RETRY_COUNT=0
RETRY_DELAY=5

echo "Checking k3s cluster readiness..."
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if ssh -i $SSH_KEY -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
      root@$MASTER_IP "kubectl get nodes >/dev/null 2>&1"; then
    echo "Cluster is ready!"
    break
  fi

  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
    echo "Cluster not ready yet, retrying in $RETRY_DELAY seconds... (attempt $RETRY_COUNT/$MAX_RETRIES)"
    sleep $RETRY_DELAY
  else
    echo "ERROR: Cluster failed to become ready after $((MAX_RETRIES * RETRY_DELAY)) seconds"
    exit 1
  fi
done

echo ""
echo "Step 5: Fetching kubeconfig..."
cd scripts
bash get-kubeconfig.sh

echo ""
echo "Step 6: Joining worker nodes to the cluster..."

# Get master IP and worker IPs (we're already in scripts directory)
MASTER_IP=$(terraform -chdir=.. output -raw master_ip)
WORKER_IPS=$(terraform -chdir=.. output -json worker_ips | jq -r '.[]')

if [ -z "$MASTER_IP" ]; then
  echo "Error: Could not get master IP from terraform output"
  exit 1
fi

# Determine which SSH key to use
if [ -f ~/.ssh/hetzner_rsa ]; then
  SSH_KEY=~/.ssh/hetzner_rsa
else
  SSH_KEY=~/.ssh/id_rsa
fi

# Remove old host keys
ssh-keygen -R $MASTER_IP 2>/dev/null || true
for WORKER_IP in $WORKER_IPS; do
  ssh-keygen -R $WORKER_IP 2>/dev/null || true
done

# Get k3s token from master
echo "Fetching k3s token from master node..."
K3S_TOKEN=$(ssh -i $SSH_KEY -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@$MASTER_IP "cat /var/lib/rancher/k3s/server/node-token")

if [ -z "$K3S_TOKEN" ]; then
  echo "Error: Failed to get k3s token from master"
  exit 1
fi

# Join each worker to the cluster
WORKER_NUM=0
for WORKER_IP in $WORKER_IPS; do
  WORKER_NUM=$((WORKER_NUM + 1))
  WORKER_PRIVATE_IP="10.0.0.$((2 + WORKER_NUM))"

  echo ""
  echo "Joining worker-$WORKER_NUM ($WORKER_IP) to cluster..."

  # Check if k3s-agent is already running
  AGENT_STATUS=$(ssh -i $SSH_KEY -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@$WORKER_IP "systemctl is-active k3s-agent 2>/dev/null || echo 'inactive'")

  if [ "$AGENT_STATUS" = "active" ]; then
    echo "k3s-agent is already running on worker-$WORKER_NUM, skipping..."
    continue
  fi

  # Install k3s agent on worker with Flannel interface configuration
  # --flannel-iface=enp7s0: Force Flannel to use the private network interface for VXLAN tunnels
  ssh -i $SSH_KEY -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@$WORKER_IP "curl -sfL https://get.k3s.io | K3S_URL=https://10.0.0.2:6443 K3S_TOKEN=$K3S_TOKEN INSTALL_K3S_EXEC='agent --node-ip=$WORKER_PRIVATE_IP --flannel-iface=enp7s0' sh -"

  echo "Worker-$WORKER_NUM joined successfully"
done

echo ""
echo "Waiting for all worker nodes to be ready..."

# Wait for all nodes to be in Ready state
EXPECTED_NODES=3  # 1 master + 2 workers
MAX_RETRIES=30
RETRY_COUNT=0
RETRY_DELAY=3

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  READY_NODES=$(kubectl get nodes --no-headers 2>/dev/null | grep -c " Ready " || echo "0")

  if [ "$READY_NODES" -ge "$EXPECTED_NODES" ]; then
    echo "All $EXPECTED_NODES nodes are ready!"
    kubectl get nodes
    break
  fi

  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
    echo "Waiting for nodes to be ready... ($READY_NODES/$EXPECTED_NODES ready, attempt $RETRY_COUNT/$MAX_RETRIES)"
    sleep $RETRY_DELAY
  else
    echo "Warning: Not all nodes became ready in time. Current status:"
    kubectl get nodes || true
    echo "Continuing anyway..."
  fi
done

echo ""
echo "Step 7: Installing cert-manager with Helm..."

# Check if helm is installed on master node
echo "Checking Helm installation on master node..."
HELM_INSTALLED=$(ssh -i $SSH_KEY -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@$MASTER_IP "command -v helm >/dev/null 2>&1 && echo 'yes' || echo 'no'")

if [ "$HELM_INSTALLED" = "no" ]; then
  echo "Installing Helm on master node..."
  ssh -i $SSH_KEY -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@$MASTER_IP "curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash"
fi

# Install cert-manager using Helm
echo "Installing cert-manager..."
ssh -i $SSH_KEY -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@$MASTER_IP << 'EOF'
  # Set kubeconfig for kubectl and helm
  export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

  # Add Jetstack Helm repository
  helm repo add jetstack https://charts.jetstack.io --force-update

  # Update Helm repositories
  helm repo update

  # Install cert-manager CRDs
  kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.19.1/cert-manager.crds.yaml

  # Create cert-manager namespace if it doesn't exist
  kubectl create namespace cert-manager --dry-run=client -o yaml | kubectl apply -f -

  # Install cert-manager with Helm
  helm upgrade --install cert-manager jetstack/cert-manager \
    --namespace cert-manager \
    --version v1.19.1 \
    --wait

  echo "Waiting for cert-manager to be ready..."
  kubectl wait --for=condition=ready pod -l app.kubernetes.io/instance=cert-manager -n cert-manager --timeout=120s
EOF

echo "cert-manager installed successfully!"

echo ""
echo "Step 8: Creating Let's Encrypt ClusterIssuers..."

# Apply ClusterIssuer from local k8s manifests
if [ -f "../../k8s/base/cert-manager-issuer.yaml" ]; then
  echo "Applying ClusterIssuer configuration..."
  kubectl apply -f ../../k8s/base/cert-manager-issuer.yaml
  echo "ClusterIssuers created successfully!"
else
  echo "Warning: cert-manager-issuer.yaml not found at k8s/base/cert-manager-issuer.yaml"
  echo "You'll need to create ClusterIssuers manually."
fi

echo ""
echo "Step 9: Deploying application manifests..."

# Deploy application using kustomize
if [ -d "../../k8s/base" ]; then
  echo "Applying kustomize manifests from k8s/base..."
  kubectl apply -k ../../k8s/base
  echo "Application manifests deployed successfully!"

  echo ""
  echo "Waiting for pods to be ready..."
  kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=budget-app -n budget-app --timeout=120s || echo "Warning: Some pods may still be starting"
else
  echo "Warning: k8s/base directory not found"
  echo "You'll need to deploy application manifests manually using: kubectl apply -k k8s/base"
fi

echo ""
echo "=== Cluster Setup Complete! ==="
echo ""
echo "Cluster Information:"
terraform -chdir=.. output
echo ""
echo "Next steps:"
echo "1. Set KUBECONFIG: export KUBECONFIG=~/.kube/config"
echo "2. Verify nodes: kubectl get nodes"
echo "3. Deploy your application using k8s manifests"
echo ""
echo "To SSH into master: ssh -i $SSH_KEY root@$MASTER_IP"
echo "To SSH into workers:"
WORKER_NUM=0
for WORKER_IP in $WORKER_IPS; do
  WORKER_NUM=$((WORKER_NUM + 1))
  echo "  Worker-$WORKER_NUM: ssh -i $SSH_KEY root@$WORKER_IP"
done