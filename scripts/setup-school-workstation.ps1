param(
  [int]$Port = 3000,
  [string]$PublicHost = "",
  [string]$DatabaseUrl = "",
  [string]$AppDatabaseName = "school_affairs",
  [string]$AppDatabaseUser = "school_admin",
  [string]$AppDatabasePassword = "school_password",
  [string]$PostgresAdminUser = "postgres",
  [string]$PostgresAdminPassword = "",
  [switch]$SkipPrerequisiteInstall,
  [switch]$SkipDatabaseBootstrap,
  [switch]$SkipDemoSeed,
  [switch]$SkipStart
)

$ErrorActionPreference = "Stop"
$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$envFile = Join-Path $projectRoot ".env.local"

function New-DatabaseUrl {
  param(
    [string]$User,
    [string]$Password,
    [string]$DatabaseName
  )

  return "postgresql://${User}:${Password}@localhost:5432/${DatabaseName}?schema=public"
}

$defaultDatabaseUrl = New-DatabaseUrl -User $AppDatabaseUser -Password $AppDatabasePassword -DatabaseName $AppDatabaseName

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

  throw "npm.cmd was not found. Install Node.js LTS first, then run this setup again."
}

function Find-Winget {
  $command = Get-Command winget.exe -ErrorAction SilentlyContinue

  if ($command) {
    return $command.Source
  }

  return $null
}

function Invoke-CheckedCommand {
  param(
    [string]$FilePath,
    [string[]]$Arguments,
    [string]$FailureMessage
  )

  & $FilePath @Arguments
  $exitCode = $LASTEXITCODE

  if ($null -ne $exitCode -and $exitCode -ne 0) {
    throw "$FailureMessage Exit code: $exitCode"
  }
}

function Ensure-NodeRuntime {
  $npm = $null

  try {
    $npm = Find-Npm
  } catch {
    $npm = $null
  }

  if ($npm) {
    Write-Host "Node.js/npm detected: $npm"
    return $npm
  }

  if ($SkipPrerequisiteInstall) {
    throw "Node.js LTS is missing. Install Node.js LTS or rerun without -SkipPrerequisiteInstall."
  }

  $winget = Find-Winget

  if (-not $winget) {
    throw "Node.js LTS is missing and winget.exe was not found. Install Node.js LTS manually, then rerun this setup."
  }

  Write-Host "Node.js LTS was not detected. Trying winget install..." -ForegroundColor Yellow
  Invoke-CheckedCommand -FilePath $winget -Arguments @(
    "install",
    "--id",
    "OpenJS.NodeJS.LTS",
    "-e",
    "--accept-source-agreements",
    "--accept-package-agreements"
  ) -FailureMessage "Node.js LTS installation failed."

  return Find-Npm
}

function Invoke-Npm {
  param(
    [string]$NpmPath,
    [string[]]$Arguments
  )

  & $NpmPath @Arguments
  $exitCode = $LASTEXITCODE

  if ($null -ne $exitCode -and $exitCode -ne 0) {
    throw "npm command failed: npm $($Arguments -join ' ')"
  }
}

function Find-Psql {
  $candidatePaths = @(
    "D:\PostgreSQL\17\bin\psql.exe",
    "D:\PostgreSQL\16\bin\psql.exe",
    "D:\PostgreSQL\15\bin\psql.exe",
    (Join-Path $env:ProgramFiles "PostgreSQL\17\bin\psql.exe"),
    (Join-Path $env:ProgramFiles "PostgreSQL\16\bin\psql.exe"),
    (Join-Path $env:ProgramFiles "PostgreSQL\15\bin\psql.exe")
  )

  foreach ($candidate in $candidatePaths) {
    if ($candidate -and (Test-Path $candidate)) {
      return $candidate
    }
  }

  $command = Get-Command psql.exe -ErrorAction SilentlyContinue

  if ($command) {
    return $command.Source
  }

  return $null
}

function Ensure-PostgreSqlBinaries {
  $psql = Find-Psql

  if ($psql) {
    Write-Host "PostgreSQL psql detected: $psql"
    return $psql
  }

  if ($SkipPrerequisiteInstall) {
    throw "PostgreSQL was not detected. Install PostgreSQL 17 or rerun without -SkipPrerequisiteInstall."
  }

  $winget = Find-Winget

  if (-not $winget) {
    throw "PostgreSQL was not detected and winget.exe was not found. Install PostgreSQL manually, then rerun this setup."
  }

  Write-Host "PostgreSQL was not detected. Trying winget install..." -ForegroundColor Yellow
  Write-Host "If the PostgreSQL installer opens a UI, choose a password for the postgres superuser and keep it for the next prompt." -ForegroundColor Yellow
  Invoke-CheckedCommand -FilePath $winget -Arguments @(
    "install",
    "--id",
    "PostgreSQL.PostgreSQL.17",
    "-e",
    "--accept-source-agreements",
    "--accept-package-agreements"
  ) -FailureMessage "PostgreSQL installation failed."

  $psql = Find-Psql

  if (-not $psql) {
    throw "PostgreSQL installation finished, but psql.exe was still not found. Reopen the terminal or verify the PostgreSQL installation path."
  }

  return $psql
}

function Ensure-PostgreSqlServiceStarted {
  $services = @(Get-Service -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "postgresql*" })

  if ($services.Count -eq 0) {
    Write-Host "No PostgreSQL Windows service was found. If PostgreSQL is installed differently, psql may still work." -ForegroundColor Yellow
    return
  }

  foreach ($service in $services) {
    if ($service.Status -eq "Running") {
      Write-Host "PostgreSQL service already running: $($service.Name)"
      return
    }
  }

  $serviceToStart = $services | Select-Object -First 1
  Write-Host "Starting PostgreSQL service: $($serviceToStart.Name)"
  Start-Service -Name $serviceToStart.Name
}

function ConvertTo-PlainText {
  param([System.Security.SecureString]$SecureString)

  if (-not $SecureString) {
    return ""
  }

  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureString)

  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}

function Escape-SqlLiteral {
  param([string]$Value)

  return $Value -replace "'", "''"
}

function Escape-SqlIdentifier {
  param([string]$Value)

  return '"' + ($Value -replace '"', '""') + '"'
}

function Invoke-Psql {
  param(
    [string]$PsqlPath,
    [string]$HostName = "localhost",
    [int]$DbPort = 5432,
    [string]$User,
    [string]$Database,
    [string]$Password,
    [string[]]$Arguments
  )

  $oldPassword = $env:PGPASSWORD
  $env:PGPASSWORD = $Password

  try {
    & $PsqlPath "-h" $HostName "-p" "$DbPort" "-U" $User "-d" $Database @Arguments
    $exitCode = $LASTEXITCODE

    if ($null -ne $exitCode -and $exitCode -ne 0) {
      throw "psql command failed. Exit code: $exitCode"
    }
  } finally {
    if ($null -eq $oldPassword) {
      Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
    } else {
      $env:PGPASSWORD = $oldPassword
    }
  }
}

function Invoke-PsqlScalar {
  param(
    [string]$PsqlPath,
    [string]$User,
    [string]$Database,
    [string]$Password,
    [string]$Sql
  )

  $oldPassword = $env:PGPASSWORD
  $env:PGPASSWORD = $Password

  try {
    $output = & $PsqlPath "-h" "localhost" "-p" "5432" "-U" $User "-d" $Database "-tAc" $Sql
    $exitCode = $LASTEXITCODE

    if ($null -ne $exitCode -and $exitCode -ne 0) {
      throw "psql scalar command failed. Exit code: $exitCode"
    }

    return ($output | Select-Object -First 1).Trim()
  } finally {
    if ($null -eq $oldPassword) {
      Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
    } else {
      $env:PGPASSWORD = $oldPassword
    }
  }
}

function Ensure-ApplicationDatabase {
  param(
    [string]$PsqlPath
  )

  if ($SkipDatabaseBootstrap) {
    Write-Host "Database bootstrap skipped by request."
    return
  }

  Ensure-PostgreSqlServiceStarted

  $adminPassword = $PostgresAdminPassword

  if (-not $adminPassword) {
    Write-Host ""
    Write-Host "PostgreSQL admin password is needed to create or verify the application user/database." -ForegroundColor Yellow
    Write-Host "Use the password chosen for the postgres superuser during PostgreSQL installation."
    $securePassword = Read-Host "PostgreSQL admin password for user '$PostgresAdminUser'" -AsSecureString
    $adminPassword = ConvertTo-PlainText -SecureString $securePassword
  }

  Write-Host "Checking PostgreSQL admin connection..."
  Invoke-Psql -PsqlPath $PsqlPath -User $PostgresAdminUser -Database "postgres" -Password $adminPassword -Arguments @("-v", "ON_ERROR_STOP=1", "-c", "SELECT 1;")

  $escapedAppUser = Escape-SqlLiteral -Value $AppDatabaseUser
  $escapedAppPassword = Escape-SqlLiteral -Value $AppDatabasePassword
  $quotedAppUser = Escape-SqlIdentifier -Value $AppDatabaseUser
  $escapedDbName = Escape-SqlLiteral -Value $AppDatabaseName
  $quotedDbName = Escape-SqlIdentifier -Value $AppDatabaseName

  Write-Host "Ensuring PostgreSQL role exists: $AppDatabaseUser"
  $roleSql = @"
DO `$`$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '$escapedAppUser') THEN
    CREATE ROLE $quotedAppUser LOGIN PASSWORD '$escapedAppPassword';
  ELSE
    ALTER ROLE $quotedAppUser WITH LOGIN PASSWORD '$escapedAppPassword';
  END IF;
END
`$`$;
"@

  Invoke-Psql -PsqlPath $PsqlPath -User $PostgresAdminUser -Database "postgres" -Password $adminPassword -Arguments @("-v", "ON_ERROR_STOP=1", "-c", $roleSql)

  Write-Host "Ensuring PostgreSQL database exists: $AppDatabaseName"
  $dbExists = Invoke-PsqlScalar -PsqlPath $PsqlPath -User $PostgresAdminUser -Database "postgres" -Password $adminPassword -Sql "SELECT 1 FROM pg_database WHERE datname = '$escapedDbName';"

  if ($dbExists -ne "1") {
    Invoke-Psql -PsqlPath $PsqlPath -User $PostgresAdminUser -Database "postgres" -Password $adminPassword -Arguments @("-v", "ON_ERROR_STOP=1", "-c", "CREATE DATABASE $quotedDbName OWNER $quotedAppUser;")
  } else {
    Invoke-Psql -PsqlPath $PsqlPath -User $PostgresAdminUser -Database "postgres" -Password $adminPassword -Arguments @("-v", "ON_ERROR_STOP=1", "-c", "ALTER DATABASE $quotedDbName OWNER TO $quotedAppUser;")
  }

  Write-Host "Checking application database connection..."
  Invoke-Psql -PsqlPath $PsqlPath -User $AppDatabaseUser -Database $AppDatabaseName -Password $AppDatabasePassword -Arguments @("-v", "ON_ERROR_STOP=1", "-c", "SELECT 1;")
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

  if ($IpAddress -like "127.*" -or $IpAddress -like "169.254.*") {
    return $false
  }

  return (
    $IpAddress -like "10.*" -or
    $IpAddress -like "192.168.*" -or
    $IpAddress -match '^172\.(1[6-9]|2[0-9]|3[0-1])\.'
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

  $filtered = @(
    $candidates |
      Where-Object { Test-PrivateIpv4 $_ } |
      Select-Object -Unique
  )

  if ($filtered.Count -gt 0) {
    return @($filtered)
  }

  try {
    return @(
      ipconfig |
        Select-String -Pattern 'IPv4[^:]*:\s*(\d+\.\d+\.\d+\.\d+)' -AllMatches |
        ForEach-Object {
          foreach ($match in $_.Matches) {
            $match.Groups[1].Value
          }
        } |
        Where-Object { Test-PrivateIpv4 $_ } |
        Select-Object -Unique
    )
  } catch {
    return @()
  }
}

function New-Secret {
  $bytes = New-Object byte[] 48
  [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
  return [Convert]::ToBase64String($bytes)
}

function Set-OrAdd-EnvValue {
  param(
    [string]$Key,
    [string]$Value
  )

  $content = ""

  if (Test-Path $envFile) {
    $content = Get-Content -LiteralPath $envFile -Raw -Encoding UTF8
  }

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

function Ensure-EnvFile {
  param(
    [string]$PublicBaseUrl,
    [string]$ResolvedDatabaseUrl
  )

  if (-not (Test-Path $envFile)) {
    @(
      "NEXTAUTH_URL=$PublicBaseUrl",
      "NEXTAUTH_SECRET=$(New-Secret)",
      "BOOTSTRAP_ADMIN_USERNAME=admin",
      "BOOTSTRAP_ADMIN_PASSWORD=ChangeMe123!",
      "NEXT_PUBLIC_BOOTSTRAP_ADMIN_USERNAME_HINT=admin",
      "DATABASE_URL=$ResolvedDatabaseUrl"
    ) | Set-Content -LiteralPath $envFile -Encoding UTF8
    return
  }

  Set-OrAdd-EnvValue -Key "NEXTAUTH_URL" -Value $PublicBaseUrl
  Set-OrAdd-EnvValue -Key "DATABASE_URL" -Value $ResolvedDatabaseUrl

  $content = Get-Content -LiteralPath $envFile -Raw -Encoding UTF8

  if ($content -notmatch "(?m)^NEXTAUTH_SECRET=" -or $content -match "(?m)^NEXTAUTH_SECRET=change-this-before-production\s*$") {
    Set-OrAdd-EnvValue -Key "NEXTAUTH_SECRET" -Value (New-Secret)
  }

  if ($content -notmatch "(?m)^BOOTSTRAP_ADMIN_USERNAME=") {
    Set-OrAdd-EnvValue -Key "BOOTSTRAP_ADMIN_USERNAME" -Value "admin"
  }

  if ($content -notmatch "(?m)^BOOTSTRAP_ADMIN_PASSWORD=") {
    Set-OrAdd-EnvValue -Key "BOOTSTRAP_ADMIN_PASSWORD" -Value "ChangeMe123!"
  }

  if ($content -notmatch "(?m)^NEXT_PUBLIC_BOOTSTRAP_ADMIN_USERNAME_HINT=") {
    Set-OrAdd-EnvValue -Key "NEXT_PUBLIC_BOOTSTRAP_ADMIN_USERNAME_HINT" -Value "admin"
  }
}

Set-Location $projectRoot

$lanCandidates = @(Get-LanIpv4Candidates)

if (-not $PublicHost) {
  if ($lanCandidates.Count -gt 0) {
    $PublicHost = $lanCandidates | Select-Object -First 1
  } else {
    $PublicHost = "localhost"
  }
}

if (-not $DatabaseUrl) {
  $DatabaseUrl = New-DatabaseUrl -User $AppDatabaseUser -Password $AppDatabasePassword -DatabaseName $AppDatabaseName
} else {
  $parsedDatabaseUrl = $null

  if ([System.Uri]::TryCreate($DatabaseUrl, [System.UriKind]::Absolute, [ref]$parsedDatabaseUrl)) {
    if ($parsedDatabaseUrl.UserInfo -match "^(?<user>[^:]+):(?<password>.+)$") {
      $AppDatabaseUser = [System.Uri]::UnescapeDataString($Matches.user)
      $AppDatabasePassword = [System.Uri]::UnescapeDataString($Matches.password)
    }

    $parsedDbName = $parsedDatabaseUrl.AbsolutePath.Trim("/")

    if ($parsedDbName) {
      $AppDatabaseName = [System.Uri]::UnescapeDataString($parsedDbName)
    }
  }
}

$publicBaseUrl = "http://${PublicHost}:$Port"

Write-Host "School workstation first-run setup" -ForegroundColor Green
Write-Host "Project path: $projectRoot"
Write-Host "Pilot URL: $publicBaseUrl"
Write-Host "Database URL: $DatabaseUrl"

Write-Step "Checking prerequisite software"
$npm = Ensure-NodeRuntime
$psql = Ensure-PostgreSqlBinaries

Write-Step "Preparing PostgreSQL user and database"
Ensure-ApplicationDatabase -PsqlPath $psql

Write-Step "Preparing environment file"
Ensure-EnvFile -PublicBaseUrl $publicBaseUrl -ResolvedDatabaseUrl $DatabaseUrl
Write-Host ".env.local is ready."

Write-Step "Installing dependencies"
Invoke-Npm -NpmPath $npm -Arguments @("install")

Write-Step "Generating Prisma client"
Invoke-Npm -NpmPath $npm -Arguments @("run", "db:generate")

Write-Step "Synchronizing empty school database schema"
try {
  Invoke-Npm -NpmPath $npm -Arguments @("run", "db:push")
} catch {
  Write-Host ""
  Write-Host "Database schema synchronization failed." -ForegroundColor Red
  Write-Host "Make sure PostgreSQL is installed and this database exists:" -ForegroundColor Yellow
  Write-Host "  user/database from DATABASE_URL"
  Write-Host "Default expected database: school_affairs"
  Write-Host "Default expected user: school_admin"
  throw
}

if (-not $SkipDemoSeed) {
  Write-Step "Writing demo accounts and demo data"
  Invoke-Npm -NpmPath $npm -Arguments @("run", "db:seed:demo")
} else {
  Write-Step "Skipping demo data"
  Write-Host "You can still log in with the bootstrap admin from .env.local if the database has no users."
}

Write-Step "Building application"
Invoke-Npm -NpmPath $npm -Arguments @("run", "build")

if ($SkipStart) {
  Write-Step "Setup complete"
  Write-Host "Run start-school-pilot.cmd when you are ready to start the web app."
  exit 0
}

Write-Step "Starting school pilot"
$logFile = Join-Path $projectRoot "logs\setup-school-workstation-start.log"
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $projectRoot "scripts\start-school-pilot.ps1") -Port $Port -PublicHost $PublicHost -NoInstall -SkipBuild -LogFile $logFile
