校务系统迁移包

这个压缩包只包含项目代码和交付脚本，不包含当前电脑里的数据库数据。

在学校办公室电脑上使用：

1. 解压到 `D:\xiaowuxitong`
2. 确认学校电脑已经安装 Node.js LTS 和 PostgreSQL
3. 确认 PostgreSQL 里已经创建 `school_admin` 用户和 `school_affairs` 数据库
4. 双击 `setup-school-workstation.cmd`
5. 脚本完成后，打开 `logs\current-school-pilot-url.txt` 里的登录地址

如果不想写入演示数据，请用 PowerShell 执行：

powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\setup-school-workstation.ps1 -SkipDemoSeed
