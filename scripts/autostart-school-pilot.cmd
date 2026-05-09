@echo off
cd /d "D:\xiaowuxitong"
start "" /min powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "D:\xiaowuxitong\scripts\start-school-pilot.ps1" -NoInstall -SkipBuild -LogFile "D:\xiaowuxitong\logs\start-school-pilot.log"
