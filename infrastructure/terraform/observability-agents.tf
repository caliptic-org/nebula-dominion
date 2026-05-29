# =============================================================================
# Observability agent compose dosyalarını LXC'ye render eder.
#
# Bunlar templatefile() ile üretilir ve LXC create edildikten SONRA
# null_resource + remote-exec ile /opt/'a deploy edilir. Caliptic
# monitoring stack'i tarafına (10.10.10.30) bu LXC'yi tanıtmak için
# de remote-exec'le bir DOZZLE_REMOTE_AGENT env güncellemesi yapar.
#
# Üretim ortamındaki state'i değiştirmeden tutmak için, mevcut LXC'yi
# terraform import sonrası ilk apply'da bu null_resource'lar idempotent
# çalışır (compose up -d zaten ayakta olan container'ı yeniden create
# etmez).
# =============================================================================

locals {
  internal_ip = trimsuffix(split("/", var.lxc_internal_ip)[0], "/")
  mgmt_ip     = trimsuffix(split("/", var.lxc_mgmt_ip)[0], "/")

  # Compose şablonlarını templatefile ile inline render edip /opt/'a
  # yazıyoruz. Caliptic infra'daki pattern'le birebir aynı
  # (DOZZLE_HOSTNAME farklı, port aynı).
  dozzle_agent_compose = templatefile("${path.module}/templates/dozzle-agent.yml.tpl", {
    internal_ip = local.internal_ip
    hostname    = "nebula"
  })

  portainer_agent_compose = templatefile("${path.module}/templates/portainer-agent.yml.tpl", {
    internal_ip = local.internal_ip
  })
}

# Dozzle agent — LXC 204 docker.sock'u 10.10.10.40:7007'de TLS ile expose eder.
# Caliptic monitoring VM'indeki main Dozzle (logs.caliptic.com)
# DOZZLE_REMOTE_AGENT env'iyle bu agent'e bağlanır.
resource "null_resource" "dozzle_agent" {
  triggers = {
    compose_sha = sha256(local.dozzle_agent_compose)
    lxc_id      = proxmox_virtual_environment_container.nebula.vm_id
  }

  connection {
    type        = "ssh"
    user        = "root"
    host        = local.mgmt_ip
    private_key = var.proxmox_ssh_private_key
  }

  provisioner "remote-exec" {
    inline = [
      "mkdir -p /opt/dozzle-agent",
      "cat > /opt/dozzle-agent/docker-compose.yml <<'COMPOSE'\n${local.dozzle_agent_compose}\nCOMPOSE",
      "cd /opt/dozzle-agent && docker compose up -d",
    ]
  }

  depends_on = [proxmox_virtual_environment_container.nebula]
}

# Portainer agent — LXC 204 docker.sock'u 10.10.10.40:9501'de TLS ile expose
# eder (9001 MinIO console ile çakışıyordu, 9501'e aldık).
# Portainer (portainer.caliptic.com) UI'sında "Add Environment → Agent" diye
# 10.10.10.40:9501 olarak elle eklenir (Portainer admin API kullanılmıyor,
# token state'i Terraform'a dahil olmasın diye).
resource "null_resource" "portainer_agent" {
  triggers = {
    compose_sha = sha256(local.portainer_agent_compose)
    lxc_id      = proxmox_virtual_environment_container.nebula.vm_id
  }

  connection {
    type        = "ssh"
    user        = "root"
    host        = local.mgmt_ip
    private_key = var.proxmox_ssh_private_key
  }

  provisioner "remote-exec" {
    inline = [
      "mkdir -p /opt/portainer-agent",
      "cat > /opt/portainer-agent/docker-compose.yml <<'COMPOSE'\n${local.portainer_agent_compose}\nCOMPOSE",
      "cd /opt/portainer-agent && docker compose up -d",
    ]
  }

  depends_on = [proxmox_virtual_environment_container.nebula]
}

# node_exporter — Prometheus scrape'in node-exporter target listesine
# 10.10.10.40:9100 zaten eklendi (manuel). Terraform-managed reinstall'da
# tekrar koşturulabilir.
resource "null_resource" "node_exporter" {
  triggers = {
    lxc_id = proxmox_virtual_environment_container.nebula.vm_id
  }

  connection {
    type        = "ssh"
    user        = "root"
    host        = local.mgmt_ip
    private_key = var.proxmox_ssh_private_key
  }

  provisioner "remote-exec" {
    inline = [
      "DEBIAN_FRONTEND=noninteractive apt-get install -y -qq prometheus-node-exporter",
      "systemctl enable --now prometheus-node-exporter",
    ]
  }

  depends_on = [proxmox_virtual_environment_container.nebula]
}

output "observability_endpoints" {
  description = "LXC 204'ün observability endpoint'leri. Caliptic monitoring stack'inin scrape config'lerine bu adresler eklenir."
  value = {
    node_exporter   = "${local.internal_ip}:9100"
    dozzle_agent    = "${local.internal_ip}:7007"
    portainer_agent = "${local.internal_ip}:9501"
  }
}
