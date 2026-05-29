# =============================================================================
# Proxmox connection
# =============================================================================
variable "proxmox_endpoint" {
  description = "Proxmox API URL (örn. https://192.168.1.220:8006/)"
  type        = string
}

variable "proxmox_api_token" {
  description = "Proxmox API token (`user@realm!tokenid=secret`). Boşsa password kullanılır."
  type        = string
  default     = ""
  sensitive   = true
}

variable "proxmox_password" {
  description = "Proxmox root@pam şifresi (api_token boşsa kullanılır)."
  type        = string
  default     = ""
  sensitive   = true
}

variable "proxmox_ssh_private_key" {
  description = "Proxmox host root@192.168.1.220 SSH private key (bpg/proxmox bazı ops için talep ediyor)."
  type        = string
  sensitive   = true
}

variable "proxmox_node" {
  description = "Proxmox node adı (cluster yoksa hostname, default 'caliptic' veya 'pve')."
  type        = string
  default     = "caliptic"
}

# =============================================================================
# LXC 204 — nebula-dominion container
# =============================================================================
variable "lxc_id" {
  description = "LXC vmid. Caliptic VM range (200-203) ile çakışmasın."
  type        = number
  default     = 204
}

variable "lxc_hostname" {
  description = "LXC hostname (DNS + prompt)."
  type        = string
  default     = "nebula-dominion"
}

variable "lxc_cores" {
  description = "vCPU sayısı."
  type        = number
  default     = 4
}

variable "lxc_memory_mb" {
  description = "RAM (MB)."
  type        = number
  default     = 8192
}

variable "lxc_swap_mb" {
  description = "Swap (MB)."
  type        = number
  default     = 2048
}

variable "lxc_disk_gb" {
  description = "Root disk boyutu (GB)."
  type        = number
  default     = 30
}

variable "lxc_storage_pool" {
  description = "Proxmox storage pool (local-lvm / local-zfs)."
  type        = string
  default     = "local-lvm"
}

variable "lxc_template" {
  description = "LXC template URL veya storage:vztmpl/file."
  type        = string
  default     = "local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst"
}

variable "lxc_password" {
  description = "LXC root şifresi (cloud-init benzeri ilk login için, SSH key zaten ekli)."
  type        = string
  sensitive   = true
}

variable "lxc_ssh_public_keys" {
  description = "LXC root'a eklenecek SSH public key satırları."
  type        = list(string)
  default     = []
}

# =============================================================================
# Network
# =============================================================================
variable "lxc_internal_ip" {
  description = "vmbr1 internal network IP/mask (Caliptic VMs ile aynı /24)."
  type        = string
  default     = "10.10.10.40/24"
}

variable "lxc_internal_gw" {
  description = "Internal network gateway."
  type        = string
  default     = "10.10.10.1"
}

variable "lxc_mgmt_ip" {
  description = "vmbr0 mgmt network IP/mask (Windows-tan SSH erişimi)."
  type        = string
  default     = "192.168.1.231/24"
}

variable "lxc_mgmt_gw" {
  description = "Mgmt network gateway."
  type        = string
  default     = "192.168.1.1"
}

# =============================================================================
# External services Nebula bağlanıyor
# =============================================================================
variable "postgres_internal_ip" {
  description = "Caliptic-postgres VM internal IP (LXC 204 buraya DB için bağlanır)."
  type        = string
  default     = "10.10.10.20"
}

variable "monitoring_internal_ip" {
  description = "Caliptic monitoring VM internal IP (Prometheus + Dozzle + Portainer + Uptime Kuma host)."
  type        = string
  default     = "10.10.10.30"
}

variable "bastion_internal_ip" {
  description = "Caliptic bastion VM internal IP (nginx reverse proxy host)."
  type        = string
  default     = "10.10.10.10"
}
