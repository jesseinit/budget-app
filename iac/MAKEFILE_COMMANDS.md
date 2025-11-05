# Makefile Quick Reference

This document provides a quick reference for all available Makefile commands for managing the Budget App infrastructure.

## Quick Start

```bash
# View all available commands
make help

# Local development
make kind-setup
export KUBECONFIG=~/.kube/config-budget-local
kubectl get nodes

# Cloud production
make hetzner-setup
export KUBECONFIG=~/.kube/config-budget
kubectl get nodes
```

## Local Development (Kind)

| Command | Description |
|---------|-------------|
| `make kind-setup` | Create local Kind cluster with 2 nodes, Nginx Ingress, and metrics-server |
| `make kind-destroy` | Destroy the local Kind cluster |
| `make kind-kubeconfig` | Export kubeconfig for Kind cluster |
| `make kind-load-images` | Load local Docker images into Kind cluster |
| `make kind-status` | Show Kind cluster status and running pods |

### Example Workflow (Local)

```bash
# 1. Create cluster
make kind-setup

# 2. Set kubeconfig
export KUBECONFIG=~/.kube/config-budget-local

# 3. Build local images
docker build -t budget-app-api:local ./apps/api
docker build -t budget-app-web:local ./apps/web

# 4. Load images into cluster
make kind-load-images

# 5. Deploy application
make deploy-kind

# 6. Check status
make kind-status

# 7. Access application
curl http://localhost
```

## Cloud Production (Hetzner)

| Command | Description |
|---------|-------------|
| `make hetzner-setup` | Create Kubernetes cluster on Hetzner Cloud |
| `make hetzner-destroy` | Destroy Hetzner Cloud cluster (with confirmation) |
| `make hetzner-kubeconfig` | Fetch kubeconfig from Hetzner cluster |
| `make hetzner-ssh-master` | SSH into the Hetzner master node |
| `make hetzner-ssh-worker` | SSH into a Hetzner worker node |

### Example Workflow (Hetzner)

```bash
# 1. Initialize Terraform
make tf-init

# 2. Plan infrastructure
make tf-plan

# 3. Create cluster
make hetzner-setup
# Or manually: make tf-apply

# 4. Set kubeconfig
export KUBECONFIG=~/.kube/config-budget

# 5. Deploy application
make deploy-hetzner

# 6. SSH to master (if needed)
make hetzner-ssh-master

# 7. Destroy when done (careful!)
make hetzner-destroy
```

## Deployment Commands

| Command | Description |
|---------|-------------|
| `make deploy` | Deploy to current kubectl context (with confirmation) |
| `make deploy-kind` | Deploy specifically to Kind cluster |
| `make deploy-hetzner` | Deploy specifically to Hetzner cluster |

## Switching Contexts

| Command | Description |
|---------|-------------|
| `make switch-kind` | Show command to switch to Kind cluster |
| `make switch-hetzner` | Show command to switch to Hetzner cluster |

```bash
# Switch to Kind
export KUBECONFIG=~/.kube/config-budget-local

# Switch to Hetzner
export KUBECONFIG=~/.kube/config-budget

# Or use kubectl contexts
kubectl config use-context kind-budget-app-local
kubectl config use-context <hetzner-context>
```

## Terraform Commands

| Command | Description |
|---------|-------------|
| `make tf-init` | Initialize Terraform for Hetzner |
| `make tf-plan` | Run Terraform plan |
| `make tf-apply` | Apply Terraform changes |
| `make tf-destroy` | Destroy infrastructure with Terraform (with confirmation) |

## Build Commands

| Command | Description |
|---------|-------------|
| `make build-client` | Build and push client Docker image to registry |
| `make build-api` | Build and push API Docker image to registry |
| `make build-all` | Build and push all Docker images |

## Utility Commands

| Command | Description |
|---------|-------------|
| `make cleanup-volumes` | Clean up orphaned Hetzner volumes (interactive) |
| `make cleanup-volumes-auto` | Auto clean up orphaned volumes (no confirmation) |
| `make backup-sealed-secrets` | Backup sealed-secrets encryption key |
| `make clean` | Clean up local kubeconfig and Terraform state backups |

## Legacy Commands (Deprecated)

These commands still work but redirect to the new `hetzner-*` equivalents:

| Old Command | New Command |
|-------------|-------------|
| `make setup-cluster` | `make hetzner-setup` |
| `make destroy-cluster` | `make hetzner-destroy` |
| `make get-kubeconfig` | `make hetzner-kubeconfig` |
| `make ssh-master` | `make hetzner-ssh-master` |
| `make ssh-worker` | `make hetzner-ssh-worker` |

## Common Workflows

### 1. Test Locally, Deploy to Production

```bash
# Develop locally
make kind-setup
export KUBECONFIG=~/.kube/config-budget-local
make deploy-kind

# Test your changes
curl http://localhost/api/health

# Deploy to production
export KUBECONFIG=~/.kube/config-budget
make deploy-hetzner
```

### 2. Debug Production Issues Locally

```bash
# Get production config
make hetzner-kubeconfig
export KUBECONFIG=~/.kube/config-budget
kubectl get all -n budget-app -o yaml > prod-state.yaml

# Reproduce locally
make kind-setup
export KUBECONFIG=~/.kube/config-budget-local
kubectl apply -f prod-state.yaml

# Debug locally
make kind-status
kubectl logs -n budget-app <pod-name>
```

### 3. Build and Deploy New Version

```bash
# Build and push images
make build-all

# Deploy to Kind first
export KUBECONFIG=~/.kube/config-budget-local
make deploy-kind

# Test
curl http://localhost

# Deploy to Hetzner
export KUBECONFIG=~/.kube/config-budget
make deploy-hetzner
```

### 4. Clean Slate

```bash
# Destroy everything
make kind-destroy
make hetzner-destroy

# Clean local files
make clean

# Start fresh
make kind-setup
make hetzner-setup
```

## Environment Variables

The Makefile uses these environment variables:

```bash
# Kubeconfig locations
KUBECONFIG_KIND=~/.kube/config-budget-local
KUBECONFIG_HETZNER=~/.kube/config-budget

# Directory paths
IAC_DIR=iac
HETZNER_DIR=iac/hetzner
KIND_DIR=iac/kind
```

## Tips and Tricks

### Use Environment-Specific Kubeconfig

```bash
# Always use the right kubeconfig
alias k-local='kubectl --kubeconfig=~/.kube/config-budget-local'
alias k-prod='kubectl --kubeconfig=~/.kube/config-budget'

# Now you can safely run commands
k-local get pods -A
k-prod get pods -A
```

### Parallel Development

```bash
# Terminal 1: Local development
export KUBECONFIG=~/.kube/config-budget-local
kubectl get pods -A -w

# Terminal 2: Production monitoring
export KUBECONFIG=~/.kube/config-budget
kubectl get pods -A -w
```

### Safety Checks

Before deploying, always verify your context:

```bash
# Check current context
kubectl config current-context

# Verify you're on the right cluster
kubectl get nodes

# Then deploy
make deploy
```

## Troubleshooting

### Command Not Found

```bash
# Make sure you're in the project root
cd /path/to/budget-app

# Run make commands
make help
```

### Permission Denied

```bash
# Ensure scripts are executable
chmod +x iac/kind/scripts/*.sh
chmod +x iac/hetzner/scripts/*.sh
```

### Wrong Cluster

```bash
# Always check your kubeconfig
echo $KUBECONFIG
kubectl config current-context

# Switch if needed
export KUBECONFIG=~/.kube/config-budget-local
# or
export KUBECONFIG=~/.kube/config-budget
```

### Kind Cluster Issues

```bash
# Check Docker is running
docker info

# Recreate cluster
make kind-destroy
make kind-setup
```

### Hetzner Cluster Issues

```bash
# Re-fetch kubeconfig
make hetzner-kubeconfig

# SSH to master for debugging
make hetzner-ssh-master
```

## Related Documentation

- [IAC Overview](README.md)
- [Kind Setup Guide](kind/README.md)
- [Hetzner Setup Guide](hetzner/README.md)
- [Kubernetes Manifests](../k8s/README.md)
