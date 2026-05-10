# 文档导航

按使用场景阅读即可，不需要一次看完全部文档。

## 日常试点使用

- `pilot-accounts-and-usage-guide.md`
  - 当前 live 试点环境的账号、密码、角色范围、登录入口、启动方式、导入导出和基础运维说明。
  - 涉及“当前这台试点电脑到底怎么登录、数据库密码是什么、今天该用哪个地址”的问题，先看这份。

- `final-delivery-checklist.md`
  - 交付前的最终检查单，适合做验收或正式切换前的逐项确认。

## 部署与验收

- `deployment-and-smoke-test.md`
  - 应用部署、schema 同步、演示数据、站点启动、LAN 或公网访问、以及交付烟测步骤。

- `postgresql-install-and-acceptance-runbook.md`
  - PostgreSQL 安装、应用库准备、连接校验、常见故障排查。

- `school-server-pilot-checklist.md`
  - 面向学校领导、网管、试点老师的部署前清单，用于确认资源、权限和网络条件。

- `security-and-deployment-plan.md`
  - 解释为什么当前方案采用私有部署、数据库本机化和权限边界控制。

- `approval-brief.md`
  - 需要重新做校内汇报或审批时可直接使用的简版说明。

## 后续规划与汇报

- `product-roadmap-v1-5-v2.md`
  - V1 试点后的 V1.5 / V2 / 暂缓功能路线图，用于指导后续范围讨论，不等同于已经批准的产品范围。

- `v1-5-executable-plan.md`
  - 当前可执行的 V1.5 两周冲刺建议，重点覆盖数据质量、导入预检、常用导出模板和学生一页通。

- `roadmap-leadership-brief-v1-5-v2.pptx`
  - 面向学校领导决策汇报的可编辑 PPTX，概括当前成果、成熟系统对标、后续路线和近期建议。

## 迁移与协作

- `school-transfer-one-click.md`
  - 只搬项目、不搬当前数据库数据时的学校电脑迁移流程。

- `codex-multi-workstation.md`
  - 多台电脑之间继续用 Codex 开发时的同步、启动和保存流程。

## 使用原则

- 当前 live 试点环境的密码、当前正确访问地址、当前数据库运维口径，以 `pilot-accounts-and-usage-guide.md` 为准。
- 其他文档里的数据库连接串如果是 `school_password` 一类默认值，应视为脚本默认示例，不代表当前 live 现场密码。
- 如果某份文档描述的工作站路径和当前机器不一致，先核对 PostgreSQL 实际服务名、安装路径、数据路径，再继续按文档操作。
