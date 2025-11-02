variable "project_name" {
  description = "Project name for resource naming"
  type        = string
}

variable "network_zone" {
  description = "Network zone for private network"
  type        = string
}

variable "network_cidr" {
  description = "CIDR block for private network"
  type        = string
}

variable "admin_ip" {
  description = "Admin IP address for SSH and K8s API access"
  type        = string
}
