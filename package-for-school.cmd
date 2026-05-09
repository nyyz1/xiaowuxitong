@echo off
setlocal
chcp 65001 >nul

cd /d "%~dp0"

echo School affairs transfer package
echo Project path: %~dp0
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\package-for-school.ps1"
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if "%EXIT_CODE%"=="0" (
  echo Package completed. Check artifacts\school-transfer.
) else (
  echo Package failed. Exit code: %EXIT_CODE%
)

echo.
echo Press any key to close this window.
pause >nul

endlocal
