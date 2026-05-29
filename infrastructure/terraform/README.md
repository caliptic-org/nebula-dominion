# Terraform — Nebula Dominion Infrastructure

Bu klasör Nebula Dominion'un Proxmox üzerindeki LXC 204 container'ını ve
Caliptic monitoring stack'ine entegrasyon noktalarını Terraform ile
yönetir.

> **Mevcut state**: LXC 204 + DB + monitoring entegrasyonları manuel olarak
> ayarlandı (DEPLOYMENT.md'deki gibi). Bu Terraform code'u o state'i
> **import** edip kalıcı yapmak için yazıldı. `terraform apply`'dan ÖNCE
> import adımlarını yapmadan koşturma, mevcut LXC'yi yeniden create
> etmeye çalışır ve fail eder.

## Dosya yapısı

```
infrastructure/terraform/
├── providers.tf              # bpg/proxmox + null + random
├── variables.tf              # tüm input variable'lar
├── lxc-nebula.tf             # LXC 204 resource'u
├── observability-agents.tf   # LXC içine dozzle/portainer/node-exporter
├── caliptic-integration.tf   # Caliptic VM'lerine LXC'yi tanıt
├── templates/                # compose + nginx şablonları
│   ├── dozzle-agent.yml.tpl
│   ├── portainer-agent.yml.tpl
│   └── nebula-nginx.conf
├── terraform.tfvars.example  # tfvars şablonu (commit'lenir)
└── .gitignore                # *.tfvars + *.tfstate
```

## İlk kurulum (sıfırdan)

```powershell
cd D:\nebula\me\nebula-dominion\infrastructure\terraform

# 1. tfvars'ı doldur (Proxmox creds, SSH key, LXC password)
cp terraform.tfvars.example terraform.tfvars
notepad terraform.tfvars

# 2. Init
terraform init

# 3. Plan
terraform plan
# Beklenen: 1 container + 4 null_resource + 1 random_password create.

# 4. Apply
terraform apply
# ~3 dakika: LXC create + cloud-init + agent compose'lar + Caliptic
# entegrasyonları.
```

## Mevcut LXC 204'ü Terraform'a alma (import)

Live LXC zaten ayakta; Terraform'a tanıtmak için:

```powershell
cd D:\nebula\me\nebula-dominion\infrastructure\terraform

terraform init
cp terraform.tfvars.example terraform.tfvars
# tfvars'ı senin gerçek secret'larla doldur (LXC pwd, SSH key)

# 1. LXC container'ı import et (id=node/vmid)
terraform import 'proxmox_virtual_environment_container.nebula' caliptic/204

# 2. random_password için mevcut postgres şifresini gir:
#    postgres VM'de /root/nebula-pg-pass.txt'i oku, içeriğini kaydet
#    (terraform import random_password destekliyor — sadece result attribute):
$LIVE_PG_PW = ssh ocp@192.168.1.229 'sudo cat /root/nebula-pg-pass.txt'
terraform import 'random_password.nebula_pg' $LIVE_PG_PW

# 3. Plan — beklenmedik değişiklik olmamalı
terraform plan
# Eğer "no changes" çıkarsa state senkron.
# Eğer değişiklik varsa, .tf dosyalarındaki default değerleri live state'e
# göre düzelt (cores, memory, vs.). Asla apply etmeden değişikliği gözden
# geçir.

# 4. null_resource'lar import edilemez (state'leri trigger hash'lerine bağlı).
#    İlk apply'da onlar koşar — idempotent yazıldı, mevcut compose'ları
#    yeniden create etmez (compose up -d zaten ayakta olanı bırakır).
terraform apply
```

## Provider notları

### `bpg/proxmox`
- API token tercihen kullan (`proxmox_api_token`), password fallback (`proxmox_password`).
- Token'ı Proxmox UI: Datacenter → Permissions → API Tokens → Add.
- LXC operasyonları için API yeter, ama bazı snapshot/template işleri SSH ister.
- Provider Proxmox host'una SSH bağlantısı yapar (`provider.ssh`).

### `random_password`
- `length=48, special=false` — postgres şifresi (special char escape sorun çıkarmasın).
- Live'da değiştirmek istersen `terraform taint random_password.nebula_pg && apply`.

### `null_resource` + `remote-exec`
- Caliptic VM'lerine SSH ile bağlanıp idempotent komut koşturur.
- `triggers.{compose_sha,lxc_id}` değişince yeniden koşar.
- Out-of-band değişiklikleri ezmez — pattern: "var ise dokunma" check'li.

## Mevcut LXC'yi tamamen yeniden create etme

**UYARI**: Bu operasyon LXC'yi siler, Docker volume'larıyla beraber MinIO +
Redis verisi gider. Postgres external olduğu için DB güvende, ama
upload'lar (varsa) kaybolur. Tipik senaryolar:
- LXC ID değiştirme
- Storage pool taşıma
- Network konfigürasyonu değiştirme

```powershell
terraform destroy -target proxmox_virtual_environment_container.nebula
# ↑ sadece LXC siler, postgres user/DB ve random_password kalır.
terraform apply
# ↑ yeni LXC create + cloud-init + agent'lar.
```

Sonra LXC içine `/opt/nebula-dominion/`'u sıfırdan kur (rsync source +
.env + docker compose up -d). DEPLOYMENT.md §10.1 adımları.

## Kapsam dışı

Şunlar Terraform'a alınmadı, manuel:
- **Cloudflare Tunnel ingress** — `cloudflare_zero_trust_tunnel_cloudflared_config`
  provider'ı kullanılabilir ama mevcut tunnel'da Caliptic'in de route'ları
  var, ortak resource olur. Bunun yerine ingress kayıtları Caliptic'in
  Terraform'ında (`D:\CararSenin\ocp-sno-kurulum\terraform\cloudflare-tunnel.tf`)
  yönetiliyor.
- **Cloudflare DNS** — tunnel'a auto-CNAME (proxied) Cloudflare dashboard
  tarafından eklendi. Tunnel resource'una bağlı.
- **Bastion nginx vhost** — `caliptic-integration.tf`'ta `null_resource` ile
  ekleniyor ama "var ise dokunma" pattern'i kullanıyor. Bastion nginx
  config'inin asıl source-of-truth'u Caliptic infra repo'sundaki nginx
  template'leri (deploy-bastion.yml workflow).
- **Uptime Kuma monitor'leri** — Kuma'nın resmi Terraform provider'ı yok,
  community provider'lar henüz stabil değil. Bu yüzden 3 monitor manuel
  olarak `uptime-kuma-api` python kütüphanesi ile eklendi
  (DEPLOYMENT.md §9'da nasıl yapılır anlatıldı).
- **Portainer endpoint registration** — Portainer API token'ı Terraform
  state'ine girmesin diye UI'dan ekleme (Add Environment → Agent → 10.10.10.40:9501).
- **Grafana dashboard'ları** — provisioned config Caliptic monitoring
  stack'inin volume'una bağlı. Nebula için ayrı dashboard YOK; mevcut
  "Node Exporter Full" dashboard'unda instance dropdown'undan
  `10.10.10.40:9100` seçilir.

## Diff bekleyişi

`terraform plan` önemli değişiklik göstermeyene kadar live state'i
ezmeden senkronize tut. Bu klasördeki `.tf` dosyaları **live'ın source-
of-truth'u**: gerçeklik kayar ya bunlar güncellenir, ya import'la yeni
state yansıtılır.
