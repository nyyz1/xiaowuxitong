# 校务系统

面向高中学校内部使用的校务数据管理系统。当前代码按七个业务模块组织：

- 用户权限
- 学校结构
- 师生档案
- 往届存档
- 常规检查
- 申请审批
- 统计导出

## 当前部署形态

当前正式运行口径已经切换为腾讯云轻量应用服务器，不再使用 Windows 试点电脑、本地 PostgreSQL、局域网访问或本地加公网隧道作为主方案。

- 服务器：腾讯云轻量应用服务器 `124.222.136.121`
- 入口：`http://124.222.136.121/login`
- 系统：Ubuntu Server 22.04
- 应用目录：`/opt/xiaowuxitong/app`
- 数据库：服务器本机 PostgreSQL，库名 `school_affairs`，应用用户 `school_admin`
- 服务：`xiaowuxitong.service`
- 反向代理：Nginx `:80` -> `127.0.0.1:3000`
- 备份目录：`/opt/xiaowuxitong/backups`
- 当前云端 PostgreSQL 不保留旧演示数据或本地测试数据

PostgreSQL 只应监听服务器本机，不开放公网 `5432`。公网只开放 Web 入口和 SSH 管理入口。

## 开发与发布流程

日常开发在本机完成，代码通过 GitHub 进入服务器：

1. 本机修改代码。
2. 本机运行验证。
3. 提交并推送 GitHub。
4. 运行腾讯云部署脚本。
5. 服务器自动备份数据库、拉取代码、同步 schema、构建、重启、烟测。

本机一键提交推送：

```text
commit-and-push.cmd
```

手动验证命令：

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
```

推送后部署到腾讯云：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\deploy-tencent-lighthouse.ps1
```

远端部署脚本会依次执行：

1. `pg_dump` 备份当前 PostgreSQL。
2. `git pull --ff-only` 拉取 GitHub 最新代码。
3. `npm ci` 安装依赖。
4. 生成并校验 Prisma Client/schema。
5. `prisma db push` 同步云端 PostgreSQL schema。
6. 补齐基础配置种子：申请类型、部门岗位。
7. `npm run build`。
8. 重启 `xiaowuxitong.service`。
9. 运行 authenticated smoke，检查数据重页面。

## 本地开发

本机用于开发和静态验证，不再承担正式试点运行。

首次准备：

```powershell
cp .env.example .env.local
npm install
npm.cmd run db:generate
```

启动开发环境：

```powershell
npm.cmd run dev
```

如果本机需要临时 PostgreSQL 用于开发验证，可以让 `.env.local` 指向本机数据库后执行：

```powershell
npm.cmd run db:push
```

不要把本机数据库当作正式环境，也不要把本机测试数据迁移到腾讯云。

## 数据与账号原则

- 云端数据库当前不含演示测试数据。
- `db:seed:demo`、`db:clear:demo`、PGlite 模拟命令只用于本地开发或一次性验证，不属于正式云端部署流程。
- 云端的 Bootstrap 管理员、数据库密码、`NEXTAUTH_SECRET` 只保存在服务器 `.env.local` 或受控交付材料中，不写入 Git 文档。
- 首次空库上线后，使用 Bootstrap 管理员进入系统，再在 `/dashboard/users` 创建正式业务账号。
- 正式账号密码由系统管理员在后台设置和重置。

## 目录说明

- `memory-bank/`：产品、技术栈、实施计划、进度、架构记录
- `src/app/`：App Router 路由入口，尽量保持为薄入口
- `src/components/`：通用表单与应用壳组件
- `src/lib/`：认证、授权、配置、校验和跨模块共享逻辑
- `src/modules/school-structure/`：学校结构模块
- `src/modules/users/`：用户权限模块
- `src/modules/people/`：师生档案模块
- `src/modules/alumni-archive/`：往届存档模块
- `src/modules/inspection/`：常规检查模块
- `src/modules/approvals/`：申请审批模块
- `src/modules/reporting/`：统计导出模块
- `prisma/`：数据库 schema
- `scripts/server/`：腾讯云服务器 bootstrap、备份、部署脚本
- `docs/`：部署、运维、验收、规划文档

## 文档入口

- `docs/README.md`：文档导航
- `docs/tencent-lighthouse-deployment.md`：腾讯云部署与一键更新手册
- `docs/deployment-and-smoke-test.md`：云端发布和烟测流程
- `docs/pilot-accounts-and-usage-guide.md`：云端账号与日常使用说明
- `docs/final-delivery-checklist.md`：交付前检查单

## 常用命令

```powershell
npm.cmd run dev
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
npm.cmd run db:generate
npm.cmd run db:validate
npm.cmd run db:push
npm.cmd run db:seed:approval-defaults
npm.cmd run db:seed:department-positions
npm.cmd run smoke:pages
```

本地演示或模拟命令只在明确需要测试数据时使用：

```powershell
npm.cmd run db:seed:demo
npm.cmd run db:clear:demo
npm.cmd run test:demo-db
```

## 维护规则

开始任何新任务前，先按顺序阅读：

1. `memory-bank/prd.md`
2. `memory-bank/tech-stack.md`
3. `memory-bank/implementation-plan.md`
4. `memory-bank/progress.md`
5. `memory-bank/architecture.md`

如果部署、数据库、账号或脚本发生变化，同步更新 `docs/` 和 `memory-bank/`，不要让旧的本地工作站或隧道说明重新成为主路径。
