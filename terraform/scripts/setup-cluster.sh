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
echo "Step 4: Waiting for cluster to be ready (this may take 2-3 minutes)..."
sleep 120

echo ""
echo "Step 5: Fetching kubeconfig..."
cd scripts
bash get-kubeconfig.sh

echo ""
echo "=== Cluster Setup Complete! ==="
echo ""
echo "Cluster Information:"
terraform -chdir=.. output
echo ""
echo "Next steps:"
echo "1. Set KUBECONFIG: export KUBECONFIG=~/.kube/config-budget"
echo "2. Verify nodes: kubectl get nodes"
echo "3. Deploy your application using k8s manifests"
echo ""
echo "To SSH into master: ssh root@$(terraform -chdir=.. output -raw master_ip)"
echo "To SSH into worker: ssh root@$(terraform -chdir=.. output -raw worker_ip)"
