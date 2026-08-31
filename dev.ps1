# One-command local dev: validate the one truly-required env var, then boot
# the Python ML service and the Next.js app, each in their own window, and
# open the browser once Next.js responds. See apps/web/README.md - every
# other env var is optional-with-fallback by design, so this only checks
# DATABASE_URL, the one thing the app can't degrade around.

$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
$webDir = Join-Path $root "apps\web"
$mlDir = Join-Path $root "apps\ml_service"

function Get-EnvValue([string]$file, [string]$name) {
    if (-not (Test-Path $file)) { return $null }
    $match = Select-String -Path $file -Pattern "^$name=(.*)`$" | Select-Object -Last 1
    if (-not $match) { return $null }
    return $match.Matches[0].Groups[1].Value.Trim().Trim('"')
}

# --- 1. Env check ---
$webEnvFile = Join-Path $webDir ".env.local"
if (-not (Test-Path $webEnvFile)) {
    Write-Host "Missing apps\web\.env.local" -ForegroundColor Red
    Write-Host "Run: Copy-Item apps\web\.env.example apps\web\.env.local, then fill in DATABASE_URL." -ForegroundColor Yellow
    exit 1
}

$dbUrl = Get-EnvValue $webEnvFile "DATABASE_URL"
if ([string]::IsNullOrWhiteSpace($dbUrl)) {
    Write-Host "DATABASE_URL is blank in apps\web\.env.local" -ForegroundColor Red
    Write-Host "Set it before running (create a Neon project at https://neon.tech, or use the 'neon' skill)." -ForegroundColor Yellow
    exit 1
}
Write-Host "Env check passed - DATABASE_URL is set." -ForegroundColor Green

# --- 2. ML service (Python/FastAPI) in its own window ---
$mlEnvFile = Join-Path $mlDir ".env"
$mlPython = Join-Path $mlDir ".venv\Scripts\python.exe"
if (-not (Test-Path $mlPython)) {
    Write-Host "No venv found at apps\ml_service\.venv - skipping the ML service. It's optional (pricing falls back to the rules engine); see apps\ml_service\README.md to set it up." -ForegroundColor Yellow
} else {
    $mlArgs = "-m uvicorn app.main:app --reload --port 8000"
    if (Test-Path $mlEnvFile) { $mlArgs += " --env-file .env" }
    $mlCmd = "cd '$mlDir'; & '$mlPython' $mlArgs"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $mlCmd | Out-Null
    Write-Host "ML service starting on http://localhost:8000 (separate window)." -ForegroundColor Cyan
}

# --- 3. Next.js dev server in its own window ---
$webCmd = "cd '$webDir'; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $webCmd | Out-Null
Write-Host "Next.js starting on http://localhost:3000 (separate window)." -ForegroundColor Cyan

# --- 4. Wait for Next.js, then open the browser ---
Write-Host "Waiting for Next.js to respond..." -ForegroundColor Cyan
$ready = $false
for ($i = 0; $i -lt 60 -and -not $ready; $i++) {
    Start-Sleep -Seconds 1
    try {
        $resp = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 2
        if ($resp.StatusCode -lt 500) { $ready = $true }
    } catch {
        # not up yet, keep polling
    }
}

if ($ready) {
    Write-Host "Next.js is up." -ForegroundColor Green
} else {
    Write-Host "Next.js didn't respond within 60s - check its window for errors." -ForegroundColor Yellow
}
Start-Process "http://localhost:3000"
