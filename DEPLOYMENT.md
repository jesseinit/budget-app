# Budget App - Deployment Guide

This guide covers deploying the Budget App to a Kubernetes cluster on Hetzner Cloud.

## Overview

The deployment uses:
- **Infrastructure**: Terraform for provisioning Hetzner Cloud resources
- **Orchestration**: Kubernetes (k3s) for container orchestration
- **Storage**: Hetzner CSI driver for persistent volumes
- **Networking**: Hetzner Load Balancer + Nginx Ingress
- **Database**: PostgreSQL 15 (StatefulSet)
- **Cache**: Redis (StatefulSet)

## Prerequisites

### 1. Tools Installation

```bash
# macOS
brew install terraform kubectl helm hcloud

# Linux
# Install Terraform: https://learn.hashicorp.com/tutorials/terraform/install-cli
# Install kubectl: https://kubernetes.io/docs/tasks/tools/
```

### 2. Hetzner Cloud Setup

1. Sign up at https://console.hetzner.cloud
2. Create a new project
3. Generate API token (Read & Write)
4. Save token securely

### 3. Docker Registry

Build and push your Docker images to a registry:

```bash
# Option 1: Docker Hub
docker login
docker build -t yourusername/budget-server:v1.0.0 ./server
docker build -t yourusername/budget-client:v1.0.0 ./client
docker push yourusername/budget-server:v1.0.0
docker push yourusername/budget-client:v1.0.0

# Option 2: GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
docker build -t ghcr.io/yourusername/budget-server:v1.0.0 ./server
docker build -t ghcr.io/yourusername/budget-client:v1.0.0 ./client
docker push ghcr.io/yourusername/budget-server:v1.0.0
docker push ghcr.io/yourusername/budget-client:v1.0.0
```

## Deployment Steps

### Phase 1: Infrastructure Provisioning

```bash
cd terraform

# 1. Configure variables
cp terraform.tfvars.example terraform.tfvars
vim terraform.tfvars  # Fill in your values

# 2. Initialize Terraform
terraform init

# 3. Deploy infrastructure
cd scripts
./setup-cluster.sh

# Or manually:
terraform plan
terraform apply
```

**Wait 2-3 minutes** for the cluster to fully initialize.

### Phase 2: Cluster Access

```bash
# Fetch kubeconfig
cd terraform/scripts
./get-kubeconfig.sh

# Set environment variable
export KUBECONFIG=~/.kube/config-budget

# Verify cluster
kubectl get nodes
# Should show 2 nodes in Ready state
```

### Phase 3: Application Deployment

**Note**: Kubernetes manifests need to be created separately (see k8s/ directory structure in the plan).

```bash
# Create namespace
kubectl create namespace budget-app

# Create secrets
kubectl create secret generic db-credentials \
  --from-literal=username=budgetuser \
  --from-literal=password=$(openssl rand -base64 32) \
  --from-literal=database=budgetdb \
  -n budget-app

# Apply manifests (after creating them)
kubectl apply -k k8s/base -n budget-app

# Check deployment
kubectl get pods -n budget-app
kubectl get pvc -n budget-app
kubectl get ingress -n budget-app
```

### Phase 4: DNS & SSL

```bash
# Get load balancer IP
terraform output loadbalancer_ip

# Add DNS A record:
# budget.yourdomain.com -> <loadbalancer_ip>

# Wait for DNS propagation
nslookup budget.yourdomain.com

# SSL will be handled by cert-manager (if configured)
```

## Quick Reference

### Useful Commands

```bash
# View all resources
kubectl get all -n budget-app

# Check logs
kubectl logs -f deployment/server -n budget-app
kubectl logs -f deployment/client -n budget-app
kubectl logs -f statefulset/postgres -n budget-app

# Exec into pod
kubectl exec -it deployment/server -n budget-app -- /bin/bash

# Port forwarding (for testing)
kubectl port-forward svc/server 8000:8000 -n budget-app

# Scale deployment
kubectl scale deployment server --replicas=3 -n budget-app

# View ingress
kubectl get ingress -n budget-app
kubectl describe ingress budget-app-ingress -n budget-app
```

### SSH Access

```bash
# Master node
cd terraform/scripts
./ssh-master.sh

# Worker node
./ssh-worker.sh

# Check k3s status
systemctl status k3s
journalctl -u k3s -f
```

### Monitoring

```bash
# Resource usage
kubectl top nodes
kubectl top pods -n budget-app

# Events
kubectl get events -n budget-app --sort-by='.lastTimestamp'

# Storage
kubectl get pv
kubectl get pvc -n budget-app
```

## Troubleshooting

### Pods not starting

```bash
# Describe pod to see events
kubectl describe pod <pod-name> -n budget-app

# Common issues:
# - Image pull errors: Check registry credentials
# - PVC pending: Check storage class and CSI driver
# - CrashLoopBackOff: Check logs and environment variables
```

### Database connection issues

```bash
# Check PostgreSQL pod
kubectl logs statefulset/postgres -n budget-app

# Verify service
kubectl get svc postgres -n budget-app

# Test connection from server pod
kubectl exec -it deployment/server -n budget-app -- \
  psql postgresql://budgetuser:password@postgres:5432/budgetdb
```

### Ingress not working

```bash
# Check ingress controller
kubectl get pods -n ingress-nginx

# Check ingress resource
kubectl describe ingress budget-app-ingress -n budget-app

# Test from master node
ssh root@$(cd terraform && terraform output -raw master_ip)
curl http://localhost
```

## Updating the Application

```bash
# Build new image
docker build -t yourusername/budget-server:v1.0.1 ./server
docker push yourusername/budget-server:v1.0.1

# Update deployment
kubectl set image deployment/server \
  server=yourusername/budget-server:v1.0.1 \
  -n budget-app

# Check rollout status
kubectl rollout status deployment/server -n budget-app

# Rollback if needed
kubectl rollout undo deployment/server -n budget-app
```

## Backup & Recovery

### Database Backup

```bash
# Create backup
kubectl exec statefulset/postgres -n budget-app -- \
  pg_dump -U budgetuser budgetdb > backup-$(date +%Y%m%d).sql

# Restore backup
kubectl exec -i statefulset/postgres -n budget-app -- \
  psql -U budgetuser budgetdb < backup-20250101.sql
```

### Volume Snapshots

```bash
# Via Hetzner CLI
hcloud volume list
hcloud volume create-snapshot <volume-id> \
  --description "backup-$(date +%Y%m%d)"

# Restore from snapshot
hcloud volume create-from-snapshot <snapshot-id> \
  --name postgres-data-restored
```

## Cleanup

```bash
# Delete application
kubectl delete namespace budget-app

# Destroy infrastructure
cd terraform/scripts
./destroy-cluster.sh

# Clean up local files
rm ~/.kube/config-budget
```

## Cost Optimization

- Use `CX11` servers for dev/staging (~€4/month each)
- Schedule scale-down during off-hours
- Use Hetzner volume snapshots (€0.01/GB/month) instead of keeping old volumes
- Monitor with `kubectl top` to right-size resources

## Security Checklist

- [ ] Restrict `admin_ip` to your specific IP in terraform.tfvars
- [ ] Use strong, randomly generated database passwords
- [ ] Enable SSL/TLS with cert-manager
- [ ] Implement NetworkPolicies to restrict pod communication
- [ ] Use RBAC for kubectl access
- [ ] Regularly update k3s and container images
- [ ] Enable audit logging
- [ ] Use sealed-secrets or external-secrets for sensitive data

## Next Steps

1. Create Kubernetes manifests in `k8s/` directory
2. Set up monitoring with Prometheus/Grafana
3. Configure automated backups
4. Set up CI/CD pipeline (GitHub Actions)
5. Implement auto-scaling with HPA
6. Add health check endpoints to your application

## Resources

- [Terraform Code](./terraform/)
- [Hetzner Cloud Docs](https://docs.hetzner.com/cloud/)
- [k3s Documentation](https://docs.k3s.io/)
- [Kubernetes Docs](https://kubernetes.io/docs/)

---

For infrastructure-specific details, see [terraform/README.md](./terraform/README.md)
