@echo off
cd /d "%~dp0"
set PATH=D:\安装软件\Node.js;%PATH%
cls
echo Starting dev server...
echo Phone (same WiFi): http://192.168.x.x:5173
echo This PC:          http://localhost:5173
echo Press Ctrl+C to stop
echo.
npm run dev -- --host
pause
