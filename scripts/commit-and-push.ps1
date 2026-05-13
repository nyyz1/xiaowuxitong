param(
  [string]$Message = "",
  [switch]$SkipVerify,
  [switch]$SkipBuild
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
    if (Test-Path $candidate) {
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

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

$git = Find-Tool -Name "git.exe" -Fallbacks @(
  "C:\Program Files\Git\cmd\git.exe",
  "$env:LOCALAPPDATA\Programs\Git\cmd\git.exe"
)
$npm = Find-Tool -Name "npm.cmd" -Fallbacks @("C:\Program Files\nodejs\npm.cmd")

$insideWorkTree = ((& $git rev-parse --is-inside-work-tree) -eq "true")
if (-not $insideWorkTree) {
  throw "This folder is not a Git repository."
}

$branch = (& $git branch --show-current)
if (-not $branch) {
  throw "Could not determine the current Git branch."
}

$status = & $git status --porcelain
if (-not $status) {
  Write-Host "No local changes to commit or push."
  exit 0
}

if (-not $SkipVerify) {
  Invoke-Checked -Label "typecheck" -Command { & $npm run typecheck }
  Invoke-Checked -Label "lint" -Command { & $npm run lint }

  if (-not $SkipBuild) {
    Invoke-Checked -Label "build" -Command { & $npm run build }
  }
}

if (-not $Message) {
  $Message = Read-Host "Commit message"
}

if (-not $Message.Trim()) {
  throw "Commit message is required."
}

Invoke-Checked -Label "stage changes" -Command { & $git add -A }

$staged = & $git diff --cached --name-only
if (-not $staged) {
  Write-Host "No staged changes after git add."
  exit 0
}

Invoke-Checked -Label "commit" -Command { & $git commit -m $Message }
Invoke-Checked -Label "fetch origin" -Command { & $git fetch origin }

$upstream = (& $git rev-parse --abbrev-ref --symbolic-full-name "@{u}" 2>$null)
if ($upstream) {
  Invoke-Checked -Label "rebase latest remote branch" -Command { & $git pull --rebase }
  Invoke-Checked -Label "push" -Command { & $git push }
} else {
  Invoke-Checked -Label "push branch" -Command { & $git push -u origin $branch }
}

Write-Host ""
Write-Host "Committed and pushed branch $branch." -ForegroundColor Green
Write-Host "Next deployment command:"
Write-Host "  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\deploy-tencent-lighthouse.ps1"
