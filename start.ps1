Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "          Memulai Digiclip Video Clipper           " -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

Write-Host "`n[1/3] Menjalankan Backend (Port 8000)..." -ForegroundColor Yellow
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "Set-Location '$scriptDir'; .\.venv\Scripts\python.exe -m uvicorn app:app --host 127.0.0.1 --port 8000"

Start-Sleep -Seconds 3

Write-Host "[2/3] Menjalankan Frontend (Port 5175)..." -ForegroundColor Yellow
$frontendDir = Join-Path $scriptDir "dashboard"
Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "Set-Location '$frontendDir'; `$env:VITE_PROXY_TARGET='http://127.0.0.1:8000'; npm run dev -- --host 127.0.0.1 --port 5175"

Start-Sleep -Seconds 3

Write-Host "[3/3] Membuka browser..." -ForegroundColor Green
Start-Process "http://127.0.0.1:5175"

Write-Host "`nDigiclip aktif di: http://127.0.0.1:5175" -ForegroundColor Cyan
