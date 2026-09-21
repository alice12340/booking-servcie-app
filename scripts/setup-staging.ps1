# One-time staging bootstrap (Windows). Does not touch live Fly app or shopify.app.toml.
# Prerequisites: flyctl logged in, Shopify CLI logged in, Node 20+.
#
# Usage (from repo root):
#   .\scripts\setup-staging.ps1

Set-Location (Split-Path $PSScriptRoot -Parent)

$fly = Join-Path $env:USERPROFILE ".fly\bin\flyctl.exe"
if (-not (Test-Path $fly)) {
  $flyCmd = Get-Command flyctl -ErrorAction SilentlyContinue
  if ($flyCmd) { $fly = $flyCmd.Source } else {
    Write-Error "flyctl not found. Install: iwr https://fly.io/install.ps1 -useb | iex"
  }
}

# flyctl prints warnings to stderr; do not treat those as terminating errors
$ErrorActionPreference = "Continue"

Write-Host "==> Creating Fly staging app (no-op if it already exists)..." -ForegroundColor Cyan
& $fly apps create booking-service-app-staging
if ($LASTEXITCODE -ne 0) {
  Write-Host "    (app may already exist - continuing)"
}

Write-Host "==> Creating staging volume..." -ForegroundColor Cyan
& $fly volumes create data --app booking-service-app-staging --region lax --size 1
if ($LASTEXITCODE -ne 0) {
  Write-Host "    (volume may already exist - continuing)"
}

Write-Host "==> Creating staging Postgres (separate from live DB)..." -ForegroundColor Cyan
Write-Host "    If you already have booking-service-db-staging, cancel/skip the create."
& $fly postgres create --name booking-service-db-staging --region lax
& $fly postgres attach booking-service-db-staging --app booking-service-app-staging

Write-Host ""
Write-Host "==> Next steps (manual):" -ForegroundColor Yellow
Write-Host "1. npm run config:link:staging"
Write-Host "   -> Create a NEW Partner app named booking-service-app-staging (do NOT select live)."
Write-Host "2. Copy staging API key/secret from Partner Dashboard or:"
Write-Host "   npm run env:staging"
Write-Host "3. Set Fly secrets (use STAGING values only - never live DATABASE_URL):"
Write-Host "   flyctl secrets set SHOPIFY_API_KEY=... SHOPIFY_API_SECRET=... --app booking-service-app-staging"
Write-Host "   (DATABASE_URL is usually set by postgres attach)"
Write-Host "4. Deploy code:  npm run deploy:fly:staging"
Write-Host "5. Deploy Shopify config:  npm run deploy:staging"
Write-Host "6. Partner Dashboard -> staging app -> Custom distribution -> aimaebike.myshopify.com -> install link"
Write-Host ""
Write-Host "Live remains: booking-service-app + shopify.app.toml + push to main." -ForegroundColor Green
