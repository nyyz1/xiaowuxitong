# 多电脑 Codex 开发一键流程

这套流程适合一个人在不同工作地点继续同一个项目。GitHub 负责同步代码，每台电脑保留自己的 `.env.local`、数据库、依赖、日志和构建产物。

## 新电脑第一次

1. 先克隆仓库：

```powershell
git clone https://github.com/nyyz1/xiaowuxitong.git
cd xiaowuxitong
```

2. 双击根目录的：

```text
setup-dev-workstation.cmd
```

这个脚本会检查 Git、Node.js、npm，必要时通过 `winget` 安装；然后安装依赖、准备 `.env.local`、生成 Prisma Client，并设置当前目录为 Git 安全目录。

如果这台电脑用的是另一个 GitHub 账号，需要先在 GitHub 仓库里把那个账号加为协作者。

## 每次开始工作

到某台电脑准备让 Codex 开发前，双击：

```text
start-work.cmd
```

它会：

- 确认本地没有未保存改动
- 从 GitHub 拉取最新代码
- 缺少依赖时安装依赖
- 重新生成 Prisma Client
- 把 Codex 固定开场提示复制到剪贴板

然后打开 Codex，把剪贴板里的提示粘进去，再补充本次具体任务。

## 每次离开前

开发完成或准备换电脑前，双击：

```text
save-work.cmd
```

它会：

- 运行 `typecheck`
- 运行 `lint`
- 询问提交说明
- 自动 `git add -A`
- 自动提交
- 自动拉取远程最新提交并 rebase
- 自动推送当前分支到 GitHub

也可以在命令行直接调用 PowerShell 脚本并带提交说明：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\save-work.ps1 -Message "Add quick inspection entry polish"
```

临时跳过检查：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\save-work.ps1 -Message "WIP save before moving computer" -SkipVerify
```

## 习惯规则

- 开始前运行 `start-work.cmd`。
- 离开前运行 `save-work.cmd`。
- 不要在两台电脑同时修改同一个分支。
- `.env.local` 和数据库数据不通过 Git 同步。
- 如果要同步真实数据库，使用数据库备份和恢复，不要把数据库文件提交到仓库。
