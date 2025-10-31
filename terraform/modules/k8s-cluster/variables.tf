variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "hcloud_token" {
  description = "Hetzner Cloud API token for CSI driver"
  type        = string
  sensitive   = true
}

variable "ssh_public_key" {
  description = "SSH public key for server access"
  type        = string
}

variable "master_server_type" {
  description = "Server type for master node"
  type        = string
}

variable "worker_server_type" {
  description = "Server type for worker node"
  type        = string
}

variable "location" {
  description = "Hetzner datacenter location"
  type        = string
}

variable "network_id" {
  description = "ID of the private network"
  type        = string
}

variable "network_subnet" {
  description = "CIDR block of the subnet"
  type        = string
}

variable "firewall_id" {
  description = "ID of the firewall"
  type        = string
}
