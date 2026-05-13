# 云端部署与烟测指南

本指南用于当前腾讯云轻量应用服务器部署。旧的 Windows 试点电脑、局域网访问和本地加公网隧道方案已经不是主路径。

## 当前运行环境

- 公网入口：`http://124.222.136.121/login`
- 服务器系统：Ubuntu Server 22.04
- 项目目录：`/opt/xiaowuxitong/app`
- 数据库：服务器本机 PostgreSQL，数据库 `school_affairs`，应用用户 `school_admin`
- 备份目录：`/opt/xiaowuxitong/backups`
- 应用服务：`xiaowuxitong.service`
- 反向代理：Nginx `:80` -> `127.0.0.1:3000`

PostgreSQL 不对公网开放。公网只开放 Web 入口和 SSH 管理入口。

## 本机发布流程

1. 在本机完成代码修改。
2. 运行验证：

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

3. 提交并推送 GitHub：

```text
commit-and-push.cmd
```

4. 触发腾讯云部署：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\deploy-tencent-lighthouse.ps1
```

## 服务器自动部署顺序

本机部署入口会 SSH 到腾讯云并执行 `scripts/server/deploy.sh`。远端脚本按顺序完成：

1. 使用 `pg_dump` 创建 PostgreSQL custom-format 备份。
2. 从 GitHub `main` 拉取最新代码。
3. `npm ci` 安装依赖。
4. `npm run db:generate` 生成 Prisma Client。
5. `npm run db:validate` 校验 Prisma schema。
6. `npx prisma db push` 同步云端 PostgreSQL schema。
7. 执行基础配置种子：
   - `npm run db:seed:approval-defaults`
   - `npm run db:seed:department-positions`
8. `npm run build` 构建生产版本。
9. 重启 `xiaowuxitong.service`。
10. 执行 authenticated page smoke：

```bash
npm run smoke:pages -- --base-url=http://127.0.0.1:3000
```

部署脚本不写入演示数据，也不会迁移本地测试数据。

## 数据库策略

当前云端 PostgreSQL 是正式运行库：

- 不保留旧演示数据。
- 不从本机数据库同步数据。
- 不在日常部署中执行 `db:seed:demo`。
- schema 由 `prisma db push` 随部署同步。
- 部署前自动备份，默认只保留最近 10 份备份。

如果 Prisma 明确要求 `--accept-data-loss`，不要直接重复部署。先确认 schema 变化确实可接受，再运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\deploy-tencent-lighthouse.ps1 -AllowAcceptDataLoss
```

## 手动服务器检查

SSH 登录：

```powershell
ssh -i C:\Users\94384\Downloads\nyyzxwxt.pem ubuntu@124.222.136.121
```

查看服务：

```bash
sudo systemctl status xiaowuxitong
sudo systemctl status nginx
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

手动烟测：

```bash
cd /opt/xiaowuxitong/app
npm run smoke:pages -- --base-url=http://127.0.0.1:3000
```

## 页面烟测清单

部署脚本会自动检查数据重页面是否返回 `200` 且没有 Next.js server-error 标记。人工验收时再按角色补充检查：

1. `/login` 能打开。
2. Bootstrap 管理员或正式系统管理员能进入 `/dashboard`。
3. `/dashboard/users` 能打开，系统管理员能维护账号。
4. `/dashboard/structure` 能维护年级、班级、部门、岗位和学科。
5. `/dashboard/people` 能筛选、维护、导入模板和导出。
6. `/dashboard/archive/students` 能查看往届存档。
7. `/dashboard/inspection` 能在学生量化和教师量化之间切换。
8. `/dashboard/approvals` 能查看申请类型和审批职责。
9. `/dashboard/exports` 能生成并下载检查统计。
10. `/dashboard/data-management` 能显示数据量、审计日志和备份保护提示。

## 空库首次启用

腾讯云首次 bootstrap 不写演示数据。空库启用建议：

1. 使用 Bootstrap 管理员登录。
2. 进入 `/dashboard/users` 创建正式系统管理员和业务账号。
3. 进入 `/dashboard/structure` 建立学校结构。
4. 按需导入真实教师和学生数据。
5. 通过 `/dashboard/approvals` 配置真实审批职责。
6. 修改或停用临时 Bootstrap 管理员策略。

## 常见故障

### 登录页打不开

先检查：

```bash
sudo systemctl status xiaowuxitong
sudo systemctl status nginx
tail -n 100 /opt/xiaowuxitong/logs/app.err.log
```

如果本机 `127.0.0.1:3000` 正常但公网打不开，检查 Nginx、腾讯云安全组和服务器防火墙。

### 登录页正常但业务页报错

优先怀疑云端 PostgreSQL schema 落后于当前代码。常见服务端错误是 Prisma `P2022 ColumnNotFound`。

处理：

```bash
cd /opt/xiaowuxitong/app
npm run db:validate
npx prisma db push
sudo systemctl restart xiaowuxitong
npm run smoke:pages -- --base-url=http://127.0.0.1:3000
```

### 部署时 `db push` 要求确认数据丢失

先停止自动重试，确认 Prisma schema 是否真的删除或重命名字段。确认可接受后，再用本机部署入口加 `-AllowAcceptDataLoss`。

### 烟测无法登录

检查服务器 `/opt/xiaowuxitong/app/.env.local` 中的：

- `SMOKE_USERNAME`
- `SMOKE_PASSWORD`
- `BOOTSTRAP_ADMIN_USERNAME`
- `BOOTSTRAP_ADMIN_PASSWORD`

smoke 脚本需要能用其中一组账号完成受保护页面访问。
