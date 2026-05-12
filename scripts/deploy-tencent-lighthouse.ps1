param(
  [string]$HostName = "124.222.136.121",
  [string]$User = "ubuntu",
  [string]$KeyPath = "$env:USERPROFILE\Downloads\nyyzxwxt.pem",
  [string]$AppRoot = "/opt/xiaowuxitong/app",
  [switch]$AllowAcceptDataLoss
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $KeyPath)) {
  throw "SSH private key was not found: $KeyPath"
}

$remote = "$User@$HostName"
$allowFlag = if ($AllowAcceptDataLoss) { "ALLOW_ACCEPT_DATA_LOSS=1 " } else { "" }
$remoteCommand = "cd '$AppRoot' && ${allowFlag}bash scripts/server/deploy.sh"

Write-Host "Deploying XiaoWu system on $remote" -ForegroundColor Green
Write-Host "Remote command: $remoteCommand"

ssh -i $KeyPath -o IdentitiesOnly=yes -o ServerAliveInterval=30 $remote $remoteCommand
