# 最终交付清单

本清单用于当前腾讯云部署正式交付或阶段验收前确认。

## 访问入口

- [ ] `http://124.222.136.121/login` 能打开。
- [ ] Nginx 正在监听公网 `80` 并代理到 `127.0.0.1:3000`。
- [ ] `xiaowuxitong.service` 正常运行。
- [ ] PostgreSQL 只在服务器本机使用，不开放公网 `5432`。

## 部署链路

- [ ] 本机代码已推送 GitHub。
- [ ] 已运行 `scripts/deploy-tencent-lighthouse.ps1`。
- [ ] 部署日志显示已完成更新前 PostgreSQL 备份。
- [ ] 部署日志显示 `git pull --ff-only` 成功。
- [ ] 部署日志显示 Prisma schema 已校验并同步。
- [ ] 部署日志显示生产构建成功。
- [ ] 部署日志显示 `xiaowuxitong.service` 已重启。
- [ ] 部署日志显示 `npm run smoke:pages` 通过。

## 数据状态

- [ ] 云端 PostgreSQL 当前不含旧演示测试数据。
- [ ] 正式数据导入前已确认备份位置：`/opt/xiaowuxitong/backups`。
- [ ] 服务器 `.env.local` 已安全保存，不提交 Git。
- [ ] Bootstrap 管理员、数据库密码、`NEXTAUTH_SECRET` 已记录在受控位置。

## 首次账号

- [ ] Bootstrap 管理员可登录。
- [ ] 已创建正式系统管理员。
- [ ] 已创建所需校领导、年级管理员、教务、政教、后勤、行政和教师账号。
- [ ] 教师自助账号已绑定教师档案。
- [ ] 年级管理员已绑定负责年级。
- [ ] 不再使用演示默认密码作为正式口径。

## 业务验收

- [ ] `/dashboard/users` 可维护账号、角色、绑定关系和密码。
- [ ] `/dashboard/structure` 可维护年级、班级、部门、部门岗位和学科。
- [ ] `/dashboard/people` 可维护教师和学生档案，支持模板、导入、导出。
- [ ] `/dashboard/archive/students` 可维护往届学生。
- [ ] `/dashboard/inspection` 可录入、查询、修改和删除误录检查记录。
- [ ] `/dashboard/approvals` 可配置申请类型、审批职责，并完成教师提交和审批处理。
- [ ] `/dashboard/exports` 可导出检查统计 Excel/CSV。
- [ ] `/dashboard/data-management` 可显示数据量、审计日志和备份保护提示。

## 权限验收

- [ ] 系统管理员能进入全部管理页面。
- [ ] 校领导不能进入系统管理员专用配置页，除非被授予相应能力。
- [ ] 年级管理员只能访问绑定年级的数据范围。
- [ ] 无匹配审批职责的账号不能审批申请。
- [ ] 学生账号只能进入自助密码维护范围。

## 故障预案

- [ ] 维护人员知道如何查看服务状态：

```bash
sudo systemctl status xiaowuxitong
sudo systemctl status nginx
sudo systemctl status postgresql
```

- [ ] 维护人员知道如何查看日志：

```bash
tail -n 100 /opt/xiaowuxitong/logs/app.err.log
```

- [ ] 维护人员知道业务页 server error 时先检查 schema drift：

```bash
cd /opt/xiaowuxitong/app
npx prisma db push
sudo systemctl restart xiaowuxitong
npm run smoke:pages -- --base-url=http://127.0.0.1:3000
```

## 安全提醒

- [ ] 不把数据库账号、SSH key、Bootstrap 密码发给普通老师。
- [ ] 不在正式云端库执行演示数据种子。
- [ ] 大批量导入真实数据前先手动备份。
- [ ] 每次发布使用部署脚本，不手工跳过备份、schema 同步或 smoke。
