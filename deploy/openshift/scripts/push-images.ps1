# PowerShell version of push-images.sh — for Windows dev machines without
# bash/WSL. Same flow: oc registry login, build 3 images, push with retry.
#
# Run from repo root (D:\nebula\me\nebula-dominion):
#   pwsh deploy/openshift/scripts/push-images.ps1
# or:
#   powershell -File deploy/openshift/scripts/push-images.ps1
#
# Environment overrides (optional):
#   $env:NAMESPACE = "nebula-prod"
#   $env:TAG = "v0.1.0"
#   $env:NEXT_PUBLIC_GA_ID = "G-..."
#   $env:NEXT_PUBLIC_SENTRY_DSN = "https://..."

$ErrorActionPreference = 'Stop'

# Resolve repo root (script is at deploy/openshift/scripts/, repo root is 3 up)
$RepoRoot = (Resolve-Path "$PSScriptRoot\..\..\..").Path
Set-Location $RepoRoot

$Namespace = if ($env:NAMESPACE) { $env:NAMESPACE } else { "nebula-prod" }
$Tag       = if ($env:TAG)       { $env:TAG }       else { "latest" }

Write-Host "[push] repo root: $RepoRoot" -ForegroundColor Cyan
Write-Host "[push] namespace: $Namespace" -ForegroundColor Cyan
Write-Host "[push] tag: $Tag" -ForegroundColor Cyan

# Discover the external image registry route
$Registry = (& oc -n openshift-image-registry get route default-route -o jsonpath='{.spec.host}' 2>$null)
if (-not $Registry) {
    Write-Error @"
ERROR: OpenShift image registry route is not exposed.
Run once as cluster-admin:
  oc patch configs.imageregistry.operator.openshift.io/cluster ``
    --patch '{"spec":{"defaultRoute":true}}' --type=merge
"@
    exit 1
}

Write-Host "[push] registry: $Registry" -ForegroundColor Cyan

# Authenticate docker against the registry using the oc session token
$Token = (& oc whoami -t)
$User  = (& oc whoami)

# Pick docker (Docker Desktop on Windows) — podman support could be added if needed
$Cli = Get-Command docker -ErrorAction SilentlyContinue
if (-not $Cli) {
    Write-Error "ERROR: docker not found on PATH. Install Docker Desktop or add to PATH."
    exit 1
}

Write-Host "[push] cli: $($Cli.Source)" -ForegroundColor Cyan
Write-Host "[push] oc user: $User"

# docker login
$Token | & docker login -u "unused" --password-stdin $Registry
if ($LASTEXITCODE -ne 0) {
    Write-Error "ERROR: docker login failed against $Registry"
    exit 1
}

# Build args (only used for web — Next.js inlines NEXT_PUBLIC_* at build time)
$WebBuildArgs = @()
if ($env:NEXT_PUBLIC_GA_ID)        { $WebBuildArgs += "--build-arg"; $WebBuildArgs += "NEXT_PUBLIC_GA_ID=$($env:NEXT_PUBLIC_GA_ID)" }
if ($env:NEXT_PUBLIC_FB_PIXEL_ID)   { $WebBuildArgs += "--build-arg"; $WebBuildArgs += "NEXT_PUBLIC_FB_PIXEL_ID=$($env:NEXT_PUBLIC_FB_PIXEL_ID)" }
if ($env:NEXT_PUBLIC_SENTRY_DSN)    { $WebBuildArgs += "--build-arg"; $WebBuildArgs += "NEXT_PUBLIC_SENTRY_DSN=$($env:NEXT_PUBLIC_SENTRY_DSN)" }
if ($env:NEXT_PUBLIC_SENTRY_ENV)    { $WebBuildArgs += "--build-arg"; $WebBuildArgs += "NEXT_PUBLIC_SENTRY_ENV=$($env:NEXT_PUBLIC_SENTRY_ENV)" } else { $WebBuildArgs += "--build-arg"; $WebBuildArgs += "NEXT_PUBLIC_SENTRY_ENV=production" }

function PushWithRetry {
    param([string]$Image)
    for ($i = 1; $i -le 3; $i++) {
        Write-Host "[push] attempt $i/3: $Image" -ForegroundColor Yellow
        & docker push $Image
        if ($LASTEXITCODE -eq 0) { return }
        Write-Warning "Attempt $i failed — waiting 15s before retry..."
        Start-Sleep -Seconds 15
    }
    Write-Error "All 3 push attempts failed for $Image"
    exit 1
}

function BuildAndPush {
    param(
        [string]$App,            # web | api | game-server
        [string]$DockerfilePath, # apps/<app>/Dockerfile
        [string[]]$ExtraArgs     # build args (for web only)
    )
    $Image       = "$Registry/$Namespace/nebula-${App}:$Tag"
    $ImageLatest = "$Registry/$Namespace/nebula-${App}:latest"

    Write-Host ""
    Write-Host "[push] ── $App ─────────────────────────────────────────" -ForegroundColor Green
    Write-Host "[push] building $Image"

    $env:DOCKER_BUILDKIT = "1"
    $buildCmd = @("build", "-f", $DockerfilePath, "-t", $Image, "-t", $ImageLatest)
    if ($ExtraArgs) { $buildCmd += $ExtraArgs }
    $buildCmd += "."
    & docker @buildCmd
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Build failed for $App"
        exit 1
    }

    PushWithRetry -Image $Image
    PushWithRetry -Image $ImageLatest

    Write-Host "[push] ok $App" -ForegroundColor Green
}

BuildAndPush -App "api"         -DockerfilePath "apps/api/Dockerfile"          -ExtraArgs @()
BuildAndPush -App "game-server" -DockerfilePath "apps/game-server/Dockerfile"  -ExtraArgs @()
BuildAndPush -App "web"         -DockerfilePath "apps/web/Dockerfile"          -ExtraArgs $WebBuildArgs

Write-Host ""
Write-Host "[push] ALL DONE. Trigger rollouts:" -ForegroundColor Green
Write-Host "  oc -n $Namespace rollout restart deploy/nebula-web deploy/nebula-api deploy/nebula-game-server"
