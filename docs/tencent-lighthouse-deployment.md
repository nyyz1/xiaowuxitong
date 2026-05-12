# 腾讯云轻量应用服务器部署手册

本文用于把校务系统部署到腾讯云轻量应用服务器，并让后续代码更新可以通过一条服务器脚本完成。

## 当前服务器

- 公网 IP：`124.222.136.121`
- 系统：Ubuntu Server 22.04 LTS 64bit
- 登录用户：`ubuntu`
- 服务器规格：4 核 CPU、4GB 内存、40GB SSD、300GB/月流量、3Mbps 带宽
- 安全组：开放 `22`、`80`、`443`

域名未备案前，先使用：

```text
http://124.222.136.121/login
```

域名完成备案后，再把域名解析到这台服务器，并把 Caddy 配置从 `:80` 改成域名入口以启用 HTTPS。

## 首次部署

在本机 PowerShell 中先确认 SSH 能登录：

```powershell
ssh -i C:\Users\94384\Downloads\nyyzxwxt.pem ubuntu@124.222.136.121
```

然后把仓库里的首次部署脚本上传到服务器并执行。脚本会安装 Node.js、PostgreSQL、Caddy，创建应用数据库，克隆 GitHub 仓库，生成 `.env.local`，同步 Prisma schema，初始化基础申请类型和部门岗位，最后启动 systemd 服务。

服务器脚本：

```bash
scripts/server/bootstrap-ubuntu.sh
```

脚本不会迁移本地数据库，也不会写入演示数据。部署完成后会显示一次生成的 Bootstrap 管理员密码、数据库密码和登录地址，请把这些信息保存到安全位置，不要写入 Git。

## 一键更新

日常流程：

1. 在本机用 Codex 修改代码。
2. 本机验证 `typecheck`、`lint`、`build`。
3. 提交并推送到 GitHub。
4. 在本机运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/deploy-tencent-lighthouse.ps1
```

远端脚本会按顺序执行：

1. `pg_dump` 备份当前 PostgreSQL 数据库。
2. `git pull --ff-only` 拉取 GitHub 最新代码。
3. `npm ci` 安装依赖。
4. `npm run db:generate` 生成 Prisma Client。
5. `npm run db:validate` 校验 Prisma schema。
6. `npx prisma db push` 同步 live PostgreSQL schema。
7. `npm run db:seed:approval-defaults` 和 `npm run db:seed:department-positions` 补齐基础配置。
8. `npm run build` 构建生产版本。
9. 重启 `xiaowuxitong.service`。
10. `npm run smoke:pages -- --base-url=http://127.0.0.1:3000` 检查数据重页面。

如果 Prisma 明确要求 `--accept-data-loss`，先确认不是误删字段或错误 schema。确认可以接受后再运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/deploy-tencent-lighthouse.ps1 -AllowAcceptDataLoss
```

## 服务器目录

- 项目目录：`/opt/xiaowuxitong/app`
- 备份目录：`/opt/xiaowuxitong/backups`
- 日志目录：`/opt/xiaowuxitong/logs`
- systemd 服务：`xiaowuxitong.service`
- PostgreSQL 数据库：`school_affairs`
- PostgreSQL 应用用户：`school_admin`

PostgreSQL 只应监听本机。公网只开放 Web 和 SSH，不开放 `5432`。

## 常用命令

查看服务：

```bash
sudo systemctl status xiaowuxitong
sudo systemctl status caddy
sudo systemctl status postgresql
```

查看日志：

```bash
tail -n 100 /opt/xiaowuxitong/logs/app.out.log
tail -n 100 /opt/xiaowuxitong/logs/app.err.log
```

手动备份：

```bash
cd /opt/xiaowuxitong/app
bash scripts/server/backup-postgres.sh
```

手动 smoke：

```bash
cd /opt/xiaowuxitong/app
npm run smoke:pages -- --base-url=http://127.0.0.1:3000
```

## 注意事项

- `.env.local` 只保存在服务器，不提交到 Git。
- 一键更新脚本把数据库备份和 schema 同步绑在一起，避免代码更新后数据库没跟上导致业务页 `This page couldn't load`。
- 40GB 系统盘空间有限，备份默认只保留最近 10 份。正式使用后建议扩容或接入 COS 做异地备份。
- 域名未备案前不要把未备案域名作为正式公网入口。
