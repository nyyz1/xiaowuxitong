param(
  [int]$LocalPort = 3000,
  [string]$TunnelWindowTitle = "XiaoWu Public Tunnel"
)

$ErrorActionPreference = "Stop"

function Stop-ProcessesByPort {
  param([int]$Port)

  $netstatOutput = netstat -ano -p tcp | Select-String ":$Port"
  $pids = @()

  foreach ($line in $netstatOutput) {
    $parts = ($line.ToString() -split '\s+') | Where-Object { $_ }

    if ($parts.Count -ge 5) {
      $pid = $parts[-1]

      if ($pid -match '^\d+$') {
        $pids += [int]$pid
      }
    }
  }

  $pids = $pids | Select-Object -Unique

  foreach ($pid in $pids) {
    try {
      Stop-Process -Id $pid -Force -ErrorAction Stop
    } catch {
      Write-Host "Could not stop PID $pid on port $Port: $($_.Exception.Message)" -ForegroundColor Yellow
    }
  }
}

function Stop-TunnelWindows {
  $plinkProcesses = @(Get-Process -Name plink -ErrorAction SilentlyContinue)

  foreach ($process in $plinkProcesses) {
    try {
      if ($process.MainWindowTitle -eq $TunnelWindowTitle -or -not [string]::IsNullOrWhiteSpace($process.MainWindowTitle)) {
        Stop-Process -Id $process.Id -Force -ErrorAction Stop
      }
    } catch {
      Write-Host "Could not stop tunnel process $($process.Id): $($_.Exception.Message)" -ForegroundColor Yellow
    }
  }
}

Write-Host "Stopping XiaoWu public pilot..." -ForegroundColor Cyan
Stop-TunnelWindows
Stop-ProcessesByPort -Port $LocalPort
Write-Host "Done." -ForegroundColor Green
