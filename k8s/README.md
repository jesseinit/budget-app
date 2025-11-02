# Budget App Kubernetes Deployment

This directory contains Kubernetes manifests for deploying the Budget App to your k3s cluster on Hetzner Cloud.

## Prerequisites

1. k3s cluster running (master + worker nodes)
2. kubectl configured with cluster access
3. Docker images pushed to GHCR:
   - `ghcr.io/jesseinit/budget-server:v1.0.0`
   - `ghcr.io/jesseinit/budget-client:v1.0.0`
4. kubeseal CLI installed (for managing Sealed Secrets)

## Directory Structure

```
k8s/
├── base/
│   ├── namespace.yaml              # Creates budget-app namespace
│   ├── sealed-secret-app.yaml      # Encrypted app secrets (safe to commit)
│   ├── sealed-secret-ghcr.yaml     # Encrypted GHCR credentials (safe to commit)
│   ├── sealed-secrets-pub-cert.pem # Public cert for encrypting secrets
│   ├── postgres-statefulset.yaml   # PostgreSQL 15 with 20GB PVC
│   ├── redis-statefulset.yaml      # Redis 7 with 10GB PVC
│   ├── backend-deployment.yaml     # FastAPI backend (2 replicas)
│   ├── frontend-deployment.yaml    # React frontend (2 replicas)
│   ├── ingress.yaml                # Nginx Ingress routing
│   └── kustomization.yaml          # Kustomize configuration
├── install-sealed-secrets.sh       # Install Sealed Secrets controller
├── fetch-cert.sh                   # Fetch encryption certificate
├── create-secrets.sh               # Generate sealed secrets
├── deploy.sh                       # Deployment script
└── README.md                       # This file
```

## Secrets Management with Sealed Secrets

This project uses [Sealed Secrets](https://github.com/bitnami-labs/sealed-secrets) to securely manage secrets in git. Sealed Secrets encrypts your secrets so they can be safely committed to version control.

### How It Works

1. **Sealed Secrets Controller** runs in your cluster and holds the private key
2. **kubeseal CLI** encrypts secrets using the public certificate
3. **Encrypted SealedSecret** resources are safe to commit to git
4. When applied, the controller decrypts them into regular Kubernetes Secrets

### Setup (One-time)

#### 1. Install Sealed Secrets Controller

```bash
./install-sealed-secrets.sh
```

This installs the controller in the `kube-system` namespace.

#### 2. Install kubeseal CLI

**macOS:**
```bash
brew install kubeseal
```

**Linux:**
```bash
wget https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.5/kubeseal-0.24.5-linux-amd64.tar.gz
tar xfz kubeseal-0.24.5-linux-amd64.tar.gz
sudo install -m 755 kubeseal /usr/local/bin/kubeseal
```

#### 3. Fetch Public Certificate

```bash
./fetch-cert.sh
```

This saves the public certificate to `base/sealed-secrets-pub-cert.pem` (safe to commit).

### Creating Sealed Secrets

#### 1. Set Environment Variables

```bash
export GITHUB_TOKEN=ghp_your_actual_github_token
export TRADING212_API_KEY=your_api_key  # Optional
```

#### 2. Generate Sealed Secrets

```bash
./create-secrets.sh
```

This creates:
- `base/sealed-secret-app.yaml` - Application secrets (DB, Redis, API keys)
- `base/sealed-secret-ghcr.yaml` - GitHub Container Registry credentials

**These encrypted files are safe to commit to git!**

#### 3. Commit the Sealed Secrets

```bash
git add k8s/base/sealed-secret-*.yaml
git add k8s/base/sealed-secrets-pub-cert.pem
git commit -m "Add sealed secrets"
git push
```

### Updating Secrets

If you need to update secrets (e.g., rotate passwords):

1. Update the values in `create-secrets.sh` or set new environment variables
2. Run `./create-secrets.sh` to regenerate the sealed secrets
3. Apply the new sealed secrets: `kubectl apply -f base/sealed-secret-app.yaml`
4. Commit the updated files to git

## Deployment

### Quick Deploy

```bash
cd k8s
./deploy.sh
```

The script will:
1. Verify cluster connectivity
2. Check for sealed secrets
3. Apply all manifests
4. Show deployment status

### Manual Deploy

```bash
# Set kubeconfig
export KUBECONFIG=~/.kube/config-budget

# Verify cluster connectivity
kubectl cluster-info
kubectl get nodes

# Apply all manifests (including sealed secrets)
kubectl apply -k base/

# Watch pod creation
kubectl get pods -n budget-app -w
```

## Monitoring

### Check All Resources

```bash
kubectl get all -n budget-app
```

### Check Specific Resources

```bash
# Pods
kubectl get pods -n budget-app

# Sealed Secrets (encrypted)
kubectl get sealedsecrets -n budget-app

# Regular Secrets (decrypted by controller)
kubectl get secrets -n budget-app

# StatefulSets
kubectl get statefulsets -n budget-app

# Deployments
kubectl get deployments -n budget-app

# Services
kubectl get services -n budget-app

# Ingress
kubectl get ingress -n budget-app

# PersistentVolumeClaims
kubectl get pvc -n budget-app
```

### View Logs

```bash
# Backend logs
kubectl logs -f -n budget-app -l app=backend

# Frontend logs
kubectl logs -f -n budget-app -l app=frontend

# PostgreSQL logs
kubectl logs -f -n budget-app -l app=postgres

# Redis logs
kubectl logs -f -n budget-app -l app=redis

# Sealed Secrets controller logs
kubectl logs -f -n kube-system -l name=sealed-secrets-controller
```

### Describe Resources

```bash
# Describe a sealed secret
kubectl describe sealedsecret budget-app-secrets -n budget-app

# Describe a pod
kubectl describe pod <pod-name> -n budget-app

# Describe StatefulSet
kubectl describe statefulset postgres -n budget-app
```

## Accessing the Application

The application is accessible through the Hetzner Load Balancer:

- **Frontend**: http://167.233.9.178
- **Backend API**: http://167.233.9.178/api
- **API Docs**: http://167.233.9.178/docs

## Troubleshooting

### Sealed Secrets Not Decrypting

```bash
# Check if controller is running
kubectl get pods -n kube-system | grep sealed-secrets

# Check controller logs
kubectl logs -n kube-system -l name=sealed-secrets-controller

# Verify sealed secret was created
kubectl get sealedsecret -n budget-app

# Check if regular secret was created by controller
kubectl get secret budget-app-secrets -n budget-app
```

### Pods Not Starting

```bash
# Check pod events
kubectl describe pod <pod-name> -n budget-app

# Check pod logs
kubectl logs <pod-name> -n budget-app
```

### Database Connection Issues

```bash
# Check PostgreSQL is running
kubectl get pods -n budget-app -l app=postgres

# Check PostgreSQL logs
kubectl logs -n budget-app -l app=postgres

# Verify secrets are available
kubectl get secret budget-app-secrets -n budget-app -o yaml
```

### Image Pull Issues

```bash
# Check if GHCR secret exists
kubectl get secret ghcr-secret -n budget-app

# Describe the secret
kubectl describe secret ghcr-secret -n budget-app

# Regenerate if needed
export GITHUB_TOKEN=your_token
./create-secrets.sh
kubectl apply -f base/sealed-secret-ghcr.yaml
```

## Updating the Application

### Update Backend

```bash
# Build and push new image
docker build -t ghcr.io/jesseinit/budget-server:v1.0.1 server/
docker push ghcr.io/jesseinit/budget-server:v1.0.1

# Update deployment
kubectl set image deployment/backend backend=ghcr.io/jesseinit/budget-server:v1.0.1 -n budget-app

# Or edit the manifest and reapply
# Update image tag in backend-deployment.yaml
kubectl apply -k base/
```

### Update Frontend

```bash
# Build and push new image
docker build -t ghcr.io/jesseinit/budget-client:v1.0.1 client/
docker push ghcr.io/jesseinit/budget-client:v1.0.1

# Update deployment
kubectl set image deployment/frontend frontend=ghcr.io/jesseinit/budget-client:v1.0.1 -n budget-app
```

## Scaling

### Scale Backend

```bash
kubectl scale deployment backend --replicas=3 -n budget-app
```

### Scale Frontend

```bash
kubectl scale deployment frontend --replicas=3 -n budget-app
```

## Backup and Disaster Recovery

### Backup Sealed Secrets Controller Key (Important!)

The private key is stored in the cluster. **Back it up** for disaster recovery:

```bash
kubectl get secret -n kube-system sealed-secrets-key -o yaml > sealed-secrets-key.yaml
```

**Store this file securely** (1Password, AWS Secrets Manager, etc.). **Never commit it to git!**

### Restore from Backup

If you need to restore the controller on a new cluster:

```bash
# Apply the backed-up key first
kubectl apply -f sealed-secrets-key.yaml

# Then install the controller
./install-sealed-secrets.sh

# Now your existing sealed secrets will work
kubectl apply -k base/
```

## Cleanup

### Delete All Resources

```bash
kubectl delete namespace budget-app
```

### Delete Specific Resources

```bash
kubectl delete -k base/
```

### Uninstall Sealed Secrets Controller

```bash
kubectl delete -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.5/controller.yaml
```

## Resource Allocation

| Component   | Replicas | CPU Request | CPU Limit | Memory Request | Memory Limit | Storage |
|-------------|----------|-------------|-----------|----------------|--------------|---------|
| Backend     | 2        | 250m        | 500m      | 256Mi          | 512Mi        | -       |
| Frontend    | 2        | 100m        | 200m      | 128Mi          | 256Mi        | -       |
| PostgreSQL  | 1        | 250m        | 500m      | 256Mi          | 512Mi        | 20Gi    |
| Redis       | 1        | 100m        | 200m      | 128Mi          | 256Mi        | 10Gi    |

## Security Best Practices

1. **Never commit plain secrets** - Use Sealed Secrets for all sensitive data
2. **Backup the controller key** - Store it securely outside the cluster
3. **Rotate secrets regularly** - Update sealed secrets periodically
4. **Limit access** - Use RBAC to control who can create/view secrets
5. **Monitor controller logs** - Watch for decryption failures
6. **Use unique secrets per environment** - Don't share secrets between dev/staging/prod

## Notes

- Sealed Secrets are encrypted and safe to commit to version control
- Only the cluster with the matching private key can decrypt them
- PostgreSQL and Redis use StatefulSets with persistent storage via Hetzner CSI
- Backend runs database migrations on startup via Alembic
- Ingress routes `/api` and `/docs` to backend, `/` to frontend
- All pods have liveness and readiness probes configured
- Backend has init containers to wait for database dependencies
