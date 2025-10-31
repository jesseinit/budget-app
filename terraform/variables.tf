variable "hcloud_token" {
  description = "Hetzner Cloud API token"
  type        = string
  sensitive   = true
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "budget-app"
}

variable "location" {
  description = "Hetzner datacenter location (nbg1, fsn1, hel1, ash, hil)"
  type        = string
  default     = "nbg1"
}

variable "network_zone" {
  description = "Network zone for private network (eu-central, us-east, us-west)"
  type        = string
  default     = "eu-central"
}

variable "network_cidr" {
  description = "CIDR block for private network"
  type        = string
  default     = "10.0.0.0/16"
}

variable "master_server_type" {
  description = "Server type for Kubernetes master node"
  type        = string
  default     = "cpx21" # 3 vCPU, 4GB RAM, 80GB disk
}

variable "worker_server_type" {
  description = "Server type for Kubernetes worker node"
  type        = string
  default     = "cpx21" # 3 vCPU, 4GB RAM, 80GB disk
}

variable "ssh_public_key" {
  description = "SSH public key for server access"
  type        = string
}

variable "admin_ip" {
  description = "Admin IP address for SSH access (CIDR notation, e.g., 1.2.3.4/32)"
  type        = string
}
