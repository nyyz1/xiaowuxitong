param(
  [string]$Message = "",
  [switch]$SkipVerify
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

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

$git = Find-Tool -Name "git.exe" -Fallbacks @("C:\Program Files\Git\cmd\git.exe", "$env:LOCALAPPDATA\Programs\Git\cmd\git.exe")
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
  Write-Host "No local changes to save."
  exit 0
}

if (-not $SkipVerify) {
  Write-Host "Running typecheck ..."
  & $npm run typecheck
  if ($LASTEXITCODE -ne 0) {
    throw "typecheck failed. Fix it, then run save-work.cmd again."
  }

  Write-Host "Running lint ..."
  & $npm run lint
  if ($LASTEXITCODE -ne 0) {
    throw "lint failed. Fix it, then run save-work.cmd again."
  }
}

if (-not $Message) {
  $Message = Read-Host "Commit message"
}

if (-not $Message) {
  throw "Commit message is required."
}

Write-Host "Staging local changes ..."
& $git add -A
if ($LASTEXITCODE -ne 0) {
  throw "git add failed."
}

$staged = & $git diff --cached --name-only
if (-not $staged) {
  Write-Host "No staged changes after git add."
  exit 0
}

Write-Host "Creating commit ..."
& $git commit -m $Message
if ($LASTEXITCODE -ne 0) {
  throw "git commit failed."
}

Write-Host "Rebasing on latest remote branch before push ..."
& $git fetch origin
if ($LASTEXITCODE -ne 0) {
  throw "git fetch failed."
}

$upstream = (& $git rev-parse --abbrev-ref --symbolic-full-name "@{u}" 2>$null)
if ($upstream) {
  & $git pull --rebase
  if ($LASTEXITCODE -ne 0) {
    throw "git pull --rebase failed. Resolve conflicts, then run save-work.cmd again."
  }

  & $git push
} else {
  & $git push -u origin $branch
}

if ($LASTEXITCODE -ne 0) {
  throw "git push failed. Check GitHub login or network access."
}

Write-Host ""
Write-Host "Saved and pushed branch $branch."
