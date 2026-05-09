# 校务系统

面向高中学校内部使用的校务数据管理系统，当前按六个业务模块组织：

- 用户权限
- 学校结构
- 师生档案
- 往届存档
- 常规检查
- 统计导出

## 当前状态

- 已完成 `Next.js + TypeScript + Prisma + PostgreSQL` 主体应用骨架。
- 已完成数据库账号登录、兜底管理员登录、用户与权限管理。
- 已完成学校结构、用户权限、师生档案、往届存档、常规检查、统计导出六个主要模块；师生档案和检查记录支持误录后的修改与删除。
- 已完成前台与业务流程去学年化：结构、档案、检查、统计都按年级 / 班级工作，`AcademicYear` 仅保留为内部兼容层。
- 已按六个业务模块收拢代码结构：学校结构、用户权限、师生档案、往届存档、常规检查、统计导出。
- 已移除“成果展示”和“本地演示”两项非业务功能，后台入口只保留真实业务模块。
- 已完成学校试点角色模型落地：`1` 个系统管理员、`3` 个校领导、`3` 个高二年级管理员、`1` 个数据管理员、`1` 个常规检查员。

## 当前已批准试点

- 先在高二年级试用，不直接切全校真实数据。
- PostgreSQL 暂时安装在当前这台试点电脑的 `D` 盘，本项目应用也运行在这台电脑上。
- 其他办公电脑通过这台试点电脑的校内网 IP 访问 Web 系统，不直接连接 PostgreSQL。
- 系统只保留 `1` 个最高权限系统管理员账号。
- `3` 个校领导账号具有全校数据查看、导入、导出权限。
- `3` 个高二年级管理员账号具有高二范围内的查看、导入、导出权限。
- 数据管理员负责全校师生档案维护、误录修改与删除；常规检查员负责检查项目维护、检查录入、误录修改与删除。

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
- `src/modules/reporting/`：统计导出模块
- `prisma/`：数据库 schema
- `scripts/`：数据库种子、PGlite 模拟、试点启动脚本
- `docs/`：部署、验收、试点交付文档

## 只搬项目到学校电脑的一键方式

如果不需要带走当前电脑里的数据库数据，可以在家里电脑双击：

```text
package-for-school.cmd
```

把生成的 `artifacts\school-transfer\*.zip` 复制到学校电脑，解压到 `D:\xiaowuxitong` 后双击：

```text
setup-school-workstation.cmd
```

学校电脑初始化脚本会检查 Node.js/npm 和 PostgreSQL/`psql.exe`，缺失时尝试用 `winget` 安装，并用 PostgreSQL 管理员密码创建 `school_admin` 用户和 `school_affairs` 数据库。

详细说明见 `docs/school-transfer-one-click.md`。

## 多电脑 Codex 开发

如果你本人要在不同工作地点继续开发，推荐用 GitHub 加三个一键脚本：

```text
setup-dev-workstation.cmd
start-work.cmd
save-work.cmd
```

- 新电脑第一次克隆仓库后，双击 `setup-dev-workstation.cmd`。
- 每次准备让 Codex 开发前，双击 `start-work.cmd` 拉取 GitHub 最新代码。
- 每次离开电脑前，双击 `save-work.cmd`，它会检查、提交并推送当前改动。

详细说明见 `docs/codex-multi-workstation.md`。

## 本地启动

1. 复制环境变量模板

```bash
cp .env.example .env.local
```

2. 安装依赖

```bash
npm install
```

3. 生成 Prisma Client

```bash
npm run db:generate
```

4. 如有 PostgreSQL，可同步 schema

```bash
npm run db:push
```

5. 启动开发环境

```bash
npm run dev
```

如果已经在这台电脑上装好 PostgreSQL，准备让同一校内网的办公电脑访问试点环境，建议用：

```text
start-school-pilot.cmd
```

或命令行：

```bash
npm run pilot:school
```

启动后，其他办公电脑访问这台试点电脑显示出来的 `http://校内IP:3000` 即可。

如果自动识别到的是 `localhost`，请改用：

```bash
npm run pilot:school -- -PublicHost 192.168.x.x
```

`logs/current-school-pilot-url.txt` 会记录当前访问地址。本机始终可以使用 `http://127.0.0.1:3000/login`，同一网络内的其他设备应读取其中最新的 `SameNetworkLoginUrl`，不要依赖旧书签或记住某个固定 IP。

如果校内网限制了同一 Wi-Fi 下设备互访，但允许这台电脑通过 SSH 访问腾讯云服务器，可以改用公网一键启动：

```text
start-school-public-pilot.cmd
```

它会做三件事：

- 把 `NEXTAUTH_URL` 准备成 `http://119.45.252.190:62000`
- 打开一个本地应用窗口，运行 `npm.cmd run start -- --hostname 0.0.0.0 --port 3000`
- 打开一个公网隧道窗口，通过 `plink` 把腾讯云 `62000` 反向映射到本机 `3000`

这条路径当前验证通过的公网登录地址是：

```text
http://119.45.252.190:62000/login
```

注意：公网访问依赖两个可见窗口同时保持开启：

- `XiaoWu Local App`
- `XiaoWu Public Tunnel`

如果要一键停止这两个窗口对应的服务，可以双击：

```text
stop-school-public-pilot.cmd
```

执行届别滚动后，教师档案里会用到的年级部门名称也会一起和当前在校届别对齐。例如当前在校届别变成 `2024级 / 2025级 / 2027级` 时，年级部门名称也会保持为 `2024级年级 / 2025级年级 / 2027级年级`。

如果你刚执行过 `npm run build` 或刚更新过代码，而浏览器打开 `/login` 时出现 `This page couldn’t load`，通常不是登录页路由坏了，而是旧的 `next start` 进程还在提供旧版本页面、前端 chunk 对不上。此时请重新运行 `start-school-pilot.cmd` 或重新执行一次 `npm run pilot:school`。

如果 `/login` 能正常打开，但登录后进入 `师生档案`、`往届存档`、`常规检查` 或 `统计导出` 时出现 `This page couldn’t load / A server error occurred`，优先检查 live PostgreSQL schema 是否落后于当前代码。典型服务端错误是 Prisma `P2022 ColumnNotFound`。处理顺序：

```bash
npm run db:push
```

如果 Prisma 提示新增唯一约束需要确认，先检查目标表是否已有冲突数据；确认没有冲突后再按提示执行带确认参数的 schema 同步。同步后重新打开上述四个业务页，确认都能返回正常页面。

## 登录账号

系统优先使用数据库 `User` 表中的账号登录，密码以哈希形式保存。首次部署或数据库暂不可用时，仍可使用兜底管理员进入后台。

兜底管理员通过环境变量控制：

- `BOOTSTRAP_ADMIN_USERNAME`
- `BOOTSTRAP_ADMIN_PASSWORD`

执行 `npm run db:seed:demo` 后，可使用以下数据库账号登录，默认演示密码均为 `ChangeMe123!`：

- `admin`：系统管理员
- `leader1`、`leader2`、`leader3`：校领导
- `grade11.manager1`、`grade11.manager2`、`grade11.manager3`：高二年级管理员，均绑定高二
- `data.manager`：数据管理员
- `inspector`：常规检查员

## 常用命令

```bash
npm run dev
npm run lint
npm run typecheck
npm run build
npm run db:generate
npm run db:validate
npm run db:migrate
npm run db:push
npm run db:seed:demo
npm run db:seed:demo:dry-run
npm run db:clear:demo
npm run db:clear:demo:dry-run
npm run test:demo-db
npm run db:studio
```

## 无 PostgreSQL 时的模拟验证

当前机器如果没有 Docker 或 PostgreSQL，可运行：

```bash
npm run test:demo-db
```

该命令会使用 PGlite 创建临时 Postgres 兼容数据库，写入高中模拟数据，并生成统计导出文件到 `outputs/simulation`。

## 部署和烟测

详见：

- `docs/deployment-and-smoke-test.md`
- `docs/final-delivery-checklist.md`
- `docs/security-and-deployment-plan.md`
- `docs/school-server-pilot-checklist.md`
- `docs/postgresql-install-and-acceptance-runbook.md`
- `docs/pilot-accounts-and-usage-guide.md`

## 工作流

开始任何新任务前，先按顺序阅读：

1. `memory-bank/prd.md`
2. `memory-bank/tech-stack.md`
3. `memory-bank/implementation-plan.md`
4. `memory-bank/progress.md`
5. `memory-bank/architecture.md`

## 2026-05-09 Migration Acceptance Note

This migrated workstation has been verified as runnable with the following local state:

- PostgreSQL service: `postgresql-xiaowuxitong`
- PostgreSQL install path: `D:\PostgreSQL\17`
- PostgreSQL data path: `D:\PostgreSQL\data`
- PostgreSQL tools path: `D:\PostgreSQL\17\bin`
- Application database: `school_affairs`
- Application database user: `school_admin`
- Current `DATABASE_URL`: use the current `school_admin` password recorded in `docs/pilot-accounts-and-usage-guide.md`
- Current same-network login URL source: `logs/current-school-pilot-url.txt`

On this workstation, PowerShell may block direct `npm` because of execution policy. Use `npm.cmd run ...` when that happens:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
npm.cmd run db:push
```

If PostgreSQL tools are not on `PATH`, use the full path:

```powershell
& "D:\PostgreSQL\17\bin\psql.exe" -h 127.0.0.1 -U school_admin -d school_affairs
```
