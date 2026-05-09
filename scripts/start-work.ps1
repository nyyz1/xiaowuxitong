param(
  [switch]$SkipInstall
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

$status = & $git status --porcelain
if ($status) {
  Write-Host "Local changes exist. Save or discard them before syncing:"
  & $git status --short
  throw "Run save-work.cmd before start-work.cmd on another computer."
}

$branch = (& $git branch --show-current)
if (-not $branch) {
  throw "Could not determine the current Git branch."
}

Write-Host "Fetching latest code from GitHub ..."
& $git fetch origin
if ($LASTEXITCODE -ne 0) {
  throw "git fetch failed."
}

Write-Host "Updating $branch with a fast-forward pull ..."
& $git pull --ff-only
if ($LASTEXITCODE -ne 0) {
  throw "git pull failed. Check whether this branch has diverged."
}

if (-not $SkipInstall -and -not (Test-Path "node_modules")) {
  Write-Host "node_modules is missing; installing dependencies ..."
  & $npm install
  if ($LASTEXITCODE -ne 0) {
    throw "npm install failed."
  }
}

if (-not (Test-Path ".env.local")) {
  if (Test-Path ".env.example") {
    Copy-Item ".env.example" ".env.local"
    Write-Host "Created .env.local from .env.example. Edit it before running the full app against PostgreSQL."
  } else {
    throw ".env.local is missing and .env.example was not found."
  }
}

Write-Host "Refreshing generated Prisma client ..."
& $npm run db:generate
if ($LASTEXITCODE -ne 0) {
  throw "Prisma client generation failed."
}

$codexPrompt = @"
Read everything in /memory-bank first.
Identify the current implementation-plan step before making changes.
Restate the task, constraints, and verification plan in concise bullets.
Only execute the current step or sub-step.
Do not touch unrelated files.
After completing the change, update progress.md and architecture.md.
"@

try {
  Set-Clipboard -Value $codexPrompt
  Write-Host "Copied the standard Codex startup prompt to the clipboard."
} catch {
  Write-Host "Could not copy the Codex prompt to the clipboard."
}

Write-Host ""
Write-Host "Ready for Codex work on branch $branch."
Write-Host "Paste the startup prompt into Codex, then describe the specific task."
