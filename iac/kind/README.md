# Budget App - Local Kubernetes with Kind

This directory contains configuration and scripts to run the Budget App on a local Kubernetes cluster using Kind (Kubernetes in Docker).

## Architecture

- **5-Node Cluster**: 1 control-plane + 4 worker nodes
- **Worker Node Limits**: Each worker configured with ~4GB memory limits
- **Networking**:
  - Pod subnet: 10.244.0.0/16
  - Service subnet: 10.96.0.0/12
  - API server: localhost:6443
- **Ingress**: Nginx Ingress Controller (port 80/443 exposed to host via 6080/6443)
- **Metrics**: metrics-server for HPA support
- **Namespaces**: budget-app, monitoring
- **Application Scale**: 5 backend replicas + 5 frontend replicas (distributed across workers)

## Prerequisites

### Required Tools

```bash
# Docker Desktop (or Docker Engine)
# Download from: https://www.docker.com/products/docker-desktop

# Kind
brew install kind
# Or visit: https://kind.sigs.k8s.io/docs/user/quick-start/#installation

# kubectl
brew install kubectl

# Helm (for sealed-secrets)
brew install helm
```

### Verify Installation

```bash
# Check Kind
kind version

# Check kubectl
kubectl version --client

# Check Docker
docker info
```

## Quick Start

### 1. Create the Cluster

```bash
cd scripts
./setup-cluster.sh
```

This script will:
- ✓ Check all prerequisites (kind, kubectl, helm)
- ✓ Create a 2-node Kind cluster
- ✓ Install Nginx Ingress Controller
- ✓ Install metrics-server
- ✓ Create budget-app and monitoring namespaces
- ✓ Install sealed-secrets controller via Helm
- ✓ Restore existing sealed-secrets keys (if available)
- ✓ Export kubeconfig to `~/.kube/config-budget-local`

**Expected output:**
```
========================================
✓ Cluster setup complete!
========================================

Cluster Information:
  Cluster Name: budget-app-local
  Kubeconfig: ~/.kube/config-budget-local
  Nodes: 2 (1 control-plane + 1 worker)
```

### 2. Use the Cluster

```bash
# Set kubeconfig
export KUBECONFIG=~/.kube/config-budget-local

# Verify nodes
kubectl get nodes

# Expected output:
# NAME                              STATUS   ROLES           AGE   VERSION
# budget-app-local-control-plane    Ready    control-plane   2m    v1.31.0
# budget-app-local-worker           Ready    <none>          2m    v1.31.0
```

### 3. Deploy the Budget App

The cluster automatically has sealed-secrets installed and configured. Your existing sealed secrets will work immediately.

```bash
# Apply Kubernetes manifests (uses kustomize)
kubectl apply -k k8s/base/

# The sealed-secrets controller will automatically decrypt:
# - GHCR image pull secrets (for pulling from ghcr.io/jesseinit/*)
# - Backend application secrets (database credentials, JWT secrets, etc.)

# Check deployment
kubectl get pods -n budget-app
kubectl get services -n budget-app
kubectl get ingress -n budget-app

# Verify sealed secrets are decrypted
kubectl get secrets -n budget-app
# You should see: ghcr-secret, backend-secrets, etc.
```

### 4. Access the Application

Since the Ingress controller is configured to expose ports on localhost:

```bash
# Access via localhost (note the custom ports)
curl http://localhost:6080

# Or in your browser
open http://localhost:6080

# API Documentation
open http://localhost:6080/docs

# Backend API directly
curl http://localhost:6080 -H "Host: api.localhost"
curl http://localhost:6080/health -H "Host: api.localhost"
```

**Note:** Kind uses ports 6080 (HTTP) and 6443 (HTTPS) to avoid conflicts with system services.

**How it works:** The setup script automatically configures the ingress controller to:
1. Use `hostPort` to bind to ports 80/443 inside the container
2. Run on the control-plane node (via `nodeSelector: ingress-ready: "true"`)
3. This allows Kind's port mappings (6080→80, 6443→443) to work correctly

## Cluster Management

### View Cluster Info

```bash
export KUBECONFIG=~/.kube/config-budget-local

# Get all nodes
kubectl get nodes -o wide

# Get all pods across all namespaces
kubectl get pods -A

# Get cluster info
kubectl cluster-info

# Get ingress controller status
kubectl get pods -n ingress-nginx
```

### Access Control Plane Logs

```bash
# Get control plane container
docker ps | grep control-plane

# View logs
docker logs budget-app-local-control-plane

# Execute commands in control plane
docker exec -it budget-app-local-control-plane bash
```

### Load Docker Images into Cluster

If you're building images locally and want to use them in Kind:

```bash
# Build your image
docker build -t budget-app-api:local ./apps/api
docker build -t budget-app-web:local ./apps/web

# Load into Kind cluster
kind load docker-image budget-app-api:local --name budget-app-local
kind load docker-image budget-app-web:local --name budget-app-local

# Now you can use these images in your Kubernetes manifests
# with imagePullPolicy: Never or IfNotPresent
```

### Port Forwarding

For services not exposed via Ingress:

```bash
# Forward PostgreSQL
kubectl port-forward -n budget-app svc/postgres 5432:5432

# Forward API directly (if needed)
kubectl port-forward -n budget-app svc/api 3000:3000

# Forward monitoring tools
kubectl port-forward -n monitoring svc/grafana 3001:3000
```

### Debugging

```bash
# Get pod logs
kubectl logs -n budget-app <pod-name>

# Follow logs
kubectl logs -n budget-app <pod-name> -f

# Get previous pod logs (if crashed)
kubectl logs -n budget-app <pod-name> --previous

# Execute into pod
kubectl exec -it -n budget-app <pod-name> -- /bin/sh

# Describe pod (see events)
kubectl describe pod -n budget-app <pod-name>

# Check ingress controller logs
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller
```

## Configuration Files

### kind-config.yaml

The cluster configuration file defines:
- Node roles (control-plane + worker)
- Port mappings (80, 443, 6443)
- Docker socket mounts for Docker-in-Docker scenarios
- Network subnets
- Feature gates

To modify the configuration, edit [kind-config.yaml](kind-config.yaml) and recreate the cluster.

### Adding More Worker Nodes

Edit `kind-config.yaml` and add more worker nodes:

```yaml
nodes:
  - role: control-plane
    # ... existing config

  - role: worker
    # ... existing config

  - role: worker  # Additional worker
    extraMounts:
    - hostPath: /var/run/docker.sock
      containerPath: /var/run/docker.sock
      readOnly: false
```

Then recreate the cluster:
```bash
./scripts/destroy-cluster.sh
./scripts/setup-cluster.sh
```

## Comparison with Hetzner Deployment

| Feature | Local (Kind) | Hetzner Cloud |
|---------|-------------|---------------|
| Nodes | 2 (1 control + 1 worker) | 2 (1 master + 1 worker) |
| Node Resources | Limited by Docker Desktop | CPX21 (3 vCPU, 4GB RAM) |
| Storage | Local Docker volumes | Hetzner Cloud Volumes (CSI) |
| Networking | Docker networking | Private network + Load Balancer |
| Ingress | localhost:80/443 | Public IP via LB |
| Cost | Free | ~€22-23/month |
| Setup Time | ~2 minutes | ~5-10 minutes |
| Use Case | Development, testing | Production, staging |

## Testing Production Scenarios

Kind is great for testing production scenarios locally:

### 1. Test Ingress Routes

```bash
# Create test ingress
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: test-ingress
  namespace: budget-app
spec:
  ingressClassName: nginx
  rules:
  - host: localhost
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: api
            port:
              number: 3000
EOF

# Test
curl http://localhost/api/health
```

### 2. Test Horizontal Pod Autoscaling

```bash
# Verify metrics-server is running
kubectl top nodes
kubectl top pods -n budget-app

# Create HPA
kubectl autoscale deployment api -n budget-app --cpu-percent=50 --min=1 --max=5

# Generate load and watch scaling
kubectl get hpa -n budget-app -w
```

### 3. Test Resource Limits

```bash
# Apply pod with resource limits
kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: stress-test
  namespace: budget-app
spec:
  containers:
  - name: stress
    image: polinux/stress
    resources:
      limits:
        memory: "128Mi"
        cpu: "500m"
      requests:
        memory: "64Mi"
        cpu: "250m"
    command: ["stress"]
    args: ["--vm", "1", "--vm-bytes", "100M", "--vm-hang", "1"]
EOF

# Watch resource usage
kubectl top pod stress-test -n budget-app
```

### 4. Test Network Policies

```bash
# Apply network policy
kubectl apply -f ../../k8s/base/network-policies.yaml -n budget-app

# Test connectivity between pods
kubectl exec -n budget-app <api-pod> -- curl <db-service>
```

## Sealed Secrets & Private Registry

### How It Works

The Kind cluster automatically installs and configures sealed-secrets to handle:
1. **Private Registry Access**: GHCR image pull secrets for `ghcr.io/jesseinit/*` images
2. **Application Secrets**: Database credentials, JWT secrets, API keys, etc.

### Automatic Key Restoration

During cluster creation, the setup script:
1. Checks for existing sealed-secrets keys in `.sealed-secrets-keys/sealed-secrets-key.yaml`
2. If found, restores the key **before** installing sealed-secrets controller
3. Installs sealed-secrets via Helm
4. Your existing sealed secrets work immediately without re-sealing!

### Verifying Sealed Secrets

```bash
# Check sealed-secrets controller is running
kubectl get pods -n kube-system -l app.kubernetes.io/name=sealed-secrets

# Check if secrets are decrypted
kubectl get secrets -n budget-app

# View sealed secret resources
kubectl get sealedsecrets -n budget-app

# Check controller logs if issues
kubectl logs -n kube-system -l app.kubernetes.io/name=sealed-secrets
```

### Creating New Sealed Secrets

If you need to seal new secrets:

```bash
# 1. Create your secret YAML
cat > k8s/my-secret.yaml <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: my-secret
  namespace: budget-app
stringData:
  username: myuser
  password: mypassword
EOF

# 2. Seal it using the public cert
kubeseal --format=yaml \
  --cert=.sealed-secrets-keys/pub-cert.pem \
  < k8s/my-secret.yaml \
  > k8s/base/my-sealed-secret.yaml

# 3. Delete the unsealed version
rm k8s/my-secret.yaml

# 4. Apply the sealed secret
kubectl apply -f k8s/base/my-sealed-secret.yaml

# The controller automatically decrypts it
kubectl get secret my-secret -n budget-app
```

### Backing Up Keys

**IMPORTANT:** If you create a new cluster without existing keys, back them up immediately:

```bash
# Using make command
make backup-sealed-secrets

# Or manually
kubectl get secret -n kube-system \
  -l sealedsecrets.bitnami.com/sealed-secrets-key \
  -o yaml > .sealed-secrets-keys/sealed-secrets-key.yaml
```

### Private Registry Configuration

The `ghcr-secret` sealed secret contains Docker credentials for pulling from:
```
ghcr.io/jesseinit/budget-client:latest
ghcr.io/jesseinit/budget-server:latest
```

This secret is automatically:
1. Decrypted by sealed-secrets controller
2. Referenced in deployment manifests via `imagePullSecrets`
3. Used by Kubernetes to authenticate with GHCR

Check if it's working:
```bash
# Verify secret exists
kubectl get secret ghcr-secret -n budget-app

# Check pod events for image pull issues
kubectl describe pod -n budget-app <pod-name> | grep -A5 Events
```

## Cleanup

### Delete the Cluster

```bash
cd scripts
./destroy-cluster.sh
```

This will:
- Delete the Kind cluster
- Remove the kubeconfig file
- Clean up all Docker containers and volumes

### Manual Cleanup

```bash
# Delete cluster manually
kind delete cluster --name budget-app-local

# Remove kubeconfig
rm ~/.kube/config-budget-local

# Verify cleanup
kind get clusters
docker ps -a | grep budget-app
```

## Troubleshooting

### Cluster Creation Fails

```bash
# Check Docker is running
docker info

# Check Docker resources (Settings > Resources)
# Recommended: 4GB RAM, 2 CPUs minimum

# Delete and retry
kind delete cluster --name budget-app-local
./scripts/setup-cluster.sh
```

### Ingress Not Working

```bash
# Check ingress controller
kubectl get pods -n ingress-nginx
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller

# Verify port mapping
docker ps | grep control-plane
# Should show: 0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp

# Test connectivity
curl http://localhost
```

### Pods Not Starting

```bash
# Check pod status
kubectl get pods -n budget-app
kubectl describe pod <pod-name> -n budget-app

# Check events
kubectl get events -n budget-app --sort-by='.lastTimestamp'

# Check logs
kubectl logs <pod-name> -n budget-app
```

### Metrics Server Not Working

```bash
# Check metrics-server pod
kubectl get pods -n kube-system | grep metrics-server

# Check if patch was applied
kubectl get deployment metrics-server -n kube-system -o yaml | grep kubelet-insecure-tls

# Restart if needed
kubectl rollout restart deployment metrics-server -n kube-system
```

### DNS Resolution Issues

```bash
# Test DNS from a pod
kubectl run -it --rm debug --image=busybox --restart=Never -- nslookup kubernetes.default

# Check CoreDNS
kubectl get pods -n kube-system | grep coredns
kubectl logs -n kube-system deployment/coredns
```

## Advanced Usage

### Custom Kind Configuration

You can create custom configurations for different scenarios:

```bash
# Create a single-node cluster for lightweight testing
kind create cluster --name mini --config - <<EOF
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
EOF

# Create a multi-worker cluster
kind create cluster --name multi --config - <<EOF
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
  - role: worker
  - role: worker
  - role: worker
EOF
```

### Persistent Storage

Kind uses Docker volumes for persistent storage:

```bash
# List volumes
docker volume ls | grep budget-app

# Inspect volume
docker volume inspect <volume-name>

# Backup volume
docker run --rm -v <volume-name>:/data -v $(pwd):/backup alpine tar czf /backup/volume-backup.tar.gz -C /data .
```

## Next Steps

1. Deploy the Budget App using the K8s manifests
2. Set up local development workflow with hot-reload
3. Test CI/CD pipelines locally
4. Experiment with Helm charts
5. Test disaster recovery scenarios

## Resources

- **Kind Documentation**: https://kind.sigs.k8s.io/
- **Kubernetes Documentation**: https://kubernetes.io/docs/
- **Ingress-Nginx**: https://kubernetes.github.io/ingress-nginx/
- **Metrics Server**: https://github.com/kubernetes-sigs/metrics-server

## Support

For issues specific to Kind setup, check:
- Kind GitHub Issues: https://github.com/kubernetes-sigs/kind/issues
- Kind Slack: https://kubernetes.slack.com/messages/kind
