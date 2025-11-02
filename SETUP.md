# Budget App - Complete Setup Guide

This guide covers the complete setup process for deploying the Budget App to a Kubernetes cluster on Hetzner Cloud.

## Prerequisites

1. **Hetzner Cloud Account** with API token
2. **SSH Key** configured in Hetzner
3. **Terraform** (v1.0+)
4. **kubectl** (latest version)
5. **kubeseal** CLI tool (for sealed secrets)

## Architecture Overview

- **Infrastructure**: Hetzner Cloud (1 master + 2 worker nodes)
- **Kubernetes**: K3s lightweight distribution
- **Ingress**: Nginx Ingress Controller (DaemonSet on all nodes with HostPort 80/443)
- **Load Balancer**: Hetzner Cloud Load Balancer forwarding to node ports
- **Secrets**: Sealed Secrets with key backup/restore for reproducibility
- **Storage**: Hetzner Cloud Volumes via CSI driver

## Directory Structure

```
.
├── iac/                        # Infrastructure as Code (Terraform)
│   ├── modules/
│   │   ├── k8s-cluster/       # K3s cluster setup
│   │   │   └── templates/     # Init scripts for master/worker nodes
│   │   ├── network/           # VPC and firewall
│   │   └── loadbalancer/      # Hetzner Load Balancer
│   └── scripts/               # Helper scripts
├── k8s/                       # Kubernetes manifests
│   ├── base/                  # Base application manifests
│   └── overlays/              # Environment-specific overlays
└── .sealed-secrets-keys/      # Sealed secrets encryption keys (gitignored)
```

## Step 1: Initial Setup

### 1.1 Configure Terraform Variables

```bash
cd iac
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:
```hcl
hcloud_token     = "your-hetzner-api-token"
ssh_public_key   = "ssh-rsa AAAA..."
project_name     = "budget-app"
```

### 1.2 Initialize Terraform

```bash
terraform init
```

## Step 2: Create the Cluster

### Option A: Automated Setup (Recommended)

```bash
cd iac/scripts
./setup-cluster.sh
```

This script will:
1. Validate Terraform configuration
2. Create infrastructure (master, workers, network, load balancer)
3. Wait for cluster to be ready
4. Fetch kubeconfig
5. Join worker nodes to the cluster

### Option B: Manual Setup

```bash
cd iac
terraform plan
terraform apply

# Wait for cluster initialization (2-3 minutes)
sleep 180

# Fetch kubeconfig
cd scripts
./get-kubeconfig.sh

# Verify cluster
export KUBECONFIG=~/.kube/config
kubectl get nodes
```

## Step 3: Verify Cluster Components

Check that all infrastructure components are running:

```bash
# Check nodes
kubectl get nodes
# Should show: budget-app-master, budget-app-worker-1, budget-app-worker-2 (all Ready)

# Check sealed-secrets controller
kubectl get pods -n kube-system -l name=sealed-secrets-controller
# Should show: Running

# Check ingress-nginx (DaemonSet on all nodes)
kubectl get pods -n ingress-nginx -o wide
# Should show 3 pods (one per node) with HostPorts 80/443

# Check Hetzner CSI driver
kubectl get pods -n kube-system -l app.kubernetes.io/name=hcloud-csi
```

## Step 4: Backup Sealed Secrets Key

**CRITICAL: Do this immediately after cluster creation!**

```bash
cd k8s
./backup-sealed-secrets-key.sh
```

This saves the encryption key to `.sealed-secrets-keys/sealed-secrets-key.yaml`. This key will be automatically restored when you recreate the cluster, making your sealed secrets work across cluster recreations.

## Step 5: Seal Your Secrets

### 5.1 Create Plaintext Secrets

Create `k8s/base/secrets.yaml` (never commit this):

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: budget-app-secrets
  namespace: budget-app
type: Opaque
stringData:
  POSTGRES_USER: "budgetuser"
  POSTGRES_PASSWORD: "your-secure-password"
  POSTGRES_DB: "budgetdb"
  DATABASE_URL: "postgresql://budgetuser:password@postgres-service:5432/budgetdb"
  REDIS_URL: "redis://redis-service:6379/0"
  SECRET_KEY: "your-secret-key"
  TRADING212_API_KEY: "your-api-key"
---
apiVersion: v1
kind: Secret
metadata:
  name: ghcr-secret
  namespace: budget-app
type: kubernetes.io/dockerconfigjson
stringData:
  .dockerconfigjson: |
    {
      "auths": {
        "ghcr.io": {
          "username": "your-github-username",
          "password": "your-github-token"
        }
      }
    }
```

### 5.2 Seal the Secrets

```bash
cd k8s

# Seal main app secrets
kubeseal --format=yaml < base/secrets.yaml > base/sealed-secrets-new.yaml

# Review and replace
mv base/sealed-secrets.yaml base/sealed-secrets.yaml.old
mv base/sealed-secrets-new.yaml base/sealed-secrets.yaml

# Extract registry secret and seal it separately
# (Split the secrets.yaml first, then seal the registry part)
```

## Step 6: Deploy the Application

```bash
cd k8s
./deploy.sh
```

Or manually:

```bash
kubectl apply -k base/
```

### 6.1 Monitor Deployment

```bash
# Watch pods
kubectl get pods -n budget-app -w

# Check logs
kubectl logs -n budget-app -l app=frontend
kubectl logs -n budget-app -l app=backend
```

## Step 7: Access the Application

The application is accessible via the load balancer IP:

```bash
# Get load balancer IP
terraform -chdir=terraform output loadbalancer_ip

# Test access
curl http://<loadbalancer-ip>
```

## Cluster Lifecycle Operations

### Recreating the Cluster

The setup is fully reproducible. Simply destroy and recreate:

```bash
cd iac/scripts
./destroy-cluster.sh

# Then create again
./setup-cluster.sh
```

**What happens automatically:**
1. Sealed-secrets key is restored from `.sealed-secrets-keys/`
2. Ingress-nginx DaemonSet is applied to all nodes
3. Worker nodes join the cluster
4. Your sealed secrets work without re-sealing

### Updating Infrastructure

```bash
cd iac
terraform plan
terraform apply
```

### Scaling Workers

Edit `iac/terraform.tfvars`:
```hcl
worker_count = 3  # Increase from 2 to 3
```

Apply changes:
```bash
terraform apply
```

## Troubleshooting

### Sealed Secrets Not Decrypting

```bash
# Check controller logs
kubectl logs -n kube-system deployment/sealed-secrets-controller

# Verify key was restored
kubectl get secret -n kube-system -l sealedsecrets.bitnami.com/sealed-secrets-key

# If key is missing, copy it manually
scp .sealed-secrets-keys/sealed-secrets-key.yaml root@<master-ip>:/root/
ssh root@<master-ip> "kubectl apply -f /root/sealed-secrets-key.yaml"
```

### Ingress Not Working

```bash
# Check DaemonSet
kubectl get daemonset -n ingress-nginx

# Verify HostPort binding
kubectl get pods -n ingress-nginx -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[0].ports[*].hostPort}{"\n"}{end}'
# Should show: 80 443 8443

# Check load balancer health
curl -v http://<loadbalancer-ip>
```

### Worker Nodes Not Joining

```bash
# Check worker logs
ssh root@<worker-ip> "journalctl -u k3s-agent -n 50"

# Manually rejoin worker
K3S_TOKEN=$(ssh root@<master-ip> "cat /var/lib/rancher/k3s/server/node-token")
ssh root@<worker-ip> "curl -sfL https://get.k3s.io | K3S_URL=https://10.0.0.2:6443 K3S_TOKEN='${K3S_TOKEN}' sh -"
```

## Security Best Practices

1. **Never commit** `.sealed-secrets-keys/` to git (already in .gitignore)
2. **Never commit** `k8s/base/secrets.yaml` (already in .gitignore)
3. **Backup** `.sealed-secrets-keys/` to a secure location (password manager, encrypted backup)
4. **Rotate** sealed-secrets keys periodically
5. **Review** firewall rules in `iac/modules/network/`

## Maintenance

### Backup Sealed Secrets Key

```bash
cd k8s
./backup-sealed-secrets-key.sh
```

### Update Application

```bash
# Update image tags in k8s/base/*-deployment.yaml
# Then apply
kubectl apply -k k8s/base/

# Or use rolling update
kubectl set image deployment/frontend -n budget-app frontend=ghcr.io/user/app:v2
```

### View Cluster Info

```bash
# Get all Terraform outputs
terraform -chdir=terraform output

# SSH to master
ssh root@$(terraform -chdir=terraform output -raw master_ip)

# SSH to workers
ssh root@$(terraform -chdir=terraform output -json worker_ips | jq -r '.[0]')
```

## Cost Optimization

Current setup costs approximately:
- Master node (CX21): ~€5/month
- Worker nodes (2x CX21): ~€10/month
- Load balancer (LB11): ~€5/month
- **Total: ~€20/month**

To reduce costs:
- Use smaller instance types (CX11)
- Reduce worker count to 1
- Use shared CPU instances
