.PHONY: help setup-cluster destroy-cluster get-kubeconfig ssh-master ssh-worker backup-sealed-secrets clean \
        kind-setup kind-destroy kind-kubeconfig kind-load-images kind-status \
        hetzner-setup hetzner-destroy hetzner-kubeconfig hetzner-ssh-master hetzner-ssh-worker \
        switch-kind switch-hetzner

# Default shell
SHELL := /bin/bash

# Paths
IAC_DIR := iac
HETZNER_DIR := $(IAC_DIR)/hetzner
KIND_DIR := $(IAC_DIR)/kind
HETZNER_SCRIPTS_DIR := $(HETZNER_DIR)/scripts
KIND_SCRIPTS_DIR := $(KIND_DIR)/scripts
KUBECONFIG_HETZNER := ~/.kube/config-budget
KUBECONFIG_KIND := ~/.kube/config-budget-local

# Backwards compatibility
SCRIPTS_DIR := $(HETZNER_SCRIPTS_DIR)
KUBECONFIG_FILE := $(KUBECONFIG_HETZNER)

help: ## Show this help message
	@echo "Budget App - Infrastructure Management"
	@echo ""
	@echo "Available commands:"
	@echo ""
	@echo "=== Local Development (Kind) ==="
	@grep -E '^kind-[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-25s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "=== Cloud Production (Hetzner) ==="
	@grep -E '^hetzner-[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-25s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "=== Utilities ==="
	@grep -E '^(switch|build|deploy|backup|clean|tf)-[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-25s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "=== Legacy Commands (use hetzner-* instead) ==="
	@grep -E '^(setup-cluster|destroy-cluster|get-kubeconfig|ssh-master|ssh-worker):.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[90m%-25s\033[0m %s\n", $$1, $$2}'

################################################################################
# Local Development - Kind Cluster
################################################################################

kind-setup: ## Create local Kind cluster with 2 nodes
	@echo "Setting up local Kind cluster..."
	@cd $(KIND_SCRIPTS_DIR) && ./setup-cluster.sh
	@echo ""
	@echo "Cluster ready! To use it:"
	@echo "  export KUBECONFIG=$(KUBECONFIG_KIND)"
	@echo "  kubectl get nodes"

kind-destroy: ## Destroy local Kind cluster
	@echo "Destroying local Kind cluster..."
	@cd $(KIND_SCRIPTS_DIR) && ./destroy-cluster.sh

kind-kubeconfig: ## Export Kind kubeconfig
	@echo "Exporting Kind kubeconfig..."
	@cd $(KIND_SCRIPTS_DIR) && ./get-kubeconfig.sh
	@echo "Set it with: export KUBECONFIG=$(KUBECONFIG_KIND)"

kind-load-images: ## Load existing local Docker images into Kind cluster
	@echo "Loading images into Kind cluster..."
	@cd $(KIND_SCRIPTS_DIR) && ./load-images.sh

kind-build: ## Build and load images for Kind cluster (local development)
	@echo "Building and loading images into Kind cluster..."
	@cd $(KIND_SCRIPTS_DIR) && ./build-and-load.sh

kind-status: ## Show Kind cluster status
	@echo "Kind Cluster Status:"
	@kind get clusters 2>/dev/null | grep -q "budget-app-local" && \
		(export KUBECONFIG=$(KUBECONFIG_KIND) && \
		 echo "Cluster: budget-app-local (running)" && \
		 echo "" && \
		 kubectl get nodes && \
		 echo "" && \
		 kubectl get pods -A) || \
		echo "Cluster not found. Run 'make kind-setup' to create it."

################################################################################
# Cloud Production - Hetzner Cloud
################################################################################

hetzner-setup: ## Create Kubernetes cluster on Hetzner Cloud
	@echo "Setting up Kubernetes cluster on Hetzner Cloud..."
	@cd $(HETZNER_SCRIPTS_DIR) && ./setup-cluster.sh
	@echo ""
	@echo "Cluster ready! To use it:"
	@echo "  export KUBECONFIG=$(KUBECONFIG_HETZNER)"
	@echo "  kubectl get nodes"

hetzner-destroy: ## Destroy Hetzner Cloud cluster and all resources
	@echo "WARNING: This will destroy all infrastructure on Hetzner Cloud!"
	@read -p "Are you sure? Type '1' to confirm: " confirm; \
	if [ "$$confirm" = "1" ]; then \
		cd $(HETZNER_SCRIPTS_DIR) && ./destroy-cluster.sh; \
	else \
		echo "Destroy cancelled."; \
	fi

hetzner-kubeconfig: ## Fetch kubeconfig from Hetzner cluster
	@echo "Fetching kubeconfig from Hetzner cluster..."
	@cd $(HETZNER_SCRIPTS_DIR) && ./get-kubeconfig.sh
	@echo "Kubeconfig saved to $(KUBECONFIG_HETZNER)"
	@echo "Set it with: export KUBECONFIG=$(KUBECONFIG_HETZNER)"

hetzner-ssh-master: ## SSH into the Hetzner master node
	@cd $(HETZNER_SCRIPTS_DIR) && ./ssh-master.sh

hetzner-ssh-worker: ## SSH into a Hetzner worker node
	@cd $(HETZNER_SCRIPTS_DIR) && ./ssh-worker.sh

################################################################################
# Utilities
################################################################################

switch-kind: ## Switch kubectl context to Kind cluster
	@echo "Switching to Kind cluster..."
	@export KUBECONFIG=$(KUBECONFIG_KIND) && kubectl config current-context
	@echo ""
	@echo "Run: export KUBECONFIG=$(KUBECONFIG_KIND)"

switch-hetzner: ## Switch kubectl context to Hetzner cluster
	@echo "Switching to Hetzner cluster..."
	@export KUBECONFIG=$(KUBECONFIG_HETZNER) && kubectl config current-context
	@echo ""
	@echo "Run: export KUBECONFIG=$(KUBECONFIG_HETZNER)"

################################################################################
# Legacy Commands (for backwards compatibility)
################################################################################

setup-cluster: ## [DEPRECATED] Use hetzner-setup instead
	@echo "⚠️  DEPRECATED: Use 'make hetzner-setup' instead"
	@$(MAKE) hetzner-setup

destroy-cluster: ## [DEPRECATED] Use hetzner-destroy instead
	@echo "⚠️  DEPRECATED: Use 'make hetzner-destroy' instead"
	@$(MAKE) hetzner-destroy

get-kubeconfig: ## [DEPRECATED] Use hetzner-kubeconfig instead
	@echo "⚠️  DEPRECATED: Use 'make hetzner-kubeconfig' instead"
	@$(MAKE) hetzner-kubeconfig

ssh-master: ## [DEPRECATED] Use hetzner-ssh-master instead
	@echo "⚠️  DEPRECATED: Use 'make hetzner-ssh-master' instead"
	@$(MAKE) hetzner-ssh-master

ssh-worker: ## [DEPRECATED] Use hetzner-ssh-worker instead
	@echo "⚠️  DEPRECATED: Use 'make hetzner-ssh-worker' instead"
	@$(MAKE) hetzner-ssh-worker

backup-sealed-secrets: ## Backup sealed-secrets encryption key
	@echo "Backing up sealed-secrets key..."
	@cd k8s && ./backup-sealed-secrets-key.sh

tf-init: ## Initialize Terraform for Hetzner
	@echo "Initializing Terraform for Hetzner..."
	@cd $(HETZNER_DIR) && terraform init

tf-plan: ## Run Terraform plan for Hetzner
	@echo "Running Terraform plan for Hetzner..."
	@cd $(HETZNER_DIR) && terraform plan

tf-apply: ## Apply Terraform changes for Hetzner
	@echo "Applying Terraform changes for Hetzner..."
	@cd $(HETZNER_DIR) && terraform apply

tf-destroy: ## Destroy Hetzner infrastructure with Terraform
	@echo "WARNING: This will destroy all Hetzner infrastructure!"
	@read -p "Are you sure? Type 'yes' to confirm: " confirm; \
	if [ "$$confirm" = "yes" ]; then \
		cd $(HETZNER_DIR) && terraform destroy; \
	else \
		echo "Destroy cancelled."; \
	fi

cleanup-volumes: ## Clean up orphaned Hetzner Cloud volumes (interactive)
	@echo "Cleaning up orphaned Hetzner Cloud volumes..."
	@cd $(HETZNER_SCRIPTS_DIR) && ./cleanup-orphaned-volumes.sh

cleanup-volumes-auto: ## Auto clean up orphaned volumes (no confirmation)
	@echo "Auto-cleaning orphaned Hetzner Cloud volumes..."
	@cd $(HETZNER_SCRIPTS_DIR) && ./cleanup-orphaned-volumes-auto.sh

clean: ## Clean up local files (kubeconfig, terraform state backups)
	@echo "Cleaning up local files..."
	@rm -f $(KUBECONFIG_HETZNER)
	@rm -f $(KUBECONFIG_KIND)
	@cd $(HETZNER_DIR) && rm -f terraform.tfstate.backup
	@echo "Clean complete"

build-client: ## Build and push client Docker image (multi-platform)
	@echo "Building and pushing client image..."
	docker buildx build --platform linux/amd64,linux/arm64 -t ghcr.io/jesseinit/budget-client:latest --push client/

build-api: ## Build and push API Docker image (multi-platform)
	@echo "Building and pushing API image..."
	docker buildx build --platform linux/amd64,linux/arm64 -t ghcr.io/jesseinit/budget-server:latest --push server/

build-all: ## Build and push both client and API Docker images
	@echo "Building and pushing all images..."
	@$(MAKE) build-client
	@$(MAKE) build-api

deploy: ## Deploy Kubernetes resources (respects current KUBECONFIG)
	@echo "Deploying Kubernetes resources to current cluster..."
	@echo "Current context: $$(kubectl config current-context 2>/dev/null || echo 'Not set')"
	@read -p "Continue with deployment? (y/N): " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		kubectl apply -k k8s/base/ && \
		echo "Restarting deployments..." && \
		kubectl rollout restart deployment/backend -n budget-app && \
		kubectl rollout restart deployment/frontend -n budget-app && \
		echo "Waiting for deployments to be ready..." && \
		kubectl rollout status deployment/backend -n budget-app && \
		kubectl rollout status deployment/frontend -n budget-app && \
		echo "Deployment complete!"; \
	else \
		echo "Deployment cancelled."; \
	fi

deploy-kind: ## Deploy to local Kind cluster (uses local images)
	@echo "Deploying to local Kind cluster with local images..."
	@export KUBECONFIG=$(KUBECONFIG_KIND) && \
		kubectl apply -k k8s/overlays/local/ && \
		kubectl rollout restart deployment/backend -n budget-app && \
		kubectl rollout restart deployment/frontend -n budget-app

deploy-hetzner: ## Deploy to Hetzner cluster (uses GHCR images)
	@echo "Deploying to Hetzner cluster with GHCR images..."
	@export KUBECONFIG=$(KUBECONFIG_HETZNER) && \
		kubectl apply -k k8s/overlays/production/ && \
		kubectl rollout restart deployment/backend -n budget-app && \
		kubectl rollout restart deployment/frontend -n budget-app

.DEFAULT_GOAL := help