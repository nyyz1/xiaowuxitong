param(
  [int]$LocalPort = 3000,
  [int]$RemotePort = 62000,
  [string]$ServerHost = "119.45.252.190",
  [string]$ServerUser = "root",
  [string]$PublicBaseUrl = "http://119.45.252.190:62000",
  [string]$ServerHostKeyFingerprint = "SHA256:CKuydr6nEKrmMqwLxVRvcvmvcqndi31y8O8MmphO2MA",
  [string]$ServerPassword = "Zmg526~~",
  [string]$PlinkDownloadUrl = "https://the.earth.li/~sgtatham/putty/latest/w64/plink.exe",
  [switch]$NoInstall,
  [switch]$SkipBuild,
  [switch]$PrepareToolsOnly
)

$ErrorActionPreference = "Stop"
$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$appLauncher = Join-Path $PSScriptRoot "start-school-pilot.ps1"
$publicTunnelCmd = Join-Path $projectRoot "start-public-tunnel.cmd"
$publicTunnelWindowTitle = "XiaoWu Public Tunnel"

function Write-Step {
  param([string]$Message)

  Write-Host ""
  Write-Host "== $Message ==" -ForegroundColor Cyan
}

function Find-Plink {
  $artifactPlink = Join-Path $projectRoot "artifacts\plink.exe"

  if (Test-Path $artifactPlink) {
    return $artifactPlink
  }

  $command = Get-Command plink.exe -ErrorAction SilentlyContinue

  if ($command) {
    return $command.Source
  }

  $artifactDir = Split-Path -Parent $artifactPlink

  if (-not (Test-Path $artifactDir)) {
    New-Item -ItemType Directory -Force -Path $artifactDir | Out-Null
  }

  Write-Host "plink.exe was not found. Downloading PuTTY plink to artifacts\\plink.exe ..."

  try {
    Invoke-WebRequest -UseBasicParsing -Uri $PlinkDownloadUrl -OutFile $artifactPlink
    Unblock-File -LiteralPath $artifactPlink -ErrorAction SilentlyContinue
  } catch {
    if (Test-Path $artifactPlink) {
      Remove-Item -LiteralPath $artifactPlink -Force
    }

    throw "plink.exe was not found and automatic download failed. Download $PlinkDownloadUrl to artifacts\\plink.exe, then run this launcher again. Reason: $($_.Exception.Message)"
  }

  if (-not (Test-Path $artifactPlink)) {
    throw "plink.exe download did not create artifacts\\plink.exe."
  }

  return $artifactPlink
}

function Ensure-PublicTunnelLauncher {
  param(
    [string]$PlinkExe
  )

  $escapedPlink = $PlinkExe.Replace('"', '""')
  $escapedHostKey = $ServerHostKeyFingerprint.Replace('"', '""')
  $escapedPassword = $ServerPassword.Replace('"', '""')

  $content = @(
    "@echo off"
    "title $publicTunnelWindowTitle"
    "echo XiaoWu public tunnel"
    "echo Public URL: $PublicBaseUrl/login"
    "echo Keep this window open while public access is needed."
    "echo."
    """$escapedPlink"" -ssh -v -no-antispoof -hostkey ""$escapedHostKey"" -pw ""$escapedPassword"" -N -R `"$RemotePort`:127.0.0.1:$LocalPort`" $ServerUser@$ServerHost"
  )

  $content | Set-Content -LiteralPath $publicTunnelCmd -Encoding ASCII
}

function Get-ExistingPublicTunnelProcess {
  $plinkProcesses = @(
    Get-Process -Name plink -ErrorAction SilentlyContinue
  )

  if ($plinkProcesses.Count -eq 0) {
    return $null
  }

  foreach ($process in $plinkProcesses) {
    try {
      if ($process.MainWindowTitle -eq $publicTunnelWindowTitle) {
        return $process
      }
    } catch {
      continue
    }
  }

  return $plinkProcesses | Select-Object -First 1
}

Set-Location $projectRoot

$plinkExe = Find-Plink
Ensure-PublicTunnelLauncher -PlinkExe $plinkExe

if ($PrepareToolsOnly) {
  Write-Host "Public tunnel tools are ready." -ForegroundColor Green
  Write-Host "plink.exe: $plinkExe"
  Write-Host "Tunnel launcher: $publicTunnelCmd"
  exit 0
}

Write-Host "School affairs public launcher" -ForegroundColor Green
Write-Host "Project path: $projectRoot"
Write-Host "Public login URL: $PublicBaseUrl/login"
Write-Host "Local login URL: http://127.0.0.1:$LocalPort/login"

Write-Step "Preparing local school pilot"

$pilotArgs = @(
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-File", $appLauncher,
  "-Port", "$LocalPort",
  "-ExternalBaseUrl", $PublicBaseUrl,
  "-CheckOnly"
)

if ($NoInstall) {
  $pilotArgs += "-NoInstall"
}

if ($SkipBuild) {
  $pilotArgs += "-SkipBuild"
}

& powershell.exe @pilotArgs

if ($LASTEXITCODE -ne 0) {
  throw "Local pilot preparation failed."
}

Write-Step "Ensuring public tunnel window"

$existingTunnel = Get-ExistingPublicTunnelProcess

if ($null -eq $existingTunnel) {
  Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "start `"$publicTunnelWindowTitle`" `"$publicTunnelCmd`""
  Start-Sleep -Seconds 2
  $existingTunnel = Get-ExistingPublicTunnelProcess
}

if ($null -eq $existingTunnel) {
  throw "The public tunnel window did not start successfully."
}

Write-Host "Public tunnel window is running. Title: $publicTunnelWindowTitle"
Write-Host "Keep that tunnel window open while public access is needed."

Write-Step "Starting local app"

$localAppCommand = @(
  "cd /d `"$projectRoot`"",
  "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$appLauncher`" -Port $LocalPort -ExternalBaseUrl `"$PublicBaseUrl`""
)

if ($NoInstall) {
  $localAppCommand += "-NoInstall"
}

if ($SkipBuild) {
  $localAppCommand += "-SkipBuild"
}

Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "start `"XiaoWu Local App`" cmd /k `"$($localAppCommand -join " && ")`""

Write-Host ""
Write-Host "One-click launch started." -ForegroundColor Green
Write-Host "Local:  http://127.0.0.1:$LocalPort/login"
Write-Host "Public: $PublicBaseUrl/login"
