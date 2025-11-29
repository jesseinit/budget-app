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
read -p "Do you want to apply these changes? (1/0): " confirm
if [ "$confirm" != "1" ]; then
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

# Export KUBECONFIG for all subsequent kubectl commands
export KUBECONFIG=~/.kube/config

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

# Get worker count from Terraform configuration
WORKER_COUNT=$(terraform -chdir=.. output -json worker_count 2>/dev/null | jq -r '.' || echo "1")
if [ -z "$WORKER_COUNT" ] || [ "$WORKER_COUNT" = "null" ]; then
  # Fallback: count actual worker IPs
  WORKER_COUNT=$(echo "$WORKER_IPS" | wc -w | tr -d ' ')
fi

# Wait for all nodes to be in Ready state
EXPECTED_NODES=$((1 + WORKER_COUNT))  # 1 master + N workers
echo "Expecting $EXPECTED_NODES nodes (1 master + $WORKER_COUNT workers)..."

MAX_RETRIES=30
RETRY_COUNT=0
RETRY_DELAY=3

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  READY_NODES=$(kubectl get nodes --no-headers 2>/dev/null | grep -c " Ready " || echo "0")
  # Remove any whitespace/newlines from the count
  READY_NODES=$(echo "$READY_NODES" | tr -d '[:space:]')

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
# We're in iac/hetzner/scripts, so go back to project root
if [ -f "../../../k8s/base/cert-manager-issuer.yaml" ]; then
  echo "Applying ClusterIssuer configuration..."
  kubectl apply -f ../../../k8s/base/cert-manager-issuer.yaml
  echo "ClusterIssuers created successfully!"
else
  echo "Warning: cert-manager-issuer.yaml not found at k8s/base/cert-manager-issuer.yaml"
  echo "You'll need to create ClusterIssuers manually."
fi

echo ""
echo "Step 9: Deploying application manifests..."

# Deploy application using kustomize
# We're in iac/hetzner/scripts, so go back to project root
if [ -d "../../../k8s/base" ]; then
  echo "Applying kustomize manifests from k8s/base..."
  kubectl apply -k ../../../k8s/base
  echo "Application manifests deployed successfully!"

  # # Apply backed-up sealed-secrets key if it exists
  # echo ""
  # echo "Checking for backed-up sealed-secrets key..."
  # if [ -f "../../../.sealed-secrets-keys/sealed-secrets-key.yaml" ]; then
  #   echo "Found backed-up sealed-secrets key. Applying to cluster..."
  #   kubectl apply -f ../../../.sealed-secrets-keys/sealed-secrets-key.yaml

  #   echo "Restarting sealed-secrets controller to pick up the new key..."
  #   kubectl delete pod -n kube-system -l app.kubernetes.io/name=sealed-secrets

  #   echo "Waiting for sealed-secrets controller to restart..."
  #   sleep 10

  #   echo "Sealed-secrets key applied successfully. Secrets should now be decrypted."
  # else
  #   echo "No backed-up sealed-secrets key found. Using cluster-generated key."
  #   echo "Note: You'll need to re-seal your secrets with the new cluster's public key."
  # fi

  echo ""
  echo "Waiting for pods to be ready..."
  kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=budget-app -n budget-app --timeout=120s || echo "Warning: Some pods may still be starting"
else
  echo "Warning: k8s/base directory not found"
  echo "You'll need to deploy application manifests manually using: kubectl apply -k k8s/base"
fi

echo ""
echo "Step 10: Updating Cloudflare DNS records..."

# Check if Cloudflare variables are set
CLOUDFLARE_API_TOKEN=$(terraform -chdir=.. output -raw cloudflare_api_token 2>/dev/null || echo "")
CLOUDFLARE_ZONE_ID=$(terraform -chdir=.. output -raw cloudflare_zone_id 2>/dev/null || echo "")
CLOUDFLARE_DOMAIN=$(terraform -chdir=.. output -json cloudflare_domain 2>/dev/null || echo "")

if [ -n "$CLOUDFLARE_API_TOKEN" ] && [ -n "$CLOUDFLARE_ZONE_ID" ] && [ -n "$CLOUDFLARE_DOMAIN" ] && \
   [ "$CLOUDFLARE_API_TOKEN" != "null" ] && [ "$CLOUDFLARE_API_TOKEN" != "" ] && \
   [ "$CLOUDFLARE_ZONE_ID" != "null" ] && [ "$CLOUDFLARE_ZONE_ID" != "" ] && \
   [ "$CLOUDFLARE_DOMAIN" != "null" ] && [ "$CLOUDFLARE_DOMAIN" != "[]" ] && [ "$CLOUDFLARE_DOMAIN" != "" ]; then
  echo "Cloudflare configuration detected. Updating DNS records..."

  # Export variables for the update script
  export CLOUDFLARE_API_TOKEN
  export CLOUDFLARE_ZONE_ID
  export CLOUDFLARE_DOMAIN

  # Run the Cloudflare DNS update script
  if [ -f "update-cloudflare-dns.sh" ]; then
    bash update-cloudflare-dns.sh
  else
    echo "Warning: update-cloudflare-dns.sh not found. Skipping DNS update."
  fi

  # Clean up exported variables
  unset CLOUDFLARE_API_TOKEN
  unset CLOUDFLARE_ZONE_ID
  unset CLOUDFLARE_DOMAIN
else
  echo "Cloudflare configuration not provided. Skipping DNS update."
  echo "To enable automatic DNS updates, add these to your terraform.tfvars:"
  echo "  cloudflare_api_token = \"your_token\""
  echo "  cloudflare_zone_id   = \"your_zone_id\""
  echo "  cloudflare_domain    = [\"budget.yourdomain.com\", \"api.yourdomain.com\"]"
fi

echo ""
echo "=== Cluster Setup Complete! ==="
echo ""
echo "Cluster Information:"
terraform -chdir=.. output
echo ""
echo "Your kubeconfig is ready at ~/.kube/config"
echo ""
echo "Next steps:"
echo "1. In a new terminal, export KUBECONFIG: export KUBECONFIG=~/.kube/config"
echo "2. Verify nodes: kubectl get nodes"
echo "3. Check pods: kubectl get pods -n budget-app"
echo "4. Re-seal secrets with the new cluster's public key (see documentation)"
if [ -n "$CLOUDFLARE_DOMAIN" ] && [ "$CLOUDFLARE_DOMAIN" != "null" ]; then
  echo "5. Your application will be available at: https://$CLOUDFLARE_DOMAIN"
fi
echo ""
echo "To SSH into master: ssh -i $SSH_KEY root@$MASTER_IP"
echo "To SSH into workers:"
WORKER_NUM=0
for WORKER_IP in $WORKER_IPS; do
  WORKER_NUM=$((WORKER_NUM + 1))
  echo "  Worker-$WORKER_NUM: ssh -i $SSH_KEY root@$WORKER_IP"
done