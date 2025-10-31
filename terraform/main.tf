terraform {
  required_version = ">= 1.5.0"

  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.45"
    }
  }
}

provider "hcloud" {
  token = var.hcloud_token
}

# Network module - Creates VPC and firewall rules
module "network" {
  source = "./modules/network"

  project_name  = var.project_name
  network_zone  = var.network_zone
  network_cidr  = var.network_cidr
  admin_ip      = var.admin_ip
}

# K8s cluster module - Creates master and worker nodes
module "k8s_cluster" {
  source = "./modules/k8s-cluster"

  project_name   = var.project_name
  hcloud_token   = var.hcloud_token
  ssh_public_key = var.ssh_public_key

  master_server_type = var.master_server_type
  worker_server_type = var.worker_server_type
  location           = var.location

  network_id     = module.network.network_id
  network_subnet = module.network.subnet_cidr
  firewall_id    = module.network.firewall_id

  depends_on = [module.network]
}

# Load balancer module - Creates LB for ingress
module "loadbalancer" {
  source = "./modules/loadbalancer"

  project_name = var.project_name
  location     = var.location
  network_id   = module.network.network_id

  target_servers = [
    module.k8s_cluster.master_server_id,
    module.k8s_cluster.worker_server_id
  ]

  depends_on = [module.k8s_cluster]
}
