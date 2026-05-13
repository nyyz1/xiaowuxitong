# 云端账号与日常使用说明

本文对应当前腾讯云运行环境。旧的 Windows 试点电脑、局域网 IP、`D:\PostgreSQL\data`、公网隧道和演示数据账号不再是当前口径。

## 当前环境

- 登录入口：`http://124.222.136.121/login`
- 应用服务：腾讯云服务器 `xiaowuxitong.service`
- 数据库：腾讯云服务器本机 PostgreSQL，数据库 `school_affairs`
- 数据状态：当前云端 PostgreSQL 不保留旧演示测试数据
- 服务器配置、数据库密码和 Bootstrap 管理员密码：只保存在服务器 `.env.local` 或受控交付材料中，不写入 Git 文档

## 账号原则

- 首次空库上线后，使用 Bootstrap 管理员登录。
- 正式账号在 `/dashboard/users` 中创建和维护。
- 登录账号类型只分教师账号和学生账号。
- 最高管理员能力由账号上的系统管理员能力控制，不是第三种登录账号类型。
- 教师自助申请账号必须绑定教师档案。
- 学生账号当前仅用于自助密码维护，不进入业务管理页面。
- 不再依赖 `admin / ChangeMe123!` 这类演示账号作为云端日常口径。

## 建议初始账号

由 Bootstrap 管理员进入 `/dashboard/users` 后，按学校实际人员创建：

| 账号类别 | 建议数量 | 数据范围 | 主要用途 |
| --- | ---: | --- | --- |
| 系统管理员 | 1 个以上，至少保证 1 个可用 | 全校 | 用户、权限、学校结构、数据管理、系统配置 |
| 校领导 | 按学校需要 | 全校 | 查看师生、检查、统计、申请记录 |
| 年级管理员 | 按年级配置 | 绑定年级 | 查看和维护本年级学生、检查与统计 |
| 教务工作人员 | 按岗位配置 | 全校或授权范围 | 教师和学生档案维护、导入、导出 |
| 政教工作人员 | 按岗位配置 | 检查数据 | 检查项目维护、检查录入、统计导出 |
| 后勤办公人员 | 按岗位配置 | 报修职责 | 处理日常报修申请 |
| 行政办公人员 | 按岗位配置 | 行政职责 | 处理学校行政打印等申请 |
| 一线教师 | 按真实教师档案创建或导入 | 本人 | 提交和查看本人申请 |

## 首次启用顺序

1. 打开 `http://124.222.136.121/login`。
2. 用 Bootstrap 管理员登录。
3. 进入 `/dashboard/users` 创建正式系统管理员。
4. 用正式系统管理员重新登录。
5. 创建校领导、年级管理员、教务、政教、后勤、行政等业务账号。
6. 进入 `/dashboard/structure` 建立年级、班级、部门、部门岗位和学科。
7. 进入 `/dashboard/people` 导入或录入真实教师、学生档案。
8. 进入 `/dashboard/approvals` 配置真实审批职责。
9. 修改或停用临时 Bootstrap 管理员策略。

## 页面使用说明

### `/dashboard`

登录后的总览页，用于进入七个业务模块。

### `/dashboard/users`

系统管理员使用。

- 新增账号
- 设置账号类型和权限能力
- 绑定教师档案或学生档案
- 给年级管理员绑定负责年级
- 重置密码
- 启用或停用账号

### `/dashboard/structure`

系统管理员使用。

- 维护年级、班级、部门和学科
- 维护每个部门下的岗位
- 新增最新一届并归档旧届别
- 滚动后同步教师档案里使用的年级部门名称

### `/dashboard/people`

师生档案管理。

- 教师和学生筛选
- 教师多部门、多岗位维护
- 教师和学生信息统计类目配置
- 下载导入模板
- 导入和导出
- 删除误录档案

已有检查记录关联的教师会阻止硬删除，优先停用或修正关联记录。

### `/dashboard/archive/students`

往届学生存档中心。

- 查询归档学生
- 编辑归档学生
- 导入或导出归档学生
- 保持归档学生不混入在校学生默认页面

### `/dashboard/inspection`

常规检查。

- 学生量化和教师量化分类管理
- 检查项目维护
- 检查记录录入、修改、删除误录
- 按日期、目标、年级、班级或教师筛选

### `/dashboard/approvals`

申请与审批。

- 系统管理员配置申请类型和审批职责
- 教师提交日常报修、材料打印和其他申请
- 审批人处理分配给自己的申请
- 打印申请必须填写材料类型、打印形式、纸张大小和打印数量
- 校领导不会天然获得全部审批权，除系统管理员外，账号必须匹配启用中的审批职责才能审批

### `/dashboard/exports`

检查统计与导出。

- 按学生量化或教师量化切换
- 按时间和目标范围筛选
- 查看汇总结果
- 导出 Excel 或 CSV

### `/dashboard/data-management`

系统管理员使用。

- 查看业务表数据量
- 查看审计日志
- 执行受保护的单条、批量或固定清理操作
- 删除前会先触发 PostgreSQL 备份，备份失败则取消删除

## 备份与恢复

日常部署会自动在更新前备份数据库。

手动备份：

```bash
cd /opt/xiaowuxitong/app
bash scripts/server/backup-postgres.sh
```

备份默认位置：

```text
/opt/xiaowuxitong/backups
```

恢复前建议先恢复到临时库核对数据量，再决定是否覆盖正式库。

## 常见问题

### 登录页打不开

让维护人员登录服务器检查：

```bash
sudo systemctl status xiaowuxitong
sudo systemctl status nginx
tail -n 100 /opt/xiaowuxitong/logs/app.err.log
```

### 登录页正常但业务页显示 server error

优先检查 PostgreSQL schema 是否落后于代码：

```bash
cd /opt/xiaowuxitong/app
npm run db:validate
npx prisma db push
sudo systemctl restart xiaowuxitong
npm run smoke:pages -- --base-url=http://127.0.0.1:3000
```

### 忘记正式管理员密码

使用服务器 `.env.local` 中受控保存的 Bootstrap 管理员登录，然后在 `/dashboard/users` 重置正式管理员密码。处理完后记录变更，并考虑收紧 Bootstrap 管理员使用方式。

## 管理建议

- 不要把服务器 SSH key、数据库密码或 Bootstrap 密码发给普通老师。
- 不要在云端正式库执行演示数据种子，除非明确是在重建空测试环境。
- 首批正式账号创建后，尽快修改临时密码。
- 每次发布以 `scripts/deploy-tencent-lighthouse.ps1` 为准，避免手工跳过备份或 schema 同步。
- 大批量导入真实数据前先手动备份。
