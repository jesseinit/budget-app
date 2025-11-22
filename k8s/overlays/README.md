# Kubernetes Overlays

This directory contains Kustomize overlays for different deployment environments.

## Structure

```
overlays/
├── local/          # Local development (Kind cluster)
│   └── kustomization.yaml
├── production/     # Production deployment (Hetzner cloud)
│   └── kustomization.yaml
└── README.md
```

## Overlays

### Local (`overlays/local/`)

**Use Case:** Local development on Kind cluster

**Changes from base:**
- Image: `ghcr.io/jesseinit/budget-server:latest` → `budget-app-server:latest`
- Image: `ghcr.io/jesseinit/budget-client:latest` → `budget-app-client:latest`
- `imagePullPolicy`: `Always` → `Never`
- Removes `imagePullSecrets` (not needed for local images)
- StorageClass: `hcloud-volumes` → `standard` (Kind's default storage class)
- Ingress: `budget.jesseinit.dev` → `localhost`, removes TLS, disables SSL redirect
- Replicas: Backend scaled to 5 pods, Frontend scaled to 5 pods (for multi-node testing)

**Usage:**
```bash
# Build and load local images
make kind-build

# Deploy with local overlay
make deploy-kind

# Or manually
kubectl apply -k k8s/overlays/local/
```

**Setup local domains (one-time):**
```bash
# Add entries to /etc/hosts
sudo bash -c 'cat >> /etc/hosts << EOF
# Budget App Local Development
127.0.0.1  budget.local
127.0.0.1  api.budget.local
EOF'
```

**Access the application:**
```bash
# Frontend
open http://budget.local:6080

# Backend API docs
open http://budget.local:6080/docs

# Backend API health
curl http://api.budget.local:6080/health

# Backend API root
curl http://api.budget.local:6080

# Alternative (without /etc/hosts setup)
open http://localhost:6080
```

**How it works:**
1. You build images locally for your architecture (ARM64/AMD64)
2. Images are loaded directly into Kind cluster
3. Kustomize patches the deployments to use local image names
4. `imagePullPolicy: Never` ensures Kubernetes uses the loaded images
5. No registry authentication needed

### Production (`overlays/production/`)

**Use Case:** Production deployment on Hetzner Cloud

**Changes from base:**
- Uses base configuration as-is
- Images: `ghcr.io/jesseinit/budget-server:latest` (multi-platform)
- Images: `ghcr.io/jesseinit/budget-client:latest` (multi-platform)
- `imagePullPolicy`: `Always`
- Uses `imagePullSecrets` (ghcr-secret for private registry)
- StorageClass: `hcloud-volumes` (Hetzner CSI driver)

**Usage:**
```bash
# Build and push multi-platform images
make build-all

# Deploy to production
make deploy-hetzner

# Or manually
kubectl apply -k k8s/overlays/production/
```

**How it works:**
1. Multi-platform images are built and pushed to GHCR
2. sealed-secrets controller decrypts `ghcr-secret`
3. Kubernetes pulls images from GHCR using the secret
4. Works on any platform (AMD64 for Hetzner)

## Workflow Examples

### Local Development

```bash
# 1. Start Kind cluster
make kind-setup
export KUBECONFIG=~/.kube/config-budget-local

# 2. Build and load images
make kind-build

# 3. Deploy
make deploy-kind

# 4. Make code changes and rebuild
make kind-build
kubectl rollout restart deployment/backend -n budget-app

# 5. Access app
open http://localhost:6080
```

### Production Deployment

```bash
# 1. Build multi-platform images
make build-all

# 2. Deploy to Hetzner
make deploy-hetzner

# 3. Verify
export KUBECONFIG=~/.kube/config-budget
kubectl get pods -n budget-app
```

### Testing Production Config Locally

You can test production configs locally too:

```bash
# Build multi-platform and push
make build-all

# Deploy production overlay to Kind
export KUBECONFIG=~/.kube/config-budget-local
kubectl apply -k k8s/overlays/production/

# Kind will pull from GHCR (slower but tests the full flow)
```

## Creating New Overlays

To create a new overlay (e.g., `staging`):

```bash
mkdir -p k8s/overlays/staging
cat > k8s/overlays/staging/kustomization.yaml <<EOF
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: budget-app

resources:
  - ../../base

# Add staging-specific patches here
EOF
```

## Kustomize Patches Explained

### Local Overlay Patches

**Image replacement:**
```yaml
images:
  - name: ghcr.io/jesseinit/budget-server
    newName: budget-app-server
    newTag: latest
```
This replaces the registry image with the local image name.

**JSON Patches:**
```yaml
patches:
  - target:
      kind: Deployment
      name: backend
    patch: |-
      - op: replace
        path: /spec/template/spec/containers/0/imagePullPolicy
        value: Never
      - op: remove
        path: /spec/template/spec/imagePullSecrets
```
These modify the deployment to use local images.

## Storage Classes

### Kind (Local)

Kind uses the `standard` storage class backed by local hostPath volumes:

```bash
# Check storage class
kubectl get storageclass

# Should show:
# NAME                 PROVISIONER             RECLAIMPOLICY   ...
# standard (default)   rancher.io/local-path   Delete          ...

# Check PVCs
kubectl get pvc -n budget-app

# Should show postgres-storage and redis-storage using 'standard'
```

**Characteristics:**
- ✓ Dynamic provisioning
- ✓ Fast (local disk)
- ✗ Data lost when cluster is deleted
- ✗ Not suitable for production

### Hetzner (Production)

Hetzner uses the `hcloud-volumes` storage class backed by Hetzner Cloud Volumes:

```bash
# Check storage class
kubectl get storageclass

# Should show:
# NAME                    PROVISIONER         RECLAIMPOLICY   ...
# hcloud-volumes          csi.hetzner.cloud   Retain          ...

# Check PVCs
kubectl get pvc -n budget-app
```

**Characteristics:**
- ✓ Dynamic provisioning
- ✓ Persistent (survives cluster recreation)
- ✓ Backed up (Hetzner snapshots)
- ✓ Production-ready
- ✗ Slower than local disk

## Troubleshooting

### Images not found (Local)

```bash
# Check images are loaded
docker exec -it budget-app-local-control-plane crictl images | grep budget-app

# Rebuild and load
make kind-build
```

### Images not pulling (Production)

```bash
# Check sealed secret is decrypted
kubectl get secret ghcr-secret -n budget-app

# Check pod events
kubectl describe pod -n budget-app <pod-name>

# Check sealed-secrets controller
kubectl logs -n kube-system -l app.kubernetes.io/name=sealed-secrets
```

### Wrong overlay applied

```bash
# Check what's deployed
kubectl get deployment backend -n budget-app -o yaml | grep image

# Should show for local:
#   image: budget-app-server:latest
#   imagePullPolicy: Never

# Should show for production:
#   image: ghcr.io/jesseinit/budget-server:latest
#   imagePullPolicy: Always
```

## References

- [Kustomize Documentation](https://kustomize.io/)
- [Kubernetes Image Pull Policies](https://kubernetes.io/docs/concepts/containers/images/#image-pull-policy)
- [Kind - Loading Images](https://kind.sigs.k8s.io/docs/user/quick-start/#loading-an-image-into-your-cluster)
