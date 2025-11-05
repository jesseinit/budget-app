# Budget App - Kubernetes Infrastructure on Hetzner Cloud

This Terraform configuration provisions a production-ready Kubernetes cluster on Hetzner Cloud for the Budget App.

## Architecture

- **1 Master Node**: k3s control plane (CPX21: 3 vCPU, 4GB RAM)
- **1 Worker Node**: k3s agent for workloads (CPX21: 3 vCPU, 4GB RAM)
- **Private Network**: 10.0.0.0/16 for secure inter-node communication
- **Load Balancer**: Hetzner LB11 for ingress traffic
- **Storage**: Hetzner CSI driver for dynamic volume provisioning
- **Ingress**: Nginx Ingress Controller

## Prerequisites

1. **Hetzner Cloud Account**
   - Sign up at https://console.hetzner.cloud
   - Create a project
   - Generate an API token (Read & Write permissions)

2. **Required Tools**
   ```bash
   # Terraform
   brew install terraform

   # kubectl
   brew install kubectl

   # hcloud CLI (optional, for debugging)
   brew install hcloud
   ```

3. **SSH Key Pair**
   ```bash
   # Generate if you don't have one
   ssh-keygen -t rsa -b 4096 -C "your_email@example.com"

   # Get your public key
   cat ~/.ssh/id_rsa.pub
   ```

## Quick Start

### 1. Configure Variables

```bash
# Copy example file
cp terraform.tfvars.example terraform.tfvars

# Edit with your values
vim terraform.tfvars
```

Required variables:
- `hcloud_token`: Your Hetzner Cloud API token
- `ssh_public_key`: Your SSH public key
- `admin_ip`: Your IP address for SSH access (find with `curl ifconfig.me`)

### 2. Initialize Terraform

```bash
terraform init
```

### 3. Deploy Cluster

**Option A: Using the setup script (recommended)**
```bash
cd scripts
./setup-cluster.sh
```

**Option B: Manual deployment**
```bash
# Validate configuration
terraform validate

# Preview changes
terraform plan

# Apply changes
terraform apply

# Wait for cluster to be ready (2-3 minutes)
sleep 120

# Fetch kubeconfig
cd scripts
./get-kubeconfig.sh
```

### 4. Verify Cluster

```bash
# Set kubeconfig
export KUBECONFIG=~/.kube/config-budget

# Check nodes
kubectl get nodes

# Expected output:
# NAME              STATUS   ROLES                  AGE   VERSION
# budget-app-master Ready    control-plane,master   5m    v1.28.x+k3s1
# budget-app-worker Ready    <none>                 4m    v1.28.x+k3s1

# Check all pods
kubectl get pods -A

# Check storage class
kubectl get storageclass
```

## Accessing the Cluster

### SSH Access

```bash
# Master node
./scripts/ssh-master.sh
# Or: ssh root@$(terraform output -raw master_ip)

# Worker node
./scripts/ssh-worker.sh
# Or: ssh root@$(terraform output -raw worker_ip)
```

### Kubernetes API

```bash
# Using kubeconfig
export KUBECONFIG=~/.kube/config-budget
kubectl get nodes

# Or specify kubeconfig explicitly
kubectl --kubeconfig=~/.kube/config-budget get nodes
```

## Deploying Applications

Once the cluster is ready, you can deploy your Budget App:

```bash
# Create namespace
kubectl create namespace budget-app

# Apply k8s manifests (create these separately)
kubectl apply -f ../k8s/base/ -n budget-app

# Check deployment
kubectl get pods -n budget-app
```

## Infrastructure Details

### Network Configuration

- **Private Network**: 10.0.0.0/16
  - Master: 10.0.0.2
  - Worker: 10.0.0.3
- **Pod Network**: 10.42.0.0/16 (Flannel CNI)
- **Service Network**: 10.43.0.0/16

### Firewall Rules

| Port       | Protocol | Source        | Purpose                |
|------------|----------|---------------|------------------------|
| 22         | TCP      | Admin IP      | SSH access             |
| 6443       | TCP      | Admin IP      | Kubernetes API         |
| 80, 443    | TCP      | 0.0.0.0/0     | HTTP/HTTPS traffic     |
| 10250      | TCP      | Private net   | Kubelet API            |
| 2379-2380  | TCP      | Private net   | etcd                   |
| 8472       | UDP      | Private net   | Flannel VXLAN          |
| 30000-32767| TCP      | 0.0.0.0/0     | NodePort services      |

### Installed Components

- **k3s**: Lightweight Kubernetes distribution
- **Hetzner CSI Driver**: Dynamic volume provisioning
- **Nginx Ingress Controller**: HTTP routing
- **Default Storage Class**: hcloud-volumes (Retain policy)

## Cost Estimate

| Resource              | Type   | Monthly Cost |
|-----------------------|--------|--------------|
| Master Node           | CPX21  | ~€7          |
| Worker Node           | CPX21  | ~€7          |
| Load Balancer         | LB11   | ~€5.39       |
| Volumes (30GB est.)   | Volume | ~€3          |
| **Total**             |        | **~€22-23**  |

*Prices as of 2025. Check current pricing at https://www.hetzner.com/cloud*

## Useful Commands

```bash
# Get cluster info
terraform output

# Get load balancer IP
terraform output loadbalancer_ip

# Check k3s status on master
ssh root@$(terraform output -raw master_ip) "systemctl status k3s"

# View k3s logs
ssh root@$(terraform output -raw master_ip) "journalctl -u k3s -f"

# List all resources in Hetzner
hcloud server list
hcloud network list
hcloud load-balancer list
```

## Maintenance

### Scaling Workers

To add more workers, modify `terraform/modules/k8s-cluster/main.tf` to create additional worker resources.

### Upgrading k3s

```bash
# SSH to each node and run:
curl -sfL https://get.k3s.io | sh -

# Or use k3s-upgrade controller:
# https://github.com/rancher/system-upgrade-controller
```

### Backups

**Volume Snapshots:**
```bash
# Via hcloud CLI
hcloud volume list
hcloud volume create-snapshot <volume-id> --description "backup-$(date +%Y%m%d)"
```

**etcd Snapshots:**
```bash
# k3s automatically creates snapshots in /var/lib/rancher/k3s/server/db/snapshots/
ssh root@$(terraform output -raw master_ip) "ls -lh /var/lib/rancher/k3s/server/db/snapshots/"
```

## Troubleshooting

### Nodes not joining

```bash
# Check k3s status on master
ssh root@MASTER_IP "systemctl status k3s"

# Check k3s agent on worker
ssh root@WORKER_IP "systemctl status k3s-agent"

# View logs
ssh root@MASTER_IP "journalctl -u k3s -n 100"
```

### Storage issues

```bash
# Check CSI driver
kubectl get pods -n kube-system | grep csi

# Check hcloud secret
kubectl get secret hcloud -n kube-system

# Describe PVC
kubectl describe pvc <pvc-name> -n <namespace>
```

### Network issues

```bash
# Check firewall rules
hcloud firewall describe budget-app-firewall

# Test connectivity
ssh root@MASTER_IP "ping -c 3 10.0.0.3"
```

## Cleanup

### Destroy Entire Cluster

```bash
# Using script
cd scripts
./destroy-cluster.sh

# Or manually
terraform destroy

# Clean up kubeconfig
rm ~/.kube/config-budget
```

**Warning**: This will delete all resources and data. Make sure you have backups!

## Security Best Practices

1. **Restrict SSH Access**: Set `admin_ip` to your specific IP, not `0.0.0.0/0`
2. **Rotate Credentials**: Regularly rotate Hetzner API tokens
3. **Enable SSL**: Use cert-manager for automatic SSL certificates
4. **Network Policies**: Implement Kubernetes network policies
5. **RBAC**: Use role-based access control for kubectl access
6. **Secrets**: Use sealed-secrets or external-secrets for sensitive data

## Next Steps

1. Deploy the Budget App using Kubernetes manifests (see `/k8s` directory)
2. Set up DNS pointing to the load balancer IP
3. Configure SSL with cert-manager
4. Set up monitoring with Prometheus/Grafana
5. Configure automated backups

## Support

- Hetzner Cloud Docs: https://docs.hetzner.com/cloud/
- k3s Documentation: https://docs.k3s.io/
- Terraform Hetzner Provider: https://registry.terraform.io/providers/hetznercloud/hcloud/

## License

This infrastructure code is part of the Budget App project.
