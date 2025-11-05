variable "project_name" {
  description = "Project name for resource naming"
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

variable "target_servers" {
  description = "List of server IDs to add as targets"
  type        = list(number)
}
