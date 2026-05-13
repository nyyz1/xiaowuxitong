# 文档导航

按使用场景阅读即可，不需要一次看完全部文档。

## 当前主线

- `tencent-lighthouse-deployment.md`
  - 腾讯云轻量应用服务器的首次部署、目录结构、Nginx/systemd/PostgreSQL 口径，以及一键更新流程。

- `deployment-and-smoke-test.md`
  - 日常通过 `publish-and-deploy.cmd` 从本机发布到 GitHub 和腾讯云、自动备份、schema 同步、构建、重启、烟测和三端 commit 校验的操作手册。

- `pilot-accounts-and-usage-guide.md`
  - 云端空库上线后的账号创建、师生档案自动账号规则、角色使用、页面操作、备份恢复和常见问题说明。

- `final-delivery-checklist.md`
  - 交付前最终检查单，适合正式启用或阶段验收前逐项确认。

## 安全与运维

- `security-and-deployment-plan.md`
  - 当前云端私有部署、PostgreSQL 边界、账号权限、备份和上线前检查原则。

- `postgresql-install-and-acceptance-runbook.md`
  - PostgreSQL 运维与验收手册。当前主要用于理解云端数据库检查、备份、恢复和 schema drift 排查。

## 后续规划与汇报

- `product-roadmap-v1-5-v2.md`
  - V1 之后的 V1.5 / V2 / 暂缓功能路线图，用于范围讨论，不等同于已批准开发范围。

- `v1-5-executable-plan.md`
  - V1.5 近期冲刺建议，重点覆盖数据质量、导入预检、常用导出模板和学生一页通。

- `roadmap-leadership-brief-v1-5-v2.pptx`
  - 面向学校领导决策汇报的可编辑 PPTX。

## 开发协作

- `codex-multi-workstation.md`
  - 多台电脑之间继续用 Codex 开发时的同步、启动和保存流程。

## 使用原则

- 当前正式运行环境以腾讯云 `124.222.136.121` 为准。
- 当前数据库以腾讯云服务器本机 PostgreSQL 为准。
- 当前云端数据库不保留旧演示测试数据。
- 服务器 `.env.local`、数据库密码和 Bootstrap 管理员密码不写入 Git 文档。
- 如果旧提交或历史记录中出现 Windows 工作站、`D:\PostgreSQL`、`119.45.252.190:62000`、`start-school-pilot.cmd` 等口径，先按历史资料处理，不要当作当前主线。
