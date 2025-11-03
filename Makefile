.PHONY: help setup-cluster destroy-cluster get-kubeconfig ssh-master ssh-worker backup-sealed-secrets clean

# Default shell
SHELL := /bin/bash

# Paths
IAC_DIR := iac
SCRIPTS_DIR := $(IAC_DIR)/scripts
KUBECONFIG_FILE := ~/.kube/config

help: ## Show this help message
	@echo "Budget App - Infrastructure Management"
	@echo ""
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

setup-cluster: ## Create the Kubernetes cluster on Hetzner Cloud
	@echo "Setting up Kubernetes cluster..."
	@cd $(SCRIPTS_DIR) && ./setup-cluster.sh

destroy-cluster: ## Destroy the Kubernetes cluster and all resources
	@echo "WARNING: This will destroy all infrastructure!"
	@read -p "Are you sure? Type 'yes' to confirm: " confirm; \
	if [ "$$confirm" = "yes" ]; then \
		cd $(SCRIPTS_DIR) && ./destroy-cluster.sh; \
	else \
		echo "Destroy cancelled."; \
	fi

get-kubeconfig: ## Fetch kubeconfig from the cluster
	@echo "Fetching kubeconfig..."
	@cd $(SCRIPTS_DIR) && ./get-kubeconfig.sh
	@echo "Kubeconfig saved to $(KUBECONFIG_FILE)"
	@echo "Set it with: export KUBECONFIG=$(KUBECONFIG_FILE)"

ssh-master: ## SSH into the master node
	@cd $(SCRIPTS_DIR) && ./ssh-master.sh

ssh-worker: ## SSH into a worker node (default: worker-1)
	@cd $(SCRIPTS_DIR) && ./ssh-worker.sh 1

backup-sealed-secrets: ## Backup sealed-secrets encryption key
	@echo "Backing up sealed-secrets key..."
	@cd k8s && ./backup-sealed-secrets-key.sh

tf-init: ## Initialize Terraform
	@echo "Initializing Terraform..."
	@cd $(IAC_DIR) && terraform init

tf-plan: ## Run Terraform plan
	@echo "Running Terraform plan..."
	@cd $(IAC_DIR) && terraform plan

tf-apply: ## Apply Terraform changes
	@echo "Applying Terraform changes..."
	@cd $(IAC_DIR) && terraform apply

tf-destroy: ## Destroy infrastructure with Terraform
	@echo "WARNING: This will destroy all infrastructure!"
	@read -p "Are you sure? Type 'yes' to confirm: " confirm; \
	if [ "$$confirm" = "yes" ]; then \
		cd $(IAC_DIR) && terraform destroy; \
	else \
		echo "Destroy cancelled."; \
	fi

cleanup-volumes: ## Clean up orphaned Hetzner Cloud volumes (interactive)
	@echo "Cleaning up orphaned Hetzner Cloud volumes..."
	@cd $(SCRIPTS_DIR) && ./cleanup-orphaned-volumes.sh

cleanup-volumes-auto: ## Auto clean up orphaned volumes (no confirmation)
	@echo "Auto-cleaning orphaned Hetzner Cloud volumes..."
	@cd $(SCRIPTS_DIR) && ./cleanup-orphaned-volumes-auto.sh

clean: ## Clean up local files (kubeconfig, terraform state backups)
	@echo "Cleaning up local files..."
	@rm -f $(KUBECONFIG_FILE)
	@cd $(IAC_DIR) && rm -f terraform.tfstate.backup
	@echo "Clean complete"

build-client: ## Build and push client Docker image
	@echo "Building and pushing client image..."
	docker buildx build --platform linux/amd64 -t ghcr.io/jesseinit/budget-client:v1.0.0 --push client/

build-api: ## Build and push API Docker image
	@echo "Building and pushing API image..."
	docker buildx build --platform linux/amd64 -t ghcr.io/jesseinit/budget-server:v1.0.0 --push server/

build-all: ## Build and push both client and API Docker images
	@echo "Building and pushing all images..."
	@$(MAKE) build-client
	@$(MAKE) build-api

deploy: ## Deploy Kubernetes resources from k8s/base
	@echo "Deploying Kubernetes resources..."
	kubectl apply -k k8s/base/
	@echo "Restarting deployments..."
	kubectl rollout restart deployment/backend -n budget-app
	kubectl rollout restart deployment/frontend -n budget-app
	@echo "Waiting for deployments to be ready..."
	kubectl rollout status deployment/backend -n budget-app
	kubectl rollout status deployment/frontend -n budget-app
	@echo "Deployment complete!"

.DEFAULT_GOAL := help