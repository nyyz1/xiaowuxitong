# PostgreSQL 运维与验收手册

## 适用场景

当前 PostgreSQL 运行在腾讯云轻量应用服务器本机，作为校务系统正式数据库。旧的 Windows 试点电脑安装流程已经不是当前主线。

## 当前数据库口径

- 服务器：`124.222.136.121`
- 数据库：`school_affairs`
- 应用用户：`school_admin`
- 连接方式：应用通过服务器本机 `127.0.0.1:5432` 连接
- 配置位置：`/opt/xiaowuxitong/app/.env.local`
- 备份位置：`/opt/xiaowuxitong/backups`

不要开放公网 `5432`。

## 检查 PostgreSQL 状态

```bash
sudo systemctl status postgresql
pg_isready -h 127.0.0.1 -p 5432
```

查看当前应用连接串时，只在服务器上读取 `.env.local`，不要把密码复制进 Git 文档：

```bash
cd /opt/xiaowuxitong/app
grep '^DATABASE_URL=' .env.local
```

## Schema 同步

部署脚本会自动执行 schema 同步。手动处理时：

```bash
cd /opt/xiaowuxitong/app
npm run db:generate
npm run db:validate
npx prisma db push
```

如果 Prisma 要求确认数据丢失，先检查 schema 变更是否符合预期。确认后再使用部署入口的 `-AllowAcceptDataLoss`，或在服务器上显式执行：

```bash
npx prisma db push --accept-data-loss
```

## 基础配置种子

正式云端部署只补齐基础配置，不写演示数据：

```bash
npm run db:seed:approval-defaults
npm run db:seed:department-positions
```

不在云端正式库执行：

```bash
npm run db:seed:demo
```

## 备份

部署前会自动备份。手动备份：

```bash
cd /opt/xiaowuxitong/app
bash scripts/server/backup-postgres.sh
```

备份文件格式为 PostgreSQL custom dump：

```text
/opt/xiaowuxitong/backups/school_affairs-YYYYMMDD-HHMMSS.dump
```

默认保留最近 10 份。

## 恢复演练

建议先恢复到临时库核对：

```bash
createdb school_affairs_restore_check
pg_restore --no-owner --no-acl --dbname=school_affairs_restore_check /opt/xiaowuxitong/backups/某个备份.dump
```

核对关键表：

```sql
SELECT COUNT(*) FROM "User";
SELECT COUNT(*) FROM "Teacher";
SELECT COUNT(*) FROM "Student";
SELECT COUNT(*) FROM "InspectionRecord";
SELECT COUNT(*) FROM "ApprovalRequest";
SELECT COUNT(*) FROM "AuditLog";
```

确认无误后再制定正式恢复方案。不要在未核对备份内容的情况下覆盖正式库。

## 验收顺序

1. PostgreSQL 服务正常。
2. `.env.local` 的 `DATABASE_URL` 可连接。
3. `npm run db:validate` 通过。
4. `npx prisma db push` 无未处理 schema drift。
5. 基础配置种子可重复执行。
6. `npm run smoke:pages -- --base-url=http://127.0.0.1:3000` 通过。
7. `/dashboard/data-management` 能显示数据量和备份保护提示。

## 常见卡点

### 业务页 server error

如果 `/login` 正常，但用户权限、数据管理、师生档案、往届存档、申请审批或统计导出报错，优先检查 schema drift。典型错误是 Prisma `P2022 ColumnNotFound`。

处理：

```bash
cd /opt/xiaowuxitong/app
npm run db:validate
npx prisma db push
sudo systemctl restart xiaowuxitong
npm run smoke:pages -- --base-url=http://127.0.0.1:3000
```

### 备份失败

检查：

- `DATABASE_URL` 是否存在
- PostgreSQL 是否运行
- `/opt/xiaowuxitong/backups` 是否可写
- 磁盘空间是否足够

```bash
df -h
ls -ld /opt/xiaowuxitong/backups
```

### 误执行演示数据脚本

先停止继续操作，立即备份当前库，再确认误写入的数据范围。`db:clear:demo` 只适合清理固定演示 ID，不应模糊删除人工录入数据。
