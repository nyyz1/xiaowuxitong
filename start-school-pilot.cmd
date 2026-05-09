@echo off
setlocal
chcp 65001 >nul

cd /d "%~dp0"

if not exist "%~dp0logs" mkdir "%~dp0logs"
set "LOG_FILE=%~dp0logs\start-school-pilot.log"

echo School affairs pilot launcher
echo Project path: %~dp0
echo Log file: %LOG_FILE%
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-school-pilot.ps1" -LogFile "%LOG_FILE%"
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if "%EXIT_CODE%"=="0" (
  echo School pilot service stopped.
) else (
  echo School pilot failed. Exit code: %EXIT_CODE%
  echo Please check log file: %LOG_FILE%
)

echo.
echo Press any key to close this window.
pause >nul

endlocal
