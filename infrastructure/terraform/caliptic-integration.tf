# =============================================================================
# Caliptic infra entegrasyonları — LXC 204'ü diğer VM'lerin config'lerine
# tanıtır. Bu blokların hepsi remote-exec ile Caliptic VM'lerine bağlanır,
# Terraform-managed state'i tutmaz (out-of-band değişikliklerle çakışmasın
# diye).
#
# İdempotent yazıldı: var olan target zaten varsa noop, yoksa ekler.
# =============================================================================

# --- Prometheus scrape target: node-exporter ---------------------------------
# Caliptic monitoring VM (10.10.10.30) `~/monitoring/prometheus.yml`
# içine 10.10.10.40:9100'ü ekler (node-exporter job).
resource "null_resource" "caliptic_prometheus_target" {
  triggers = {
    lxc_id    = proxmox_virtual_environment_container.nebula.vm_id
    target_ip = local.internal_ip
  }

  connection {
    type        = "ssh"
    user        = "ocp"
    host        = var.monitoring_internal_ip
    private_key = var.proxmox_ssh_private_key
  }

  provisioner "remote-exec" {
    inline = [
      <<-EOT
        if ! grep -q '${local.internal_ip}:9100' ~/monitoring/prometheus.yml; then
          python3 <<PY
import re
p = '/home/ocp/monitoring/prometheus.yml'
with open(p) as f: c = f.read()
needle = "          - '10.10.10.20:9100'        # postgres"
add = "\n          - '${local.internal_ip}:9100'        # nebula-dominion LXC (game)"
if needle in c and '${local.internal_ip}:9100' not in c:
    c = c.replace(needle, needle + add)
    with open(p, 'w') as f: f.write(c)
    print('added nebula target')
else:
    print('noop')
PY
          sudo docker exec prometheus wget -qS --post-data='' http://localhost:9090/-/reload 2>&1 | head -1
        fi
      EOT
    ]
  }

  depends_on = [
    proxmox_virtual_environment_container.nebula,
    null_resource.node_exporter,
  ]
}

# --- Main Dozzle (logs.caliptic.com) DOZZLE_REMOTE_AGENT güncellemesi --------
# Bastion + postgres VM'lerin agent'ı zaten env'de listede;
# 10.10.10.40:7007'yi ekler. Idempotent.
resource "null_resource" "caliptic_dozzle_remote_agent" {
  triggers = {
    lxc_id    = proxmox_virtual_environment_container.nebula.vm_id
    target_ip = local.internal_ip
  }

  connection {
    type        = "ssh"
    user        = "ocp"
    host        = var.monitoring_internal_ip
    private_key = var.proxmox_ssh_private_key
  }

  provisioner "remote-exec" {
    inline = [
      <<-EOT
        if ! grep -q 'DOZZLE_REMOTE_AGENT:.*${local.internal_ip}:7007' ~/monitoring/docker-compose.monitoring.yml; then
          sed -i 's|DOZZLE_REMOTE_AGENT:.*|&,${local.internal_ip}:7007|' ~/monitoring/docker-compose.monitoring.yml
          cd ~/monitoring && sudo docker compose -f docker-compose.monitoring.yml up -d dozzle
        fi
      EOT
    ]
  }

  depends_on = [
    proxmox_virtual_environment_container.nebula,
    null_resource.dozzle_agent,
  ]
}

# --- Bastion nginx vhost ----------------------------------------------------
# Caliptic bastion'a (10.10.10.10) 3 Nebula vhost'unu yazar.
# Mevcut /etc/nginx/sites-available/nebula-proxy.conf var ise dokunmaz.
resource "null_resource" "bastion_nginx_vhost" {
  triggers = {
    lxc_id    = proxmox_virtual_environment_container.nebula.vm_id
    target_ip = local.internal_ip
  }

  connection {
    type        = "ssh"
    user        = "ocp"
    host        = var.bastion_internal_ip
    private_key = var.proxmox_ssh_private_key
  }

  provisioner "file" {
    source      = "${path.module}/templates/nebula-nginx.conf"
    destination = "/tmp/nebula-proxy.conf"
  }

  provisioner "remote-exec" {
    inline = [
      "if [ ! -f /etc/nginx/sites-available/nebula-proxy.conf ]; then sudo mv /tmp/nebula-proxy.conf /etc/nginx/sites-available/nebula-proxy.conf && sudo ln -sf /etc/nginx/sites-available/nebula-proxy.conf /etc/nginx/sites-enabled/ && sudo nginx -t && sudo systemctl reload nginx; else echo 'nebula-proxy.conf zaten var, dokunulmadı'; rm /tmp/nebula-proxy.conf; fi",
    ]
  }

  depends_on = [proxmox_virtual_environment_container.nebula]
}

# --- Postgres DB + user ------------------------------------------------------
# Caliptic-postgres VM'inde (10.10.10.20) nebula user + nebula_dominion DB
# oluşturur. Şifre random_password ile üretilir ve postgres VM'de
# /root/nebula-pg-pass.txt'ye yazılır. Aynı şifre output olarak LXC'ye
# .env üretmek için kullanılır.
resource "random_password" "nebula_pg" {
  length  = 48
  special = false
}

resource "null_resource" "postgres_db_user" {
  triggers = {
    db_password_hash = sha256(random_password.nebula_pg.result)
  }

  connection {
    type        = "ssh"
    user        = "ocp"
    host        = var.postgres_internal_ip
    private_key = var.proxmox_ssh_private_key
  }

  provisioner "remote-exec" {
    inline = [
      <<-EOT
        sudo -u postgres psql <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nebula') THEN
    CREATE USER nebula WITH PASSWORD '${random_password.nebula_pg.result}';
  ELSE
    ALTER USER nebula WITH PASSWORD '${random_password.nebula_pg.result}';
  END IF;
END
\$\$;
SELECT 'CREATE DATABASE nebula_dominion OWNER nebula' WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'nebula_dominion')\gexec
GRANT ALL PRIVILEGES ON DATABASE nebula_dominion TO nebula;
\c nebula_dominion
GRANT ALL ON SCHEMA public TO nebula;
SQL
        echo '${random_password.nebula_pg.result}' | sudo tee /root/nebula-pg-pass.txt > /dev/null
        sudo chmod 600 /root/nebula-pg-pass.txt
      EOT
    ]
  }
}

output "postgres_database_url" {
  description = "LXC 204 .env'ine konulacak DATABASE_URL (sensitive)."
  value       = "postgresql://nebula:${random_password.nebula_pg.result}@${var.postgres_internal_ip}:5432/nebula_dominion"
  sensitive   = true
}
