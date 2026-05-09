param(
  [string]$GitUserName = "",
  [string]$GitUserEmail = "",
  [switch]$SkipInstall,
  [switch]$SkipNpmInstall
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

  return $null
}

function Ensure-WingetTool {
  param(
    [string]$Name,
    [string]$PackageId,
    [string[]]$Fallbacks = @()
  )

  $tool = Find-Tool -Name $Name -Fallbacks $Fallbacks
  if ($tool) {
    return $tool
  }

  if ($SkipInstall) {
    throw "$Name was not found. Install $PackageId first, or rerun without -SkipInstall."
  }

  $winget = Find-Tool -Name "winget.exe"
  if (-not $winget) {
    throw "$Name was not found, and winget is not available for automatic install."
  }

  Write-Host "Installing $PackageId ..."
  & $winget install --id $PackageId -e --source winget
  if ($LASTEXITCODE -ne 0) {
    throw "winget failed to install $PackageId."
  }

  $tool = Find-Tool -Name $Name -Fallbacks $Fallbacks
  if (-not $tool) {
    throw "$Name still was not found after installing $PackageId. Open a new terminal and rerun this script."
  }

  return $tool
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

$git = Ensure-WingetTool `
  -Name "git.exe" `
  -PackageId "Git.Git" `
  -Fallbacks @("C:\Program Files\Git\cmd\git.exe", "$env:LOCALAPPDATA\Programs\Git\cmd\git.exe")

$node = Ensure-WingetTool `
  -Name "node.exe" `
  -PackageId "OpenJS.NodeJS.LTS" `
  -Fallbacks @("C:\Program Files\nodejs\node.exe")

$npm = Find-Tool -Name "npm.cmd" -Fallbacks @("C:\Program Files\nodejs\npm.cmd")
if (-not $npm) {
  throw "npm.cmd was not found after Node.js check."
}

& $git config --global --add safe.directory ($repoRoot.Path -replace "\\", "/")

$insideWorkTree = $false
try {
  $insideWorkTree = ((& $git rev-parse --is-inside-work-tree) -eq "true")
} catch {
  $insideWorkTree = $false
}

if (-not $insideWorkTree) {
  throw "This folder is not a Git clone. Clone https://github.com/nyyz1/xiaowuxitong.git first, then rerun setup-dev-workstation.cmd."
}

$origin = (& $git remote get-url origin 2>$null)
if (-not $origin) {
  & $git remote add origin "https://github.com/nyyz1/xiaowuxitong.git"
} elseif ($origin -ne "https://github.com/nyyz1/xiaowuxitong.git") {
  Write-Host "Remote origin is currently: $origin"
  Write-Host "Keeping the existing remote. Change it manually if this is not intentional."
}

$localName = (& $git config user.name 2>$null)
if (-not $localName) {
  if (-not $GitUserName) {
    $GitUserName = Read-Host "Git commit name for this computer"
  }
  if ($GitUserName) {
    & $git config user.name $GitUserName
  }
}

$localEmail = (& $git config user.email 2>$null)
if (-not $localEmail) {
  if (-not $GitUserEmail) {
    $GitUserEmail = Read-Host "Git commit email for this computer"
  }
  if ($GitUserEmail) {
    & $git config user.email $GitUserEmail
  }
}

if (-not (Test-Path ".env.local") -and (Test-Path ".env.example")) {
  Copy-Item ".env.example" ".env.local"
  Write-Host "Created .env.local from .env.example. Edit it before running the full app against PostgreSQL."
}

if (-not $SkipNpmInstall) {
  if (-not (Test-Path "node_modules")) {
    Write-Host "Installing npm dependencies ..."
    & $npm install
    if ($LASTEXITCODE -ne 0) {
      throw "npm install failed."
    }
  } else {
    Write-Host "node_modules already exists; skipping npm install."
  }
}

Write-Host "Generating Prisma client ..."
& $npm run db:generate
if ($LASTEXITCODE -ne 0) {
  throw "Prisma client generation failed."
}

Write-Host ""
Write-Host "Development workstation is ready."
Write-Host "Use start-work.cmd before Codex work, and save-work.cmd before leaving this computer."
