@echo off
setlocal
chcp 65001 >nul

cd /d "%~dp0"

echo Stop school affairs public pilot
echo Project path: %~dp0
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\stop-school-public-pilot.ps1"
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if not "%EXIT_CODE%"=="0" (
  echo Stop script finished with exit code: %EXIT_CODE%
)

echo.
echo Press any key to close this window.
pause >nul

endlocal
