@echo off
title XiaoWu Public Tunnel
echo XiaoWu public tunnel
echo Public URL: http://119.45.252.190:62000/login
echo Keep this window open while public access is needed.
echo.
"D:\xiaowuxitong\artifacts\plink.exe" -ssh -v -no-antispoof -hostkey "SHA256:CKuydr6nEKrmMqwLxVRvcvmvcqndi31y8O8MmphO2MA" -pw "Zmg526~~" -N -R "62000:127.0.0.1:3000" root@119.45.252.190
