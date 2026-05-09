# 部署与烟测指南

本指南用于当前学校内网试点部署。

本轮已批准方案默认是：

- 先在高二年级试用
- PostgreSQL 安装在当前试点电脑的 `D` 盘
- Web 应用也运行在这台试点电脑上
- 其他办公电脑通过这台电脑的校内网 IP 访问系统
- PostgreSQL 优先只对本机 `localhost` 开放，校内其他电脑只访问 Web 端口

如果这次不是你一个人独立部署，而是要和学校领导、网管、试点老师一起推进，建议先看：

- `docs/school-server-pilot-checklist.md`
- `docs/postgresql-install-and-acceptance-runbook.md`
- `docs/security-and-deployment-plan.md`

## 1. 准备环境变量

复制模板并修改配置：

```bash
cp .env.example .env.local
```

至少需要配置：

```env
NEXTAUTH_URL=http://试点电脑IP:3000
NEXTAUTH_SECRET=change-this-before-production
BOOTSTRAP_ADMIN_USERNAME=admin
BOOTSTRAP_ADMIN_PASSWORD=ChangeMe123!
DATABASE_URL=postgresql://school_admin:school_password@localhost:5432/school_affairs?schema=public
```

真实部署时，务必替换 `NEXTAUTH_SECRET` 和兜底管理员密码。

## 2. 启动 PostgreSQL

当前试点建议让 PostgreSQL 和本项目运行在同一台电脑上：

- PostgreSQL 数据目录放在 `D` 盘，例如 `D:\PostgreSQL\data`
- `DATABASE_URL` 继续使用 `localhost:5432`
- 其他办公电脑不要直连 PostgreSQL，只访问系统页面

如果学校允许 Docker：

```bash
docker compose up -d postgres
```

如果学校要求原生安装，请确认 PostgreSQL 服务已启动，并且应用账号能访问本机试点库。

## 3. 安装并准备应用

```bash
npm install
npm run db:generate
npm run db:push
```

`db:push` 会把当前 Prisma schema 同步到 PostgreSQL。正式投产前建议切换到受控 migration 流程。

## 4. 写入演示数据

```bash
npm run db:seed:demo
```

如需只删除由 `npm run db:seed:demo` 写入的固定演示数据，可先预览再执行：

```bash
npm run db:clear:demo:dry-run
npm run db:clear:demo
```

该清理命令只按 `scripts/demo-data.mjs` 中的固定演示 ID 删除。通过页面手工录入的测试数据没有演示标记，不能被系统可靠地区分为“演示”或“真实”，需要按明确条件单独筛选删除，或从导入真实数据前的备份恢复。

当前演示数据包含：

- 9 个可登录用户
- 2 条兼容 `AcademicYear` 记录
- 4 个年级（含 3 个在校届别和 1 个往届存档届别）
- 15 个班级
- 6 个部门
- 6 个学科
- 4 个动态信息统计类目
- 12 名教师
- 114 名学生
- 6 个检查分类
- 8 个检查项目
- 1344 条检查记录

演示用户默认密码均为 `ChangeMe123!`：

- `admin`：系统管理员
- `leader1`、`leader2`、`leader3`：校领导
- `grade11.manager1`、`grade11.manager2`、`grade11.manager3`：高二年级管理员，均绑定高二
- `data.manager`：数据管理员
- `inspector`：常规检查员

种子脚本只会删除并重写固定演示编号对应的数据，仍建议只在空的试点库执行。

如果暂时没有 PostgreSQL，可先运行本地 PGlite 模拟：

```bash
npm run test:demo-db
```

模拟输出会写入 `outputs/simulation`。

## 5. 启动 Web 应用

建议优先使用项目内置的试点启动脚本：

```text
start-school-pilot.cmd
```

或命令行：

```bash
npm run pilot:school
```

脚本还会写入 `logs/current-school-pilot-url.txt`，包含 `LocalLoginUrl`、`SameNetworkLoginUrl` 和 `ComputerNameLoginUrl`，方便在 DHCP 或网络位置变化后找回当前正确地址。

脚本会把 `NEXTAUTH_URL` 设置为这台试点电脑的当前 IP，并用生产模式启动应用。

如果这次启动前刚执行过届别滚动，系统会按滚动完成后的在校届别集合自动同步教师年级部门名称。比如在校届别变成 `2024级 / 2025级 / 2027级` 时，教师相关年级部门会对齐成 `2024级年级 / 2025级年级 / 2027级年级`。

如果脚本没有自动识别出校内网 IP，可以手动指定：

```bash
npm run pilot:school -- -PublicHost 192.168.x.x
```

如果你要手动启动，也可以执行：

```bash
npm run build
npm run start -- --hostname 0.0.0.0 --port 3000
```

然后在试点电脑和其他办公电脑上打开：

```text
http://试点电脑IP:3000/login
```

### 5.1 校内网互访受限时的公网入口

如果学校网络阻止同一 Wi-Fi 下设备直接访问这台试点电脑，但这台电脑仍然可以通过 SSH 访问腾讯云服务器 `119.45.252.190`，可以改用项目内置的一键公网启动入口：

```text
start-school-public-pilot.cmd
```

它会：

1. 准备 `.env.local` 里的 `NEXTAUTH_URL=http://119.45.252.190:62000`
2. 打开本地应用窗口并运行：
```text
npm.cmd run start -- --hostname 0.0.0.0 --port 3000
```
3. 打开公网隧道窗口并运行 `plink` 反向 SSH，把腾讯云 `62000` 转回本机 `3000`

当前已验证可用的公网地址是：

```text
http://119.45.252.190:62000/login
```

注意事项：

- `XiaoWu Local App` 窗口不能关
- `XiaoWu Public Tunnel` 窗口也不能关
- 这条路径依赖腾讯云安全组已经放行 `62000/TCP`
- 如果公网入口失效，优先检查是不是隧道窗口被关闭了

如果需要一键停止这条公网路径，可以双击：

```text
stop-school-public-pilot.cmd
```

它会尝试：

- 关闭可见的 `plink` 隧道进程
- 停掉当前监听本地 `3000` 端口的应用进程

### 构建后必须重启正在运行的站点

如果这台试点电脑已经有一个正在运行的 `next start` 进程，只执行 `npm run build` 并不会让现有站点自动切到最新代码。

这会出现一种很迷惑的现象：

- `/login` 地址表面上还能打开
- 但浏览器会显示 `This page couldn’t load`
- 浏览器控制台或开发者日志里会出现 `ChunkLoadError`
- 某个 `/_next/static/chunks/*.js` 资源会返回 `404`

这通常说明：正在监听 `3000` 的旧进程还在提供旧版本页面，而磁盘上的 `.next` 已经换成了新构建，前端 HTML 和静态资源版本对不上了。

处理方法：

1. 停掉当前监听 `3000` 的旧 `node` / `next start` 进程。
2. 重新运行 `start-school-pilot.cmd`，或重新执行：

```bash
npm run pilot:school -- -PublicHost 192.168.x.x
```

3. 再访问 `http://试点电脑IP:3000/login`。
4. 如仍异常，再直接检查出错的 chunk 地址是否返回 `200`。

### 登录页正常但业务页报 server error

如果 `/login` 可以打开并且账号能登录，但进入 `/dashboard/people`、`/dashboard/archive/students`、`/dashboard/inspection` 或 `/dashboard/exports` 时出现：

```text
This page couldn't load
A server error occurred
```

优先排查 live PostgreSQL schema 是否落后于当前代码。这个项目的典型服务端错误是 Prisma `P2022 ColumnNotFound`，例如业务页查询 `Teacher`、`Student` 或 `InspectionRecord` 时发现当前数据库缺少新列。

处理顺序：

1. 在项目根目录确认 `.env.local` 指向当前 live PostgreSQL。
2. 执行 schema 同步：
```bash
npm run db:push
```
3. 如果 Prisma 因新增唯一约束要求显式确认，先检查相关列是否已经存在以及是否有重复数据；确认无冲突后，再按 Prisma 提示执行带确认参数的同步。
4. 重新登录并逐个检查：
   - `/dashboard/people`
   - `/dashboard/archive/students`
   - `/dashboard/inspection`
   - `/dashboard/exports`

2026-05-01 的 live 恢复中，业务页 server error 的根因就是 PostgreSQL 表结构落后；schema 同步后无需重启现有 `0.0.0.0:3000` 进程，四个业务页即可恢复。

## 6. 浏览器烟测清单

写入演示数据后，按顺序检查：

1. 登录
   - 访问 `/login`
   - 使用 `admin` 登录
   - 确认可以进入 `/dashboard`

2. 用户权限
   - 用 `admin` 打开 `/dashboard/users`
   - 新增一个临时用户
   - 修改该用户角色和负责年级
   - 重置密码
   - 停用并重新启用该用户

3. 角色范围
   - 用 `leader1` 登录，确认可以访问 `/dashboard/people` 和 `/dashboard/exports`
   - 确认 `leader1` 不能进入 `/dashboard/users` 和 `/dashboard/structure`
   - 确认 `leader1` 可以进入 `/dashboard/inspection` 查看全校检查记录，但页面只读、不能录入或修改
   - 用 `grade11.manager1` 登录，确认 `/dashboard/people` 只显示高二学生数据，教师区域不可见
   - 继续检查 `/dashboard/inspection` 和 `/dashboard/exports`，确认 `grade11.manager1` 只能看到高二范围数据

4. 学校结构
   - 用 `admin` 打开 `/dashboard/structure`
   - 确认在校年级、班级、部门和学科正常显示
   - 确认页面不再要求手工维护学年记录，新增最新一届会由系统自动维护兼容层
   - 如刚执行届别滚动，确认教师相关年级部门名称也已经和最新在校届别一致
   - 在某个年级下新增一个临时班级，重命名后再删除

5. 师生档案
   - 用 `data.manager` 或 `leader1` 打开 `/dashboard/people`
   - 按部门或学科筛选教师
   - 按年级或班级筛选学生
   - 下载教师和学生导入模板
   - 导出筛选后的教师和学生结果

6. 常规检查
   - 用 `inspector` 打开 `/dashboard/inspection`
   - 确认检查分类和项目正常显示
   - 为某个班级新增一条临时检查记录
   - 按日期、项目、年级和班级筛选记录

7. 统计导出
   - 打开 `/dashboard/exports`
   - 按日期范围和年级筛选
   - 确认指标卡和汇总表更新
   - 下载 Excel 和 CSV 检查统计报表

8. 审计检查
   - 每次检查统计导出应新增一条 `AuditLog`，动作为 `EXPORT_INSPECTION_REPORT`
   - 用户新增、角色调整、停用启用和密码重置也应写入审计日志

## 7. 验证命令

交付前运行：

```bash
npm run db:generate
npm run lint
npm run typecheck
npm run build
npm run db:validate
```

如果当前机器没有真实 PostgreSQL，`db:validate` 仍需要设置 `DATABASE_URL`，但不要求数据库可连接。

## 8. 当前已知注意事项

- 当前工作站已经完成真实 PostgreSQL 连接、浏览器烟测、以及一次备份恢复演练；这部分不再是交付缺口
- 如果要继续使用 in-app `browser-use` 做本机视觉验收，直接使用 `http://127.0.0.1:3000/login` 即可；登录成功后页面现在保持在当前访问主机下，不再被旧的 `NEXTAUTH_URL` 拖去过期局域网地址
- 正式投产前应替换默认演示密码，并确认是否收紧兜底管理员账号的使用方式
- 试点电脑如果在新构建后没有重启正在运行的 `next start`，浏览器可能出现 `This page couldn’t load` 或 `ChunkLoadError`；这时应先重启站点再继续排查
- 如果登录页正常但数据业务页出现 server error，应优先检查 Prisma schema 是否已经同步到 live PostgreSQL，再排查业务代码
- 当前已验证的是“当前 Windows 登录账号登录后自动拉起站点”；如果学校后续要做“无人登录也能机开即起”的机器级自启动，仍需要管理员权限和真正的 Windows 任务或服务
## 2026-05-09 Migrated Workstation Notes

The migrated workstation verified on 2026-05-09 does not match the earlier D-drive PostgreSQL pilot exactly. Its verified state is:

- PostgreSQL service: `postgresql-x64-17`
- PostgreSQL install path: `C:\Program Files\PostgreSQL\17`
- PostgreSQL data path: `C:\Program Files\PostgreSQL\17\data`
- PostgreSQL tools: `C:\Program Files\PostgreSQL\17\bin`
- Application DB: `school_affairs`
- Application DB role: `school_admin`
- Current DB URL: `postgresql://school_admin:school_password@localhost:5432/school_affairs?schema=public`

This C-drive PostgreSQL install is acceptable for the migrated workstation smoke test. A future move to `D:\PostgreSQL\data` should be treated as a separate PostgreSQL administration task, not a requirement for normal app smoke.

On this workstation, prefer `npm.cmd run ...` in PowerShell if direct `npm run ...` is blocked by execution policy.
