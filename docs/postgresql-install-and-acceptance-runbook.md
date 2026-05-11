# PostgreSQL 安装与验收手册

## 适用场景

这份手册用于当前学校已批准的试点电脑方案：在这台电脑上安装 PostgreSQL、连接项目、写入演示数据并完成验收。

如果学校还没有批准试点电脑部署，先看：

- `docs/approval-brief.md`
- `docs/school-server-pilot-checklist.md`

## 一、安装前准备

至少确认以下信息已经到位：

- 服务器操作系统和管理员权限
- 这台试点电脑的校内网 IP
- PostgreSQL 安装方式：原生安装或 Docker
- 项目部署目录
- Node.js LTS 已可用
- `.env.local` 已准备
- 学校允许的访问网段
- 备份目录位置

## 二、推荐安装路径

当前推荐优先顺序：

1. 学校已有 PostgreSQL 规范时，优先按学校规范安装在这台试点电脑的 `D` 盘
2. 无统一规范时，优先使用原生 PostgreSQL 服务安装
3. 只有在学校允许 Docker 时，才使用容器方式

当前试点更推荐：

- PostgreSQL 数据目录放在 `D:\PostgreSQL\data` 或学校批准的同类目录
- Web 应用与 PostgreSQL 放在同一台试点电脑上
- PostgreSQL 仅监听 `localhost`
- 其他办公电脑通过 `http://试点电脑IP:3000` 访问系统，不直接连接数据库

## 三、创建数据库与应用账号

由 PostgreSQL 管理员执行：

```sql
CREATE USER school_admin WITH PASSWORD '请替换为强密码';
CREATE DATABASE school_affairs OWNER school_admin;
```

## 四、准备应用环境变量

在项目根目录创建或修改 `.env.local`：

```env
NEXTAUTH_URL=http://试点电脑IP:3000
NEXTAUTH_SECRET=请替换为长随机字符串
BOOTSTRAP_ADMIN_USERNAME=admin
BOOTSTRAP_ADMIN_PASSWORD=请替换为强密码
DATABASE_URL=postgresql://school_admin:数据库密码@localhost:5432/school_affairs?schema=public
```

注意：

- `NEXTAUTH_URL` 要和办公电脑实际访问的地址一致
- `NEXTAUTH_SECRET` 不要继续使用演示值
- 兜底管理员密码要与演示环境分开
- 如果只是当前试点电脑本机运行数据库，不需要把 `DATABASE_URL` 改成局域网 IP
- 当前 live 试点电脑的真实数据库密码口径，以 `docs/pilot-accounts-and-usage-guide.md` 或当前 `.env.local` 为准，不要把其他文档里的默认示例值当作现场真值

## 五、初始化项目

在项目目录执行：

```bash
npm install
npm run db:generate
npm run db:push
npm run db:seed:approval-defaults
npm run db:seed:approval-pilot
```

如只想先检查配置，可先执行：

```bash
npm run db:validate
```

`db:seed:approval-pilot` 会补齐当前试点的教师申请账号、后勤审批员、行政审批员和标准审批职责。后续每次代码或 Prisma schema 更新后，也要确认 live PostgreSQL 已经同步到当前 schema。否则可能出现 `/login` 正常，但用户权限、数据管理、师生档案、往届存档、常规检查、统计导出等业务页报 `This page couldn't load / A server error occurred`。典型服务端错误是 Prisma `P2022 ColumnNotFound`。

## 六、写入演示数据

确认当前数据库是试点库后，执行：

```bash
npm run db:seed:demo
```

完成验收后，如果只想移除种子脚本写入的固定演示数据，可执行：

```bash
npm run db:clear:demo:dry-run
npm run db:clear:demo
```

该命令不会模糊删除人工录入的数据。人工提交的测试记录如果没有明确标记，需要先导出或查询确认范围，再按具体 ID、账号或时间窗口处理；更稳妥的方式是在导入真实数据前恢复到清洁备份。

写入后可使用以下数据库用户登录，默认密码均为 `ChangeMe123!`：

- `admin`：系统管理员
- `leader1`、`leader2`、`leader3`：校领导
- `grade11.manager1`、`grade11.manager2`、`grade11.manager3`：高二年级管理员，均绑定高二
- `data.manager`：教务工作人员
- `inspector`：政教工作人员
- `logistics.office`：后勤办公人员，默认处理日常报修
- `admin.office`：行政办公人员，默认处理学校行政用打印申请
- `teacher.wangming`：已绑定教师档案的试点教师账号，可提交本人申请

如学校不允许默认演示密码长期存在，完成验收后应立即重置或删除这些账号。

## 七、启动应用

推荐先用更接近正式环境的方式验证：

```bash
npm run pilot:school
```

浏览器打开：

```text
http://试点电脑IP:3000/login
```

`logs/current-school-pilot-url.txt` 会记录当前局域网访问地址，其他办公电脑应以其中地址为准；试点电脑本机始终可以使用 `http://127.0.0.1:3000/login`。

如果验收前刚执行过届别滚动，还应顺手确认教师档案里使用的年级部门名称已经和当前在校届别一致，而不需要再手工改一轮 `XXXX级年级`。

## 八、现场验收顺序

1. 登录验收
   - 用 `admin` 登录
   - 确认能进入 `/dashboard`

2. 用户权限验收
   - 打开 `/dashboard/users`
   - 新增一个临时用户
   - 修改角色和负责年级
   - 重置密码
   - 停用、再启用

3. 角色范围验收
   - 用 `leader1` 登录，确认可访问 `/dashboard/people` 和 `/dashboard/exports`
   - 确认 `leader1` 不能进入 `/dashboard/users` 和 `/dashboard/structure`
   - 确认 `leader1` 可以进入 `/dashboard/inspection` 查看全校检查记录，但不能录入和修改
   - 用 `grade11.manager1` 登录，确认只能看到高二学生、检查和统计数据
   - 尝试通过筛选条件访问其他年级，确认系统仍只返回绑定年级的数据

4. 学校结构验收
   - 用 `admin` 打开 `/dashboard/structure`
   - 在某个年级下新增一个临时班级
   - 重命名该班级
   - 删除该临时班级

5. 师生档案验收
   - 用 `data.manager`（教务工作人员）或 `leader1` 打开 `/dashboard/people`
   - 筛选教师和学生
   - 下载教师模板和学生模板
   - 导出当前筛选结果
   - 用有权限账号修改或删除误录教师、误录学生；已有检查记录关联的教师应阻止硬删

6. 常规检查验收
   - 用 `inspector`（政教工作人员）打开 `/dashboard/inspection`
   - 新增一条临时检查记录
   - 修改该临时检查记录
   - 用筛选条件查回该记录
   - 删除该误录检查记录

7. 申请审批验收
   - 用 `admin` 打开 `/dashboard/approvals`
   - 确认默认申请类型包含日常报修、日常材料打印和其他申请
   - 如果已执行 `npm run db:seed:approval-pilot`，确认日常报修默认流向 `logistics.office`；如未使用试点配置，则先配置至少一个后勤审批职责或固定审批账号
   - 用 `teacher.wangming` 或其他已绑定教师档案的教师账号提交一条报修申请
   - 提交一条日常材料打印申请，确认必须填写材料类型、打印形式、纸张大小和打印数量
   - 用对应审批账号进入待我审批，填写意见后通过或驳回

8. 统计导出验收
   - 打开 `/dashboard/exports`
   - 按日期和年级筛选
   - 下载 Excel 和 CSV

## 九、数据库层面的验收补充

如学校网管希望查看数据库层面的结果，可执行只读查询：

```sql
SELECT COUNT(*) AS user_count FROM "User";
SELECT COUNT(*) AS teacher_count FROM "Teacher";
SELECT COUNT(*) AS student_count FROM "Student";
SELECT COUNT(*) AS inspection_record_count FROM "InspectionRecord";
SELECT action, COUNT(*) AS action_count
FROM "AuditLog"
GROUP BY action
ORDER BY action_count DESC;
```

这些结果可证明：

- 演示数据已写入
- 业务表可正常写入
- 审计日志在工作

## 十、备份与恢复最低要求

试点当天至少完成两项：

1. 备份一次数据库
2. 记录恢复负责人和恢复命令位置

同时明确：

- 备份文件保存目录
- 保留份数
- 负责检查备份成功的人

## 十一、试点结束后立刻要做的事

- 记录服务器地址、数据库名、数据库用户、应用访问地址
- 保存烟测结果和发现的问题
- 修改默认演示密码，或删除不再需要的演示账号
- 确认是否进入单年级或单部门的小范围真实数据试点

## 十二、常见卡点

### 1. `db:push` 失败

优先检查：

- `DATABASE_URL` 是否填写正确
- PostgreSQL 是否已启动
- 应用账号是否对目标数据库有权限
- 如果 Prisma 提示新增唯一约束可能有数据风险，先检查目标表是否已有重复数据；确认无冲突后，再按 Prisma 提示执行带确认参数的同步

### 2. 登录页正常，但业务页 server error

优先检查：

- 当前运行的代码是否比 live PostgreSQL schema 更新
- 是否忘记在 live 数据库上执行 `npm run db:push`
- 服务端日志是否出现 Prisma `P2022 ColumnNotFound`

处理后需要重新打开 `/dashboard/users`、`/dashboard/data-management`、`/dashboard/people`、`/dashboard/archive/students`、`/dashboard/inspection` 和 `/dashboard/exports` 做页面级验证。

### 3. 能打开登录页，但数据库账号登录失败

优先检查：

- 是否真的执行过 `npm run db:seed:demo`
- `User.passwordHash` 是否已写入
- 试点账号是否被停用

### 4. 导出没问题，但还不敢切真实数据

这是正常的。建议先做脱敏样例数据，再做单年级、单部门试点，不要直接全校切换。
## 当前工作站补充说明

- 当前 live 试点环境的数据库账号、密码与访问口径，以 `docs/pilot-accounts-and-usage-guide.md` 为准。
- 当前现场默认工作站使用 `D:\PostgreSQL\17` / `D:\PostgreSQL\data` 与服务 `postgresql-xiaowuxitong`；历史上验收过的 `C:\Program Files\PostgreSQL\17` 迁移机器只代表另一种可接受落地形态。
- 如果你在另一台新电脑上复现这套环境，真正需要验收的是 PostgreSQL 服务是否启动、`school_affairs` 是否存在、`school_admin` 是否能用当前 `.env.local` 里的密码连接，以及 `npm.cmd run db:push` 后业务页是否能正常打开。
