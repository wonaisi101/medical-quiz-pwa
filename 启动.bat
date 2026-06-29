@echo off
cd /d "%~dp0"

REM 确保 Node.js 在路径中（双击运行时可能丢失）
set PATH=D:\安装软件\Node.js;%PATH%

:MENU
cls
echo ============================================
echo    Quan Ke Yi Xue Shua Ti Xi Tong
echo ============================================
echo.
echo   1. Start dev server (localhost:5173)
echo   2. Build production version
echo   3. Preview built version
echo   4. Deploy to GitHub Pages
echo   5. View deployment guide
echo   6. Exit
echo.
set /p ch="Enter [1-6]: "

if "%ch%"=="1" goto dev
if "%ch%"=="2" goto build
if "%ch%"=="3" goto preview
if "%ch%"=="4" goto deploy
if "%ch%"=="5" goto help
if "%ch%"=="6" exit /b

echo Invalid choice, press any key to retry...
pause >nul
goto MENU

:dev
cls
echo ============================================
echo  Starting dev server...
echo  Phone (same WiFi): http://192.168.x.x:5173
echo  This PC:          http://localhost:5173
echo  Press Ctrl+C to stop
echo ============================================
echo.
call npm run dev -- --host
echo.
echo Server stopped.
pause
goto MENU

:build
cls
echo Building production version...
echo.
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo Build failed! Check errors above.
    pause
    goto MENU
)
echo.
echo Build complete! dist/ is ready.
pause
goto MENU

:preview
cls
echo ============================================
echo  Starting preview server...
echo  Phone (same WiFi): http://192.168.x.x:4173
echo  This PC:          http://localhost:4173
echo  Press Ctrl+C to stop
echo ============================================
echo.
call npm run preview
echo.
pause
goto MENU

:deploy
cls
echo [1/2] Building for GitHub Pages...
echo.
set GH_PAGES=true
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo Build failed!
    pause
    goto MENU
)
echo.
echo [2/2] Pushing to GitHub...
echo.
cd /d "%~dp0dist"
if exist .git rmdir /s /q .git
git init >nul
git add -A >nul
git commit -m "deploy" >nul
git branch -M main
git remote add origin https://github.com/wonaisi101/medical-quiz.git 2>nul
git push -u origin main -f
if %ERRORLEVEL% NEQ 0 (
    echo Push failed. Check network or repo name.
    pause
    goto MENU
)
echo.
echo Deployed! Wait 1-2 min then open:
echo https://wonaisi101.github.io/medical-quiz/
echo.
pause
goto MENU

:help
start "" "deploy-guide.html"
if %ERRORLEVEL% NEQ 0 (
    echo deploy-guide.html not found.
    pause
)
goto MENU
