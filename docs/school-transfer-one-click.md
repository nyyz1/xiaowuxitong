# 学校电脑一键迁移说明

这份说明用于“只搬项目，不搬当前数据”的场景。

推荐流程是：

1. 在家里电脑双击 `package-for-school.cmd` 生成迁移压缩包。
2. 把压缩包复制到学校办公室电脑。
3. 在学校电脑解压到 `D:\xiaowuxitong`。
4. 在学校电脑双击 `setup-school-workstation.cmd` 完成首次初始化并启动。

## 迁移包里不包含什么

`package-for-school.cmd` 默认不会打包这些内容：

- `.env.local`
- `node_modules`
- `.next`
- `.tmp`
- `logs`
- `outputs`
- `artifacts`
- `.git`
- `*.dump`
- `*.zip`
- `*.log`

也就是说，它不会带走家里电脑上的数据库、构建产物、依赖目录、日志或备份文件。

## 学校电脑需要先准备什么

现在 `setup-school-workstation.cmd` 会先自动检查：

- Node.js LTS
- PostgreSQL

如果没有检测到 Node.js LTS 或 PostgreSQL，脚本会尝试通过 `winget` 安装：

- `OpenJS.NodeJS.LTS`
- `PostgreSQL.PostgreSQL.17`

这一步是否能全自动成功，取决于学校电脑是否有：

- 可用网络
- `winget`
- 足够的安装权限
- 学校安全策略允许安装软件

PostgreSQL 安装器如果弹出界面，需要手动选择安装路径和 `postgres` 超级用户密码。请记住这个密码，后面脚本会用它创建应用数据库。

脚本现在也会自动检查或创建：

- `school_admin` 用户
- `school_affairs` 数据库

默认数据库连接为：

```text
postgresql://school_admin:school_password@localhost:5432/school_affairs?schema=public
```

如果学校电脑使用了不同的应用数据库密码，可以用 PowerShell 指定：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\setup-school-workstation.ps1 -DatabaseUrl "postgresql://school_admin:你的密码@localhost:5432/school_affairs?schema=public"
```

如果你想显式指定应用库、应用用户和应用密码，也可以用：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\setup-school-workstation.ps1 -AppDatabaseName "school_affairs" -AppDatabaseUser "school_admin" -AppDatabasePassword "你的应用数据库密码"
```

如果学校电脑已经装好软件，不希望脚本尝试安装缺失项：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\setup-school-workstation.ps1 -SkipPrerequisiteInstall
```

如果学校网管已经手动创建好了数据库用户和数据库，不希望脚本建库：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\setup-school-workstation.ps1 -SkipDatabaseBootstrap
```

## 家里电脑：一键打包

在项目根目录双击：

```text
package-for-school.cmd
```

生成的压缩包会在：

```text
artifacts\school-transfer\
```

文件名类似：

```text
xiaowuxitong-school-transfer-20260508-153000.zip
```

## 学校电脑：一键初始化和启动

把压缩包解压到：

```text
D:\xiaowuxitong
```

然后双击：

```text
setup-school-workstation.cmd
```

它会依次执行：

1. 检查 Node.js/npm，缺失时尝试用 `winget` 安装
2. 检查 PostgreSQL/`psql.exe`，缺失时尝试用 `winget` 安装
3. 启动本机 PostgreSQL 服务
4. 提示输入 `postgres` 超级用户密码
5. 创建或更新 `school_admin` 用户和 `school_affairs` 数据库
6. 创建或更新 `.env.local`
7. 安装 npm 依赖
8. 生成 Prisma Client
9. 把当前 schema 同步到空的 PostgreSQL 数据库
10. 写入演示账号和演示数据
11. 构建应用
12. 启动学校试点站点

启动后查看：

```text
logs\current-school-pilot-url.txt
```

其中：

- `LocalLoginUrl` 是学校电脑本机访问地址
- `SameNetworkLoginUrl` 是同一办公室网络里其他电脑访问地址

## 不想写入演示数据

如果学校电脑只想初始化空库，不写演示数据，用：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\setup-school-workstation.ps1 -SkipDemoSeed
```

空库仍然可以用 `.env.local` 里的 Bootstrap 管理员登录，之后再进入系统创建正式用户。

## 常见卡点

### 找不到 npm

脚本会先尝试用 `winget` 安装 Node.js LTS。如果仍然失败，通常是学校电脑没有 `winget`、没有网络、没有安装权限，或者安装后当前窗口还没有刷新 PATH。

可以重开一次命令窗口或重新双击 `setup-school-workstation.cmd`。

### 找不到 PostgreSQL 或 psql

脚本会先尝试用 `winget` 安装 PostgreSQL 17。如果安装器弹出界面，请按提示完成安装，并记住 `postgres` 超级用户密码。

如果学校电脑不允许自动安装，请让网管手动安装 PostgreSQL 17，然后重新双击初始化脚本。

### PostgreSQL 管理员密码

创建 `school_admin` 和 `school_affairs` 时，脚本需要连接本机 PostgreSQL 的 `postgres` 超级用户。

如果不知道这个密码，需要重新设置 PostgreSQL 管理员密码，或让学校网管先手动创建应用用户和数据库，然后用：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\setup-school-workstation.ps1 -SkipDatabaseBootstrap
```

### `db:push` 失败

优先检查：

- PostgreSQL 是否已安装并启动
- `school_affairs` 数据库是否已经创建
- `school_admin` 用户密码是否和 `.env.local` 里的 `DATABASE_URL` 一致

### 其他电脑打不开

先在学校电脑本机打开：

```text
http://127.0.0.1:3000/login
```

如果本机能打开、其他电脑打不开，通常是 Windows 防火墙没有放行 TCP `3000`，或者其他电脑不在同一个局域网。
## 2026-05-09 Migration Acceptance Addendum

One migrated workstation has now been verified with this actual local shape:

- PostgreSQL service name: `postgresql-x64-17`
- PostgreSQL install path: `C:\Program Files\PostgreSQL\17`
- PostgreSQL data path: `C:\Program Files\PostgreSQL\17\data`
- PostgreSQL tool path: `C:\Program Files\PostgreSQL\17\bin`
- `psql.exe` and `pg_dump.exe` may not be on `PATH`
- direct `npm` in PowerShell may be blocked by execution policy; use `npm.cmd run ...`

If `.env.local` uses the default connection below but `school_admin` cannot log in:

```text
postgresql://school_admin:school_password@localhost:5432/school_affairs?schema=public
```

log in with the PostgreSQL superuser `postgres`, then create or reset the application role and database:

```sql
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'school_admin') THEN
    CREATE ROLE school_admin LOGIN PASSWORD 'school_password';
  ELSE
    ALTER ROLE school_admin WITH LOGIN PASSWORD 'school_password';
  END IF;
END $$;
```

If `school_affairs` does not exist:

```sql
CREATE DATABASE school_affairs OWNER school_admin;
```

If `school_affairs` already exists:

```sql
ALTER DATABASE school_affairs OWNER TO school_admin;
GRANT ALL ON SCHEMA public TO school_admin;
ALTER SCHEMA public OWNER TO school_admin;
```

Then sync and seed from the project directory:

```powershell
$env:DATABASE_URL="postgresql://school_admin:school_password@localhost:5432/school_affairs?schema=public"
npm.cmd run db:push
npm.cmd run db:seed:demo
```
