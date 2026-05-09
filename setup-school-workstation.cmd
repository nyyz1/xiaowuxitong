@echo off
setlocal
chcp 65001 >nul

cd /d "%~dp0"

echo School workstation first-run setup
echo Project path: %~dp0
echo.
echo This will check Node.js and PostgreSQL, try winget installation if missing,
echo create the school_admin user and school_affairs database when possible,
echo install npm dependencies, sync schema, write demo accounts/data,
echo build the app, and start the pilot site.
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\setup-school-workstation.ps1"
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if "%EXIT_CODE%"=="0" (
  echo Setup finished.
) else (
  echo Setup failed. Exit code: %EXIT_CODE%
  echo Check that Node.js LTS and PostgreSQL are installed.
)

echo.
echo Press any key to close this window.
pause >nul

endlocal
