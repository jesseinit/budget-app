# GitHub Actions Setup Guide

This guide explains how to configure GitHub Actions secrets for automated deployment to your Kubernetes cluster.

## Required Secrets

### 1. KUBE_CONFIG

This secret contains your base64-encoded Kubernetes configuration file.

#### Steps to Set Up:

1. **Get your kubeconfig file:**
   ```bash
   # If you haven't already, fetch the kubeconfig from your cluster
   make get-kubeconfig

   # Or view your current config
   cat ~/.kube/config
   ```

2. **Encode the kubeconfig to base64:**
   ```bash
   # On macOS/Linux
   cat ~/.kube/config | base64

   # On some Linux systems, you might need to use -w 0 to prevent line wrapping
   cat ~/.kube/config | base64 -w 0
   ```

3. **Add the secret to GitHub:**
   - Go to your GitHub repository
   - Click on **Settings** → **Secrets and variables** → **Actions**
   - Click **New repository secret**
   - Name: `KUBE_CONFIG`
   - Value: Paste the base64-encoded kubeconfig content
   - Click **Add secret**

## Workflow Overview

The GitHub Actions workflow (`.github/workflows/deploy.yml`) performs the following steps on every push to the `main` branch:

1. **Build Docker Images:**
   - Builds `budget-client` and `budget-server` images
   - Tags images with `latest` and `main-<git-sha>`
   - Pushes images to GitHub Container Registry (ghcr.io)

2. **Deploy to Kubernetes:**
   - Applies Kubernetes manifests from `k8s/base/`
   - Restarts backend and frontend deployments
   - Waits for deployments to be ready
   - Verifies deployment status

## Image Tags

The workflow creates two tags for each image:

- `latest` - Always points to the most recent build from main
- `main-<git-sha>` - Specific commit SHA for rollback capability

Example:
```
ghcr.io/jesseinit/budget-client:latest
ghcr.io/jesseinit/budget-client:main-abc1234
```

## Manual Deployment

You can still deploy manually using the Makefile:

```bash
# Build and push images
make build-all

# Deploy to Kubernetes
make deploy
```

## Troubleshooting

### Workflow fails with "unauthorized" error
- Ensure the repository has access to GitHub Container Registry
- Check that the workflow has `packages: write` permission

### Workflow fails with "kubectl: command not found"
- This is handled by the `azure/setup-kubectl` action
- Check the workflow logs for kubectl setup issues

### Deployment fails with "connection refused"
- Verify the `KUBE_CONFIG` secret is correctly base64-encoded
- Test the kubeconfig locally: `kubectl --kubeconfig=~/.kube/config get pods -n budget-app`

### Images not pulling in Kubernetes
- Ensure your Kubernetes cluster can access ghcr.io
- Check if image pull secrets are configured correctly in your deployments

## Viewing Deployment Status

After a successful workflow run, you can check your deployment:

```bash
# Check pod status
kubectl get pods -n budget-app

# Check deployment status
kubectl get deployments -n budget-app

# View recent logs
kubectl logs -n budget-app deployment/backend --tail=50
kubectl logs -n budget-app deployment/frontend --tail=50
```

## Security Notes

⚠️ **Important Security Considerations:**

- Never commit your kubeconfig file to the repository
- The `KUBE_CONFIG` secret should be base64-encoded before adding to GitHub
- Regularly rotate your Kubernetes credentials
- Use namespace-scoped service accounts for better security
- Consider using RBAC to limit the permissions of the deployment user

## Environment-Specific Deployments

To deploy to different environments (staging, production), you can:

1. Create separate branches (e.g., `staging`, `production`)
2. Add environment-specific secrets (e.g., `KUBE_CONFIG_STAGING`, `KUBE_CONFIG_PROD`)
3. Modify the workflow to use different secrets based on the branch

Example workflow modification:
```yaml
- name: Configure kubectl
  run: |
    mkdir -p $HOME/.kube
    if [ "${{ github.ref }}" == "refs/heads/production" ]; then
      echo "${{ secrets.KUBE_CONFIG_PROD }}" | base64 -d > $HOME/.kube/config
    else
      echo "${{ secrets.KUBE_CONFIG }}" | base64 -d > $HOME/.kube/config
    fi
```
