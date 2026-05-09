param(
  [int]$Port = 3000,
  [string]$PublicHost = "",
  [string]$ExternalBaseUrl = "",
  [switch]$NoInstall,
  [switch]$SkipBuild,
  [switch]$CheckOnly,
  [string]$LogFile = ""
)

$ErrorActionPreference = "Stop"
$script:transcriptStarted = $false
$script:startupMutex = $null
$script:startupMutexAcquired = $false
$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$envFile = Join-Path $projectRoot ".env.local"
$currentUrlFile = Join-Path $projectRoot "logs\current-school-pilot-url.txt"
$defaultDatabaseUrl = "postgresql://school_admin:school_password@localhost:5432/school_affairs?schema=public"
$usedFallbackLocalhost = $false

function Release-StartupMutex {
  if ($script:startupMutexAcquired -and $script:startupMutex) {
    try {
      $script:startupMutex.ReleaseMutex()
    } catch {
      Write-Host "Startup lock release failed: $($_.Exception.Message)" -ForegroundColor Yellow
    }

    $script:startupMutexAcquired = $false
  }

  if ($script:startupMutex) {
    $script:startupMutex.Dispose()
    $script:startupMutex = $null
  }
}

$script:startupMutex = New-Object System.Threading.Mutex($false, "xiaowuxitong-school-pilot-startup")
$script:startupMutexAcquired = $script:startupMutex.WaitOne([TimeSpan]::FromSeconds(30))

if (-not $script:startupMutexAcquired) {
  Write-Host "Another school pilot startup is already in progress. Please wait a moment and open the login URL again." -ForegroundColor Yellow
  Release-StartupMutex
  exit 0
}

if ($LogFile) {
  $logDir = Split-Path -Parent $LogFile

  if ($logDir -and -not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Force -Path $logDir | Out-Null
  }

  try {
    Start-Transcript -Path $LogFile -Append -Force | Out-Null
    $script:transcriptStarted = $true
  } catch {
    Write-Host "Log transcript failed, but startup will continue. Reason: $($_.Exception.Message)" -ForegroundColor Yellow
  }
}

trap {
  Write-Host ""
  Write-Host "School pilot startup failed:" -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red

  if ($LogFile) {
    Write-Host "Log file: $LogFile" -ForegroundColor Yellow
  }

  if ($script:transcriptStarted) {
    Stop-Transcript | Out-Null
  }

  Release-StartupMutex

  exit 1
}

function Write-Step {
  param([string]$Message)

  Write-Host ""
  Write-Host "== $Message ==" -ForegroundColor Cyan
}

function Find-Npm {
  $programFilesNpm = Join-Path $env:ProgramFiles "nodejs\npm.cmd"

  if (Test-Path $programFilesNpm) {
    return $programFilesNpm
  }

  $command = Get-Command npm.cmd -ErrorAction SilentlyContinue

  if ($command) {
    return $command.Source
  }

  throw "npm.cmd was not found. Please install Node.js LTS, then run the pilot launcher again."
}

function Test-LocalPortListening {
  param([int]$Port)

  $client = New-Object System.Net.Sockets.TcpClient

  try {
    $task = $client.ConnectAsync("127.0.0.1", $Port)

    if (-not $task.Wait(1000)) {
      return $false
    }

    return $client.Connected
  } catch {
    return $false
  } finally {
    $client.Dispose()
  }
}

function Test-PrivateIpv4 {
  param([string]$IpAddress)

  if ([string]::IsNullOrWhiteSpace($IpAddress)) {
    return $false
  }

  $parsedAddress = $null

  if (-not [System.Net.IPAddress]::TryParse($IpAddress, [ref]$parsedAddress)) {
    return $false
  }

  if ($parsedAddress.AddressFamily -ne [System.Net.Sockets.AddressFamily]::InterNetwork) {
    return $false
  }

  if (
    $IpAddress -like "127.*" -or
    $IpAddress -like "169.254.*"
  ) {
    return $false
  }

  if (
    $IpAddress -like "10.*" -or
    $IpAddress -like "192.168.*" -or
    $IpAddress -match '^172\.(1[6-9]|2[0-9]|3[0-1])\.'
  ) {
    return $true
  }

  return $false
}

function Get-IpconfigIpv4Candidates {
  $matches = @()

  try {
    $matches = ipconfig |
      Select-String -Pattern 'IPv4[^:]*:\s*(\d+\.\d+\.\d+\.\d+)' -AllMatches |
      ForEach-Object {
        foreach ($match in $_.Matches) {
          $match.Groups[1].Value
        }
      }
  } catch {
    return @()
  }

  return @(
    $matches |
      Where-Object { Test-PrivateIpv4 $_ } |
      Select-Object -Unique
  )
}

function Get-LanIpv4Candidates {
  $candidates = @()

  try {
    $candidates = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
      Select-Object -ExpandProperty IPAddress -Unique
  } catch {
    $candidates = @()
  }

  $filteredCandidates = @(
    $candidates |
      Where-Object { Test-PrivateIpv4 $_ } |
      Select-Object -Unique
  )

  if ($filteredCandidates.Count -gt 0) {
    return @($filteredCandidates)
  }

  return @(Get-IpconfigIpv4Candidates)
}

function Set-OrAdd-EnvValue {
  param(
    [string]$Key,
    [string]$Value
  )

  $content = Get-Content -LiteralPath $envFile -Raw -Encoding UTF8
  $pattern = "(?m)^$([regex]::Escape($Key))=.*$"

  if ($content -match $pattern) {
    $updated = [regex]::Replace($content, $pattern, "$Key=$Value")
    Set-Content -LiteralPath $envFile -Encoding UTF8 -Value $updated
    return
  }

  if ($content -and -not $content.EndsWith("`n")) {
    Add-Content -LiteralPath $envFile -Encoding UTF8 -Value ""
  }

  Add-Content -LiteralPath $envFile -Encoding UTF8 -Value "$Key=$Value"
}

function Ensure-EnvValue {
  param(
    [string]$Key,
    [string]$Value
  )

  $content = Get-Content -LiteralPath $envFile -Raw -Encoding UTF8

  if ($content -notmatch "(?m)^$([regex]::Escape($Key))=") {
    Add-Content -LiteralPath $envFile -Encoding UTF8 -Value "$Key=$Value"
  }
}

function Ensure-EnvFile {
  param(
    [string]$PublicBaseUrl
  )

  if (-not (Test-Path $envFile)) {
    @(
      "NEXTAUTH_URL=$PublicBaseUrl",
      "NEXTAUTH_SECRET=change-this-before-production",
      "BOOTSTRAP_ADMIN_USERNAME=admin",
      "BOOTSTRAP_ADMIN_PASSWORD=ChangeMe123!",
      "NEXT_PUBLIC_BOOTSTRAP_ADMIN_USERNAME_HINT=admin",
      "DATABASE_URL=$defaultDatabaseUrl"
    ) | Set-Content -LiteralPath $envFile -Encoding UTF8
    return
  }

  Set-OrAdd-EnvValue -Key "NEXTAUTH_URL" -Value $PublicBaseUrl
  Ensure-EnvValue -Key "NEXTAUTH_SECRET" -Value "change-this-before-production"
  Ensure-EnvValue -Key "BOOTSTRAP_ADMIN_USERNAME" -Value "admin"
  Ensure-EnvValue -Key "BOOTSTRAP_ADMIN_PASSWORD" -Value "ChangeMe123!"
  Ensure-EnvValue -Key "NEXT_PUBLIC_BOOTSTRAP_ADMIN_USERNAME_HINT" -Value "admin"
  Ensure-EnvValue -Key "DATABASE_URL" -Value $defaultDatabaseUrl
}

function Write-AccessUrls {
  param(
    [string]$PublicBaseUrl,
    [int]$Port,
    [string[]]$LanCandidates,
    [string]$PrimaryLoginLabel = "Same-network device login URL"
  )

  $localLoginUrl = "http://127.0.0.1:$Port/login"
  $publicLoginUrl = "$PublicBaseUrl/login"
  $computerNameLoginUrl = $null

  if ($env:COMPUTERNAME) {
    $computerNameLoginUrl = "http://$($env:COMPUTERNAME):$Port/login"
  }

  Write-Host "Local machine login URL: $localLoginUrl" -ForegroundColor Green
  Write-Host "${PrimaryLoginLabel}: $publicLoginUrl" -ForegroundColor Green

  if ($computerNameLoginUrl) {
    Write-Host "Computer-name URL if the network resolves it: $computerNameLoginUrl"
  }

  $urlFileDir = Split-Path -Parent $currentUrlFile

  if ($urlFileDir -and -not (Test-Path $urlFileDir)) {
    New-Item -ItemType Directory -Force -Path $urlFileDir | Out-Null
  }

  $lines = @(
    "School affairs pilot current URLs",
    "UpdatedAt=$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))",
    "LocalLoginUrl=$localLoginUrl",
    "SameNetworkLoginUrl=$publicLoginUrl"
  )

  if ($computerNameLoginUrl) {
    $lines += "ComputerNameLoginUrl=$computerNameLoginUrl"
  }

  if ($LanCandidates.Count -gt 0) {
    $lines += "DetectedLanLoginUrls="

    foreach ($candidate in $LanCandidates) {
      $lines += "  http://${candidate}:$Port/login"
    }
  }

  $lines | Set-Content -LiteralPath $currentUrlFile -Encoding UTF8
  Write-Host "Current URL note written to: $currentUrlFile"
}

Set-Location $projectRoot

$lanCandidates = @(Get-LanIpv4Candidates)
$primaryLoginLabel = "Same-network device login URL"

if (-not $ExternalBaseUrl) {
  if (-not $PublicHost) {
    if ($lanCandidates.Count -gt 0) {
      $PublicHost = $lanCandidates | Select-Object -First 1
    } else {
      $PublicHost = "localhost"
      $usedFallbackLocalhost = $true
    }
  }

$publicBaseUrl = "http://${PublicHost}:$Port"
} else {
  $publicBaseUrl = $ExternalBaseUrl.TrimEnd("/")
  $primaryLoginLabel = "Public login URL"
}

$loginUrl = "$publicBaseUrl/login"

Write-Host "School affairs pilot launcher" -ForegroundColor Green
Write-Host "Project path: $projectRoot"
Write-Host "Pilot URL: $publicBaseUrl"
Write-Host "Login URL: $loginUrl"

if ($usedFallbackLocalhost) {
  Write-Host "No LAN IPv4 address was detected automatically. Use -PublicHost with the school-network IP if office PCs need remote access." -ForegroundColor Yellow
}

if ($lanCandidates.Count -gt 1) {
  Write-Host "Detected IPv4 addresses:" -ForegroundColor Yellow

  foreach ($candidate in $lanCandidates) {
    Write-Host "  - http://${candidate}:$Port"
  }

  Write-Host "Use -PublicHost if this launcher picked the wrong address." -ForegroundColor Yellow
}

Write-Step "Checking pilot environment"
Ensure-EnvFile -PublicBaseUrl $publicBaseUrl
Write-Host ".env.local is ready."
Write-Host "NEXTAUTH_URL set to $publicBaseUrl"
Write-Host "Keep PostgreSQL on localhost for this pilot. Office PCs should access only the web app URL."
Write-AccessUrls -PublicBaseUrl $publicBaseUrl -Port $Port -LanCandidates $lanCandidates -PrimaryLoginLabel $primaryLoginLabel

$npm = Find-Npm

if (-not $NoInstall -and -not (Test-Path (Join-Path $projectRoot "node_modules"))) {
  Write-Step "First run: installing dependencies"
  & $npm install
}

if ($CheckOnly) {
  Write-Step "Pilot launcher check complete"
  Write-Host "Use this URL from office PCs on the same school network: $publicBaseUrl"

  if ($script:transcriptStarted) {
    Stop-Transcript | Out-Null
  }

  Release-StartupMutex

  exit 0
}

if (Test-LocalPortListening -Port $Port) {
  Write-Step "School pilot service already running"
  Write-Host "Port $Port is already accepting connections."
  Write-Host "Office PCs on the same school network should open: $publicBaseUrl"
  Write-Host "If the workstation just changed networks, old LAN IP bookmarks will stop working; use the current URL above."

  if ($script:transcriptStarted) {
    Stop-Transcript | Out-Null
  }

  Release-StartupMutex
  exit 0
}

if (-not $SkipBuild) {
  Write-Step "Building application"
  & $npm run build
}

Write-Step "Starting school pilot service"
Write-Host "Do not close this window while the pilot is running."
Write-Host "Office PCs on the same school network should open: $publicBaseUrl"
Write-Host "If clients cannot connect, check Windows Firewall for TCP port $Port on the Private profile."
Write-Host ""

$env:PORT = "$Port"
Release-StartupMutex
& $npm run start -- --hostname 0.0.0.0 --port $Port
$exitCode = $LASTEXITCODE

if ($null -eq $exitCode) {
  $exitCode = 0
}

if ($script:transcriptStarted) {
  Stop-Transcript | Out-Null
}

Release-StartupMutex
exit $exitCode
