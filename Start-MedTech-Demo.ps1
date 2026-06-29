$ErrorActionPreference = "Stop"
$project = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $project

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "Docker Desktop is required. Install or start Docker Desktop, then run this file again." -ForegroundColor Red
    Read-Host "Press Enter to close"
    exit 1
}

Write-Host "Building MedTech ERP Client Demo..." -ForegroundColor Cyan
docker build -t medtech-erp-client-demo .
if ($LASTEXITCODE -ne 0) { throw "The demo build failed." }

$existing = docker ps -aq --filter "name=medtech-erp-client-demo"
if ($existing) { docker rm -f medtech-erp-client-demo | Out-Null }

Write-Host "Starting demo at http://localhost:3000" -ForegroundColor Green
docker run -d --name medtech-erp-client-demo --restart unless-stopped -p 3000:3000 medtech-erp-client-demo | Out-Null
Start-Sleep -Seconds 3
Start-Process "http://localhost:3000"
Write-Host "MedTech ERP is running. You may close this window." -ForegroundColor Green
Read-Host "Press Enter to close"
