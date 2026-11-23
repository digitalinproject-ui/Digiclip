@echo off
title OpenShorts Launcher
echo ===================================================
echo             Memulai OpenShorts Video Clipper
echo ===================================================
echo.

cd /d "%~dp0"

echo [1/3] Menjalankan Backend API (Port 8000)...
start "OpenShorts Backend" cmd /k ".\.venv\Scripts\python.exe -m uvicorn app:app --host 127.0.0.1 --port 8000"

timeout /t 3 /nobreak >nul

echo [2/3] Menjalankan Dashboard Frontend (Port 5175)...
cd dashboard
set VITE_PROXY_TARGET=http://127.0.0.1:8000
start "OpenShorts Frontend" cmd /k "npm run dev -- --host 127.0.0.1 --port 5175"

timeout /t 3 /nobreak >nul

echo [3/3] Membuka browser ke http://127.0.0.1:5175 ...
start http://127.0.0.1:5175

echo.
echo ===================================================
echo OpenShorts siap digunakan di http://127.0.0.1:5175
echo Tekan tombol silang pada jendela backend/frontend untuk menutup.
echo ===================================================
pause
