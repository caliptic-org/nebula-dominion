terraform {
  required_version = ">= 1.5.0"

  required_providers {
    proxmox = {
      source  = "bpg/proxmox"
      version = ">= 0.66.0"
    }
    null = {
      source  = "hashicorp/null"
      version = ">= 3.2.0"
    }
    random = {
      source  = "hashicorp/random"
      version = ">= 3.6.0"
    }
  }
}

# Proxmox API'sine bağlanır. Endpoint + credentials variables.tf'tan,
# secret'lar terraform.tfvars'tan (commit edilmemiş) gelir.
provider "proxmox" {
  endpoint  = var.proxmox_endpoint
  api_token = var.proxmox_api_token == "" ? null : var.proxmox_api_token
  username  = var.proxmox_api_token == "" ? "root@pam" : null
  password  = var.proxmox_api_token == "" ? var.proxmox_password : null
  insecure  = true

  # bpg/proxmox bazı container operasyonları için SSH ile host'a bağlanır
  # (template upload, snapshot, vs.). LXC create için zorunlu değil ama
  # tutarlılık için ekli.
  ssh {
    agent       = false
    username    = "root"
    private_key = var.proxmox_ssh_private_key
  }
}
