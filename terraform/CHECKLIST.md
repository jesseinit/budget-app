# Pre-Deployment Checklist

Use this checklist before deploying your Kubernetes cluster to Hetzner Cloud.

## Prerequisites

### ✅ Hetzner Cloud Account
- [ ] Created Hetzner Cloud account at https://console.hetzner.cloud
- [ ] Created a new project for Budget App
- [ ] Generated API token with Read & Write permissions
- [ ] Saved API token securely (password manager or .env file)

### ✅ Local Tools
- [ ] Terraform installed (version >= 1.5.0)
  ```bash
  terraform --version
  ```
- [ ] kubectl installed (version >= 1.28.0)
  ```bash
  kubectl version --client
  ```
- [ ] hcloud CLI installed (optional but recommended)
  ```bash
  hcloud version
  ```

### ✅ SSH Keys
- [ ] SSH key pair generated
  ```bash
  ls ~/.ssh/id_rsa.pub  # Should exist
  ```
- [ ] Public key content copied
  ```bash
  cat ~/.ssh/id_rsa.pub
  ```

### ✅ Network Access
- [ ] Found your current IP address
  ```bash
  curl ifconfig.me
  ```
- [ ] Confirmed this IP is stable (not dynamic)
- [ ] Or prepared to use VPN for consistent access

## Configuration

### ✅ Terraform Variables
- [ ] Copied `terraform.tfvars.example` to `terraform.tfvars`
  ```bash
  cp terraform.tfvars.example terraform.tfvars
  ```
- [ ] Filled in `hcloud_token` with your API token
- [ ] Pasted `ssh_public_key` from `~/.ssh/id_rsa.pub`
- [ ] Set `admin_ip` to your IP address with /32 suffix
- [ ] Reviewed and adjusted server types (CPX21 recommended)
- [ ] Selected preferred `location` (nbg1, fsn1, or hel1)
- [ ] Ensured `network_zone` matches location (eu-central for Germany/Finland)

### ✅ Docker Images
- [ ] Decided on Docker registry (Docker Hub, GHCR, or Hetzner Registry)
- [ ] Built server Docker image
  ```bash
  docker build -t youruser/budget-server:v1.0.0 ./server
  ```
- [ ] Built client Docker image
  ```bash
  docker build -t youruser/budget-client:v1.0.0 ./client
  ```
- [ ] Pushed images to registry
  ```bash
  docker push youruser/budget-server:v1.0.0
  docker push youruser/budget-client:v1.0.0
  ```
- [ ] Verified images are accessible
  ```bash
  docker pull youruser/budget-server:v1.0.0
  ```

## Pre-Flight Checks

### ✅ Terraform Validation
- [ ] Initialized Terraform
  ```bash
  terraform init
  ```
- [ ] Validated configuration
  ```bash
  terraform validate
  # Should output: Success! The configuration is valid.
  ```
- [ ] Reviewed planned changes
  ```bash
  terraform plan
  ```
- [ ] Confirmed plan shows:
  - 2 servers (master + worker)
  - 1 network + 1 subnet
  - 1 firewall
  - 1 load balancer
  - 1 SSH key

### ✅ Cost Awareness
- [ ] Reviewed cost estimate (~€22-23/month)
- [ ] Confirmed budget approval
- [ ] Set up Hetzner billing alerts (optional)

### ✅ Security Review
- [ ] `admin_ip` is set to specific IP (not 0.0.0.0/0)
- [ ] `.gitignore` includes `terraform.tfvars`
- [ ] API token is not hardcoded in any committed files
- [ ] SSH private key is secure and not shared

## Deployment

### ✅ Infrastructure Provisioning
- [ ] Navigated to terraform directory
  ```bash
  cd terraform
  ```
- [ ] Ready to deploy via script
  ```bash
  cd scripts
  ./setup-cluster.sh
  ```
- [ ] OR ready to deploy manually
  ```bash
  terraform apply
  ```

### ✅ Post-Deployment Verification
After running `terraform apply`:

- [ ] Terraform completed without errors
- [ ] All outputs displayed correctly
- [ ] Recorded master IP address
- [ ] Recorded worker IP address
- [ ] Recorded load balancer IP address
- [ ] Waited 2-3 minutes for cloud-init to complete

### ✅ Cluster Access
- [ ] Fetched kubeconfig
  ```bash
  cd scripts
  ./get-kubeconfig.sh
  ```
- [ ] Set KUBECONFIG environment variable
  ```bash
  export KUBECONFIG=~/.kube/config-budget
  ```
- [ ] Verified cluster connection
  ```bash
  kubectl get nodes
  # Should show 2 nodes in Ready state
  ```
- [ ] Checked all system pods
  ```bash
  kubectl get pods -A
  # All pods should be Running
  ```

### ✅ Component Verification
- [ ] CSI driver is running
  ```bash
  kubectl get pods -n kube-system | grep csi
  ```
- [ ] Ingress controller is running
  ```bash
  kubectl get pods -n ingress-nginx
  ```
- [ ] Storage class exists
  ```bash
  kubectl get storageclass
  # Should show hcloud-volumes as default
  ```
- [ ] Load balancer is healthy
  ```bash
  curl http://$(terraform output -raw loadbalancer_ip)
  # Should get a response (even 404 is ok)
  ```

## Application Deployment Readiness

### ✅ Kubernetes Manifests
- [ ] Created k8s manifests directory
- [ ] Prepared namespace.yaml
- [ ] Prepared PostgreSQL StatefulSet
- [ ] Prepared Redis StatefulSet
- [ ] Prepared server Deployment
- [ ] Prepared client Deployment
- [ ] Prepared Ingress resource
- [ ] Updated image references to your registry

### ✅ Secrets & Config
- [ ] Generated strong database password
  ```bash
  openssl rand -base64 32
  ```
- [ ] Prepared to create Kubernetes secrets
- [ ] Have all environment variables documented
- [ ] Prepared ConfigMaps if needed

### ✅ DNS & Domain
- [ ] Have domain name ready (e.g., budget.yourdomain.com)
- [ ] Can access domain registrar/DNS provider
- [ ] Ready to add A record pointing to load balancer IP

## Post-Deployment

### ✅ Monitoring & Maintenance
- [ ] Documented cluster access information
- [ ] Saved kubeconfig safely
- [ ] Added cluster info to password manager
- [ ] Scheduled regular backups (if using)
- [ ] Set up monitoring alerts (optional)

### ✅ Documentation
- [ ] Documented any custom changes
- [ ] Updated team on cluster access
- [ ] Created runbook for common operations

## Rollback Plan

### ✅ Emergency Procedures
- [ ] Know how to destroy cluster: `./scripts/destroy-cluster.sh`
- [ ] Have local backups of terraform state
- [ ] Can redeploy from scratch if needed
- [ ] Have contact info for Hetzner support

## Final Checks

Before going to production:
- [ ] Tested application deployment in staging namespace
- [ ] Verified SSL/TLS certificates work
- [ ] Load tested the application
- [ ] Confirmed backup/restore procedures
- [ ] Reviewed security settings
- [ ] Updated documentation

## Quick Reference Commands

```bash
# View cluster status
kubectl get nodes
kubectl get pods -A

# Check terraform state
terraform state list

# Get cluster info
terraform output

# SSH to master
./scripts/ssh-master.sh

# Fetch fresh kubeconfig
./scripts/get-kubeconfig.sh

# Destroy everything
./scripts/destroy-cluster.sh
```

## Troubleshooting Contacts

- Hetzner Support: https://docs.hetzner.com/
- Terraform Issues: https://github.com/hashicorp/terraform/issues
- k3s Issues: https://github.com/k3s-io/k3s/issues

---

**Ready to deploy?** Make sure all checkboxes above are checked, then run:
```bash
cd terraform/scripts
./setup-cluster.sh
```

Good luck! 🚀
