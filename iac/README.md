# Budget App - Infrastructure as Code

This directory contains infrastructure configurations for deploying the Budget App in different environments.

## Directory Structure

```
iac/
├── hetzner/          # Production/staging deployment on Hetzner Cloud
│   ├── main.tf       # Terraform main configuration
│   ├── variables.tf  # Terraform variables
│   ├── outputs.tf    # Terraform outputs
│   ├── modules/      # Terraform modules (network, k8s-cluster, loadbalancer)
│   ├── scripts/      # Helper scripts for cluster management
│   └── README.md     # Hetzner-specific documentation
│
├── kind/             # Local development with Kind (Kubernetes in Docker)
│   ├── kind-config.yaml       # Kind cluster configuration
│   ├── scripts/               # Setup and management scripts
│   │   ├── setup-cluster.sh   # Create and configure local cluster
│   │   └── destroy-cluster.sh # Destroy local cluster
│   └── README.md              # Kind-specific documentation
│
└── README.md         # This file
```

## Environments

### 🏠 Local Development (Kind)

**Use Case**: Local development, testing, and experimentation

- **Location**: Your local machine
- **Cost**: Free (uses Docker)
- **Setup Time**: ~2 minutes
- **Resources**: 2 nodes (1 control-plane + 1 worker)
- **Storage**: Local Docker volumes
- **Access**: localhost:6080/6443
- **Secrets**: Sealed-secrets via Helm (auto-configured)

**Quick Start:**
```bash
cd kind/scripts
./setup-cluster.sh
export KUBECONFIG=~/.kube/config-budget-local
kubectl get nodes
```

**Documentation**: [kind/README.md](kind/README.md)

---

### ☁️ Cloud Production (Hetzner)

**Use Case**: Production, staging, and production-like testing

- **Location**: Hetzner Cloud (Germany/Finland datacenters)
- **Cost**: ~€22-23/month
- **Setup Time**: ~5-10 minutes
- **Resources**: 2 CPX21 servers (3 vCPU, 4GB RAM each)
- **Storage**: Hetzner Cloud Volumes with CSI driver
- **Access**: Public IP via Load Balancer

**Quick Start:**
```bash
cd hetzner
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values
terraform init
terraform apply
# Or use the setup script:
cd scripts
./setup-cluster.sh
export KUBECONFIG=~/.kube/config-budget
kubectl get nodes
```

**Documentation**: [hetzner/README.md](hetzner/README.md)

## Comparison Matrix

| Feature | Local (Kind) | Hetzner Cloud |
|---------|--------------|---------------|
| **Purpose** | Development & Testing | Production & Staging |
| **Nodes** | 2 (1 control + 1 worker) | 2 (1 master + 1 worker) |
| **CPU/RAM per node** | Limited by Docker Desktop | 3 vCPU / 4GB RAM |
| **Storage** | Docker volumes (ephemeral) | Hetzner Cloud Volumes (persistent) |
| **Networking** | Docker bridge network | Private network + Load Balancer |
| **Public Access** | localhost only | Public IP + DNS |
| **SSL/TLS** | Self-signed or none | Let's Encrypt via cert-manager |
| **Cost** | Free | ~€22-23/month |
| **Setup Time** | ~2 minutes | ~5-10 minutes |
| **Tear Down** | Instant | ~2-3 minutes |
| **Persistence** | Lost on cluster deletion | Persistent volumes retained |
| **External Access** | Port forwarding required | Direct internet access |
| **Load Balancer** | Nginx Ingress (in-cluster) | Hetzner LB11 (external) |
| **Sealed Secrets** | Auto-installed via Helm | Installed via Terraform |
| **Private Registry** | Supported (GHCR) | Supported (GHCR) |

## Recommended Workflow

### Development Flow

1. **Start Locally**
   ```bash
   # Create local cluster
   cd iac/kind/scripts
   ./setup-cluster.sh

   # Deploy your application
   export KUBECONFIG=~/.kube/config-budget-local
   kubectl apply -f ../../k8s/base/ -n budget-app

   # Test locally
   curl http://localhost/api/health
   ```

2. **Iterate and Test**
   - Make code changes
   - Build and load images into Kind
   - Test features locally
   - Run integration tests

3. **Deploy to Hetzner**
   ```bash
   # Deploy to production/staging
   cd iac/hetzner
   terraform apply

   # Deploy application
   export KUBECONFIG=~/.kube/config-budget
   kubectl apply -f ../../k8s/base/ -n budget-app
   ```

## Common Operations

### Switch Between Clusters

```bash
# Use local Kind cluster
export KUBECONFIG=~/.kube/config-budget-local
kubectl get nodes

# Use Hetzner cluster
export KUBECONFIG=~/.kube/config-budget
kubectl get nodes

# Or use kubectl contexts
kubectl config get-contexts
kubectl config use-context <context-name>
```

### Deploy Same Workload to Both

```bash
# Deploy to local
export KUBECONFIG=~/.kube/config-budget-local
kubectl apply -f k8s/base/ -n budget-app

# Deploy to Hetzner
export KUBECONFIG=~/.kube/config-budget
kubectl apply -f k8s/base/ -n budget-app
```

### Load Local Images to Kind

```bash
# Build image
docker build -t budget-app-api:local ./apps/api

# Load to Kind
kind load docker-image budget-app-api:local --name budget-app-local

# Update K8s manifest to use local image
# Set imagePullPolicy: Never or IfNotPresent
```

### Test Production Config Locally

```bash
# Use the same K8s manifests
export KUBECONFIG=~/.kube/config-budget-local
kubectl apply -f k8s/base/ -n budget-app

# Access via localhost
curl http://localhost
```

## Prerequisites

### For Local (Kind)

```bash
# Install Docker Desktop
# Download from: https://www.docker.com/products/docker-desktop

# Install Kind
brew install kind

# Install kubectl
brew install kubectl
```

### For Hetzner Cloud

```bash
# Install Terraform
brew install terraform

# Install kubectl
brew install kubectl

# Get Hetzner Cloud API token
# 1. Sign up at https://console.hetzner.cloud
# 2. Create a project
# 3. Generate API token (Read & Write)
```

## Troubleshooting

### Can't Access Kind Cluster

```bash
# Check Docker is running
docker info

# Check cluster exists
kind get clusters

# Re-export kubeconfig
kind export kubeconfig --name budget-app-local --kubeconfig ~/.kube/config-budget-local
export KUBECONFIG=~/.kube/config-budget-local
```

### Can't Access Hetzner Cluster

```bash
# Re-fetch kubeconfig
cd iac/hetzner/scripts
./get-kubeconfig.sh

# Check firewall allows your IP
cd iac/hetzner
terraform output admin_ip
curl ifconfig.me  # Compare with admin_ip
```

### Different Behavior Between Environments

Common differences to check:
- **Storage classes**: Kind uses local storage, Hetzner uses hcloud-volumes
- **Load balancer**: Kind uses in-cluster Nginx, Hetzner uses external LB
- **Network policies**: May behave differently due to CNI differences
- **Resource limits**: Kind limited by Docker Desktop settings

## Security Considerations

### Local (Kind)

- ✓ Isolated to your machine
- ✓ No external access (unless port-forwarded)
- ⚠️ Docker socket mounted (only if needed for testing)
- ⚠️ No authentication by default

### Hetzner Cloud

- ✓ Firewall rules restrict access to admin IP
- ✓ Private network for inter-node communication
- ✓ SSH key authentication
- ⚠️ Public IP exposed (use SSL/TLS)
- ⚠️ API token has full access (keep secure)

## Cost Management

### Local (Kind)
- **Cost**: Free
- **Resource Usage**: Limited by Docker Desktop allocation
- **Tip**: Destroy cluster when not in use to free resources

### Hetzner Cloud
- **Cost**: ~€22-23/month (see breakdown in hetzner/README.md)
- **Tip**: Destroy staging clusters when not testing
- **Tip**: Use smaller server types for non-production
- **Tip**: Enable auto-shutdown for dev/test environments

```bash
# Destroy Hetzner cluster to stop billing
cd iac/hetzner/scripts
./destroy-cluster.sh
```

## Monitoring and Observability

Both environments support the same monitoring stack:

```bash
# Deploy Prometheus & Grafana
kubectl apply -f k8s/monitoring/ -n monitoring

# Access Grafana (local)
kubectl port-forward -n monitoring svc/grafana 3000:3000
open http://localhost:3000

# Access Grafana (Hetzner)
# Configure Ingress for grafana.yourdomain.com
```

## Backup and Disaster Recovery

### Local (Kind)
- No built-in backup (development only)
- Export/import YAML manifests
- Use git for configuration management

### Hetzner Cloud
- Volume snapshots via Hetzner console
- etcd snapshots (automatic with k3s)
- See [hetzner/README.md](hetzner/README.md#backups) for details

## CI/CD Integration

Both environments work with CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Test on Kind
  run: |
    kind create cluster --config iac/kind/kind-config.yaml
    kubectl apply -f k8s/base/
    # Run tests

- name: Deploy to Hetzner
  if: github.ref == 'refs/heads/main'
  run: |
    # Use kubeconfig from secrets
    kubectl apply -f k8s/base/
```

## Migration Path

### Local → Hetzner

1. Ensure manifests work in local Kind cluster
2. Export configurations: `kubectl get all -n budget-app -o yaml > backup.yaml`
3. Apply to Hetzner cluster
4. Update Ingress for public domain
5. Configure DNS and SSL

### Hetzner → Local

1. Export manifests: `kubectl get all -n budget-app -o yaml > backup.yaml`
2. Edit for local (remove LoadBalancer, adjust Ingress)
3. Apply to Kind cluster
4. Test via localhost

## Getting Help

- **Kind Issues**: [kind/README.md](kind/README.md#troubleshooting)
- **Hetzner Issues**: [hetzner/README.md](hetzner/README.md#troubleshooting)
- **Kubernetes**: https://kubernetes.io/docs/
- **Project Issues**: Open an issue in this repository

## Next Steps

1. **New to Kubernetes?** Start with [kind/README.md](kind/README.md) for local experimentation
2. **Ready for production?** Follow [hetzner/README.md](hetzner/README.md) for cloud deployment
3. **Need both?** Set up local first, then deploy to Hetzner when ready

## Contributing

When adding new infrastructure:
1. Test locally in Kind first
2. Document in respective README
3. Add scripts to respective scripts/ directory
4. Update this README if adding new environments
