# =============================================================================
# LXC 204 — nebula-dominion
# Ubuntu 22.04, unprivileged, nesting=1 (Docker support).
# 2 NIC: vmbr1 (internal 10.10.10.40) + vmbr0 (mgmt 192.168.1.231).
#
# Live state'i bu blok'la senkronize tutmak için, ilk uygulamada terraform
# import yapın:
#
#   terraform import 'proxmox_virtual_environment_container.nebula' caliptic/204
#
# Aksi takdirde 'terraform apply' mevcut LXC ile çakışır ve fail eder
# (vmid 204 zaten var).
# =============================================================================
resource "proxmox_virtual_environment_container" "nebula" {
  node_name    = var.proxmox_node
  vm_id        = var.lxc_id
  description  = "Nebula Dominion — Docker Compose stack (web + api + game-server + redis + minio). DB external @ ${var.postgres_internal_ip}."
  tags         = ["nebula", "docker", "webapp", "game"]

  unprivileged = true
  start_on_boot = true
  started       = true

  cpu {
    cores = var.lxc_cores
  }

  memory {
    dedicated = var.lxc_memory_mb
    swap      = var.lxc_swap_mb
  }

  disk {
    datastore_id = var.lxc_storage_pool
    size         = var.lxc_disk_gb
  }

  # vmbr1 — Caliptic internal (10.10.10.0/24).
  # Postgres, bastion nginx, monitoring stack hep buradan erişiliyor.
  network_interface {
    name     = "eth0"
    bridge   = "vmbr1"
    firewall = false
  }

  # vmbr0 — Yönetim ağı (Windows tarafından SSH).
  network_interface {
    name     = "eth1"
    bridge   = "vmbr0"
    firewall = false
  }

  initialization {
    hostname = var.lxc_hostname

    ip_config {
      ipv4 {
        address = var.lxc_internal_ip
        gateway = var.lxc_internal_gw
      }
    }

    ip_config {
      ipv4 {
        address = var.lxc_mgmt_ip
        gateway = var.lxc_mgmt_gw
      }
    }

    dns {
      servers = ["1.1.1.1", "8.8.8.8"]
    }

    user_account {
      password = var.lxc_password
      keys     = var.lxc_ssh_public_keys
    }
  }

  operating_system {
    template_file_id = var.lxc_template
    type             = "ubuntu"
  }

  features {
    nesting = true   # Docker-in-LXC için zorunlu
    keyctl  = true   # bazı Node modules için yararlı
  }
}

output "lxc_id" {
  value       = proxmox_virtual_environment_container.nebula.vm_id
  description = "LXC container ID (Proxmox vmid)."
}

output "lxc_internal_ip" {
  value       = trimsuffix(split("/", var.lxc_internal_ip)[0], "/")
  description = "LXC internal IP (vmbr1). Bastion nginx bu IP'ye proxy yapar."
}

output "lxc_mgmt_ip" {
  value       = trimsuffix(split("/", var.lxc_mgmt_ip)[0], "/")
  description = "LXC management IP (vmbr0). SSH erişimi için."
}
