@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\publish-and-deploy.ps1" %*
exit /b %ERRORLEVEL%
