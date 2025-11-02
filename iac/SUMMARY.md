# Terraform Infrastructure - Summary

## What Has Been Created

This Terraform configuration provisions a complete Kubernetes infrastructure on Hetzner Cloud for your Budget App.

### Directory Structure

```
terraform/
├── main.tf                      # Root module, orchestrates all sub-modules
├── variables.tf                 # Input variables
├── outputs.tf                   # Output values (IPs, connection info)
├── terraform.tfvars.example     # Example configuration file
├── .gitignore                   # Git ignore rules
├── README.md                    # Complete documentation
│
├── modules/
│   ├── network/                 # Network module
│   │   ├── main.tf             # Creates VPC, subnet, firewall
│   │   ├── variables.tf
│   │   └── outputs.tf
│   │
│   ├── k8s-cluster/            # Cluster module
│   │   ├── main.tf             # Creates master + worker nodes
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── templates/
│   │       ├── master-init.sh  # k3s server setup script
│   │       └── worker-init.sh  # k3s agent setup script
│   │
│   └── loadbalancer/           # Load balancer module
│       ├── main.tf             # Creates Hetzner LB
│       ├── variables.tf
│       └── outputs.tf
│
└── scripts/                     # Helper scripts
    ├── setup-cluster.sh        # Complete cluster deployment
    ├── get-kubeconfig.sh       # Fetch kubeconfig from master
    ├── destroy-cluster.sh      # Destroy entire cluster
    ├── ssh-master.sh           # Quick SSH to master
    └── ssh-worker.sh           # Quick SSH to worker
```

### Infrastructure Components

#### 1. Network Module (`modules/network/`)

**Creates:**
- Private network (10.0.0.0/16) for secure cluster communication
- Subnet in the eu-central zone
- Firewall with rules for:
  - SSH (port 22) from your IP
  - Kubernetes API (port 6443) from your IP
  - HTTP/HTTPS (ports 80/443) from anywhere
  - Internal cluster ports (10250, 2379-2380, 8472)
  - NodePort range (30000-32767)

**Security:**
- Restricts admin access to your IP only
- Allows public HTTP/HTTPS for ingress
- Permits internal cluster communication on private network

#### 2. K8s Cluster Module (`modules/k8s-cluster/`)

**Creates:**
- **Master Node** (CPX21):
  - Runs k3s server (control plane)
  - IP: 10.0.0.2 (private)
  - Installs Hetzner CSI driver automatically
  - Installs Nginx Ingress Controller
  - Creates default storage class
  - Saves k3s token for worker to join

- **Worker Node** (CPX21):
  - Runs k3s agent
  - IP: 10.0.0.3 (private)
  - Automatically joins cluster using token from master
  - Runs application workloads

**Cloud-init Scripts:**
- `master-init.sh`: Sets up k3s server, CSI driver, ingress
- `worker-init.sh`: Joins worker to cluster

**Features:**
- Automatic k3s installation
- Swap configured (2GB) for stability
- Hetzner CSI driver for dynamic volumes
- Storage class with Retain policy
- Nginx Ingress for HTTP routing

#### 3. Load Balancer Module (`modules/loadbalancer/`)

**Creates:**
- Hetzner LB11 load balancer
- HTTP service (port 80) with health checks
- HTTPS service (port 443)
- Targets both master and worker nodes
- Attached to private network

**Health Checks:**
- HTTP on port 80
- Interval: 10s
- Timeout: 5s
- Retries: 3

### Helper Scripts

#### `setup-cluster.sh`
Complete automated deployment:
1. Validates Terraform config
2. Plans infrastructure changes
3. Applies changes after confirmation
4. Waits for cluster initialization
5. Fetches kubeconfig
6. Displays cluster info

#### `get-kubeconfig.sh`
- Fetches kubeconfig from master node
- Saves to `~/.kube/config`
- Updates server IP for remote access
- Provides usage instructions

#### `destroy-cluster.sh`
- Safely destroys entire cluster
- Requires typing "destroy" to confirm
- Removes all Hetzner resources

#### `ssh-master.sh` / `ssh-worker.sh`
- Quick SSH access to nodes
- Automatically gets IP from Terraform output

## How to Use

### Initial Setup

1. **Configure variables:**
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   vim terraform.tfvars
   ```

2. **Deploy infrastructure:**
   ```bash
   terraform init
   cd scripts
   ./setup-cluster.sh
   ```

3. **Access cluster:**
   ```bash
   export KUBECONFIG=~/.kube/config-budget
   kubectl get nodes
   ```

### Daily Operations

```bash
# View cluster info
terraform output

# SSH to master
./scripts/ssh-master.sh

# Update infrastructure
terraform plan
terraform apply

# Destroy cluster
./scripts/destroy-cluster.sh
```

## What Gets Provisioned

When you run `terraform apply`, this happens:

1. **Network Resources** (~30 seconds)
   - Private network created
   - Subnet allocated
   - Firewall rules configured

2. **Compute Resources** (~2 minutes)
   - Master server created
   - Worker server created
   - SSH keys uploaded
   - Cloud-init scripts run

3. **Load Balancer** (~1 minute)
   - LB created
   - Services configured
   - Health checks enabled
   - Servers added as targets

4. **Kubernetes Setup** (automatic via cloud-init, ~2-3 minutes)
   - k3s installed on master
   - k3s agent installed on worker
   - CSI driver deployed
   - Ingress controller deployed
   - Storage class created

**Total time**: ~5-7 minutes from `terraform apply` to ready cluster

## What's Included

### Pre-installed on Cluster

- ✅ k3s (Kubernetes 1.28+)
- ✅ Hetzner CSI Driver (for persistent volumes)
- ✅ Nginx Ingress Controller (for HTTP routing)
- ✅ Default StorageClass (hcloud-volumes)
- ✅ Flannel CNI (for pod networking)

### What You Need to Add

- ⬜ Application deployments (your Budget App)
- ⬜ cert-manager (for SSL certificates)
- ⬜ Monitoring (Prometheus/Grafana)
- ⬜ Backup solution (Velero)
- ⬜ GitOps (ArgoCD/Flux)

## Cost Breakdown

| Resource        | Type  | Monthly |
|----------------|-------|---------|
| Master Node    | CPX21 | €7.00   |
| Worker Node    | CPX21 | €7.00   |
| Load Balancer  | LB11  | €5.39   |
| Volumes (est.) | 30GB  | €3.00   |
| **Total**      |       | **€22.39** |

## Outputs

After deployment, you'll get:

```bash
terraform output

# Example output:
master_ip = "65.108.123.45"
worker_ip = "65.108.123.46"
master_private_ip = "10.0.0.2"
worker_private_ip = "10.0.0.3"
loadbalancer_ip = "65.108.123.47"
network_id = "1234567"
kubeconfig_command = "scp root@65.108.123.45:/etc/rancher/k3s/k3s.yaml ..."
ssh_master = "ssh root@65.108.123.45"
ssh_worker = "ssh root@65.108.123.46"
```

## Next Steps

1. **Deploy your application:**
   - Create Kubernetes manifests in `/k8s` directory
   - Apply with `kubectl apply`

2. **Configure DNS:**
   - Point your domain to the load balancer IP
   - Use A record: `budget.yourdomain.com -> loadbalancer_ip`

3. **Set up SSL:**
   - Install cert-manager
   - Create ClusterIssuer for Let's Encrypt
   - Add TLS to Ingress resource

4. **Add monitoring:**
   - Deploy Prometheus + Grafana
   - Set up alerts

5. **Configure backups:**
   - Set up Velero
   - Schedule daily backups

## Important Files

- **terraform.tfvars**: Your configuration (DO NOT commit to git!)
- **terraform.tfstate**: Current state (DO NOT delete!)
- **~/.kube/config-budget**: Kubeconfig for cluster access

## Security Notes

- The `.gitignore` is configured to exclude sensitive files
- Never commit `terraform.tfvars` to version control
- Keep your Hetzner API token secure
- Restrict `admin_ip` to your specific IP address
- Regularly rotate credentials

## Support

For detailed documentation, see:
- [README.md](./README.md) - Complete infrastructure documentation
- [../DEPLOYMENT.md](../DEPLOYMENT.md) - Full deployment guide

---

**Ready to deploy?** Run `./scripts/setup-cluster.sh` to get started!
