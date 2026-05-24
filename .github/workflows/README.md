# Nebula Dominion — CI/CD

GitHub Actions workflow'ları. Caliptic'in `deploy-prod.yml` pattern'ini mirror
ediyor: self-hosted bastion runner, tag-bazlı trigger, image build + push to
OCP internal registry, `oc set image` ile rollout.

## 📋 Workflow'lar

| Dosya | Tetikleyici | Ne yapar |
|---|---|---|
| `deploy-prod.yml` | `git push v*` tag veya manuel | 3 image (web/api/game-server) build + push + OCP'ye rollout |

---

## ⚙️ Bir kerelik kurulum

### 1. Self-hosted runner

Caliptic ile aynı bastion runner kullanılabilir — `[self-hosted, bastion]`
label'larını taşıyan herhangi bir runner bu workflow'u alır.

**Yeni repo için runner kayıt:**
```bash
ssh ocp@<bastion-ip>
cd ~/actions-runner
./config.sh \
  --url https://github.com/<owner>/nebula-dominion \
  --token <runner-registration-token> \
  --name nebula-bastion \
  --labels bastion,linux \
  --replace
sudo ./svc.sh install ocp
sudo ./svc.sh start
```

Token: GitHub repo → **Settings → Actions → Runners → New self-hosted runner**.

**Caliptic ile aynı runner'ı kullanmak için** (önerilen — bastion zaten kurulu):
- Organization-level runner olarak kaydet (`Settings → Actions → Runners` org seviyesinde)
- Nebula repo'sunu o organization'a taşı / kaydet
- Workflow'lar otomatik aynı runner'ı kullanır

### 2. GitHub repo secrets

`Settings → Secrets and variables → Actions → New repository secret` ile şu
secret'ları ekle:

#### Zorunlu (deploy çalışması için)

| Secret | Değer | Nereden |
|---|---|---|
| `OPENSHIFT_SERVER` | `https://api.ocp-sno.caliptic.com:6443` | Cluster API endpoint |
| `OPENSHIFT_TOKEN` | Service account token | `oc create sa nebula-deployer -n nebula-prod` + `oc create token nebula-deployer -n nebula-prod --duration=8760h` (1 yıl) |
| `OPENSHIFT_NAMESPACE` | `nebula-prod` | terraform.tfvars'taki namespace |
| `OPENSHIFT_REGISTRY` | `default-route-openshift-image-registry.apps.ocp-sno.caliptic.com` | `oc get route -n openshift-image-registry default-route -o jsonpath='{.spec.host}'` |

#### Opsiyonel (analytics build args)

| Secret | Değer | Nereden |
|---|---|---|
| `NEXT_PUBLIC_GA_ID` | `G-H29WNK7XQ1` | .env'inden |
| `NEXT_PUBLIC_FB_PIXEL_ID` | (boş) | Faz 6'da dolduracaksın |
| `NEXT_PUBLIC_SENTRY_DSN` | `https://...@...ingest.de.sentry.io/...` | .env'inden |

### 3. Service account izinleri

`OPENSHIFT_TOKEN` için `nebula-deployer` SA'nın gerekli RBAC'i:

```bash
# Ana namespace'te edit izni — set image, rollout, set env
oc adm policy add-role-to-user edit -z nebula-deployer -n nebula-prod

# Image registry erişimi — internal registry'e push
oc adm policy add-role-to-user system:image-builder -z nebula-deployer -n nebula-prod
oc adm policy add-role-to-user system:image-pusher  -z nebula-deployer -n nebula-prod
```

---

## 🚀 Deploy akışı

### Otomatik (tag push)

```bash
git checkout main
git pull
git tag v0.1.0
git push origin v0.1.0
# → GitHub Actions başlar, ~10 dk sonra production canlı
```

### Manuel (workflow_dispatch)

GitHub repo → **Actions → Deploy to Production → Run workflow**:
- Branch: `main`
- Tag input: `v0.1.0` (zorunlu, traceability için)

İlk deploy (Terraform install) öncesinde manuel apply gerek:
```bash
cd deploy/openshift
terraform apply
# Sonrasında GitHub Actions image swap yapar
```

---

## 📊 Adım adım workflow

```
1. Checkout (tag ref)
2. Set image tag (git short sha)
3. oc login (OpenShift API)
4. docker login (registry external route)
5. Build api image → tag (sha + latest)
6. Push api image (retry 3x)
7. Build game-server → tag → push (retry)
8. Build web → tag → push (retry, NEXT_PUBLIC_* baked in)
9. Sync runtime env (oc set env on api + game-server)
10. oc set image deploy/nebula-api → rollout status (5min timeout)
11. oc set image deploy/nebula-game-server → rollout status
12. oc set image deploy/nebula-web → rollout status
13. Smoke test (curl 3 host'a, 2xx/3xx/401/405 = OK)
14. Step summary (version + image tags)
```

Toplam süre: **6-10 dk** (BuildKit cache mount + 3 paralel push, ilk run hariç).

---

## 🛠 Troubleshooting

**`docker login` 403 unauthorized**
→ `oc whoami --show-token` boş dönüyor. SA token süresi dolmuş ya da yanlış.
   Yeniden token üret: `oc create token nebula-deployer -n nebula-prod --duration=8760h`
   ve `OPENSHIFT_TOKEN` secret'ını güncelle.

**`oc set image` "deployment not found"**
→ İlk deploy için Terraform install gerekli. `cd deploy/openshift && terraform apply`.

**Rollout 5 dk içinde tamamlanmadı**
→ Pod ImagePullBackOff veya CrashLoopBackOff'tadır. Logs:
   ```
   oc -n nebula-prod logs deploy/nebula-api --tail=100
   oc -n nebula-prod describe pod -l app=nebula-api
   ```

**Smoke test 503 dönüyor**
→ Service uplink hâlâ hazır değil. 30 sn bekle, manuel curl ile retry.
   Eğer 503 sabit kalıyorsa: pod 0/1 ready durumda, readinessProbe hata
   veriyor. Aynı describe + logs ile gerçek nedeni bul.

**Smoke test 404 dönüyor**
→ Cloudflare tunnel veya OCP Route eksik. Bu hostname için Route var mı:
   ```
   oc -n nebula-prod get route
   ```
   Yoksa terraform apply yapılmamış — `deploy/openshift/08-routes.tf`
   çalıştırılmamış demek.

---

## 🔄 Caliptic'ten farklar (özet)

| Konu | Caliptic | Nebula |
|---|---|---|
| Servis sayısı | 3 (backend/web/daemon) | 3 (web/api/game-server) |
| Migration | Go binary, ayrı pod | TypeORM, api boot'unda |
| WS sticky | yok | game-server'da haproxy annotation |
| Hostnames | app.caliptic.com + appi.caliptic.com | nebula.caliptic.com + api-nebula.* + game-nebula.* |
| License key | Var (CALIPTIC_LICENSE_KEY) | Yok |
| Resend email | Var (RESEND_API_KEY) | İleride eklenebilir |

Geri kalan tüm pattern aynı — pip cache, retry logic, summary, smoke test.
