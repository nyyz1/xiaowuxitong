param(
  [string]$Message = "",
  [switch]$SkipVerify,
  [switch]$SkipBuild,
  [string]$HostName = "124.222.136.121",
  [string]$User = "ubuntu",
  [string]$KeyPath = "$env:USERPROFILE\Downloads\nyyzxwxt.pem",
  [string]$AppRoot = "/opt/xiaowuxitong/app"
)

$ErrorActionPreference = "Stop"

function Find-Tool {
  param(
    [string]$Name,
    [string[]]$Fallbacks = @()
  )

  $command = Get-Command $Name -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  foreach ($candidate in $Fallbacks) {
    if (Test-Path -LiteralPath $candidate) {
      return $candidate
    }
  }

  throw "$Name was not found. Run setup-dev-workstation.cmd first."
}

function Invoke-Checked {
  param(
    [string]$Label,
    [scriptblock]$Command
  )

  Write-Host ""
  Write-Host "== $Label ==" -ForegroundColor Cyan
  & $Command

  if ($LASTEXITCODE -ne 0) {
    throw "$Label failed."
  }
}

function Invoke-CheckedText {
  param(
    [string]$Label,
    [scriptblock]$Command
  )

  Write-Host ""
  Write-Host "== $Label ==" -ForegroundColor Cyan
  $output = & $Command

  if ($LASTEXITCODE -ne 0) {
    throw "$Label failed."
  }

  return ($output | Select-Object -Last 1)
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

$git = Find-Tool -Name "git.exe" -Fallbacks @(
  "C:\Program Files\Git\cmd\git.exe",
  "$env:LOCALAPPDATA\Programs\Git\cmd\git.exe"
)
$npm = Find-Tool -Name "npm.cmd" -Fallbacks @("C:\Program Files\nodejs\npm.cmd")

if (-not (Test-Path -LiteralPath $KeyPath)) {
  throw "SSH private key was not found: $KeyPath"
}

$insideWorkTree = ((& $git rev-parse --is-inside-work-tree) -eq "true")
if (-not $insideWorkTree) {
  throw "This folder is not a Git repository."
}

$branch = (& $git branch --show-current)
if (-not $branch) {
  throw "Could not determine the current Git branch."
}

if ($branch -ne "main") {
  throw "publish-and-deploy.cmd is intended for main. Current branch: $branch"
}

if (-not $SkipVerify) {
  Invoke-Checked -Label "db:validate" -Command { & $npm run db:validate }
  Invoke-Checked -Label "typecheck" -Command { & $npm run typecheck }
  Invoke-Checked -Label "lint" -Command { & $npm run lint }

  if (-not $SkipBuild) {
    Invoke-Checked -Label "build" -Command { & $npm run build }
  }
}

$status = & $git status --porcelain
if ($status) {
  if (-not $Message) {
    $Message = Read-Host "Commit message"
  }

  if (-not $Message.Trim()) {
    throw "Commit message is required when local changes exist."
  }

  Invoke-Checked -Label "stage changes" -Command { & $git add -A }

  $staged = & $git diff --cached --name-only
  if ($staged) {
    Invoke-Checked -Label "commit" -Command { & $git commit -m $Message }
  } else {
    Write-Host "No staged changes after git add."
  }
} else {
  Write-Host "No local changes to commit."
}

Invoke-Checked -Label "fetch origin" -Command { & $git fetch origin }

$upstream = (& $git rev-parse --abbrev-ref --symbolic-full-name "@{u}" 2>$null)
if ($upstream) {
  Invoke-Checked -Label "rebase latest remote branch" -Command { & $git pull --rebase }
  Invoke-Checked -Label "push" -Command { & $git push }
} else {
  Invoke-Checked -Label "push branch" -Command { & $git push -u origin $branch }
}

$localHead = Invoke-CheckedText -Label "local HEAD" -Command { & $git rev-parse HEAD }
$originHead = Invoke-CheckedText -Label "origin/main HEAD" -Command { & $git rev-parse origin/main }

if ($localHead -ne $originHead) {
  throw "Local HEAD and origin/main are not aligned after push. Local=$localHead Origin=$originHead"
}

$remote = "$User@$HostName"
$remoteCommand = "cd '$AppRoot' && bash scripts/server/deploy.sh"

Invoke-Checked -Label "deploy on Tencent Cloud" -Command {
  ssh -i $KeyPath -o IdentitiesOnly=yes -o ServerAliveInterval=30 $remote $remoteCommand
}

$serverHead = Invoke-CheckedText -Label "server HEAD" -Command {
  ssh -i $KeyPath -o IdentitiesOnly=yes $remote "git -C '$AppRoot' rev-parse HEAD"
}

if ($localHead -ne $serverHead) {
  throw "Server HEAD does not match local/GitHub after deploy. Local=$localHead Server=$serverHead"
}

Write-Host ""
Write-Host "Publish and deploy completed successfully." -ForegroundColor Green
Write-Host "Commit: $localHead"
Write-Host "Local, GitHub origin/main, and server are aligned."
