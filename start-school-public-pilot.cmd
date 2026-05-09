@echo off
setlocal
chcp 65001 >nul

cd /d "%~dp0"

echo School affairs public pilot launcher
echo Project path: %~dp0
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-school-public-tunnel.ps1"
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if not "%EXIT_CODE%"=="0" (
  echo School public pilot failed. Exit code: %EXIT_CODE%
  echo Please check the visible command windows for details.
)

echo.
echo Press any key to close this window.
pause >nul

endlocal
