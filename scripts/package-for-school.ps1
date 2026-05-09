param(
  [string]$OutputDir = "",
  [switch]$IncludeEnvLocal
)

$ErrorActionPreference = "Stop"
$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

if (-not $OutputDir) {
  $OutputDir = Join-Path $projectRoot "artifacts\school-transfer"
}

function Write-Step {
  param([string]$Message)

  Write-Host ""
  Write-Host "== $Message ==" -ForegroundColor Cyan
}

function Test-IsExcludedPath {
  param(
    [string]$RelativePath,
    [bool]$IncludeEnv
  )

  $normalized = $RelativePath -replace '/', '\'
  $firstSegment = ($normalized -split '\\')[0]

  $excludedDirs = @(
    ".git",
    ".next",
    ".tmp",
    "artifacts",
    "logs",
    "node_modules",
    "outputs"
  )

  if ($excludedDirs -contains $firstSegment) {
    return $true
  }

  if (-not $IncludeEnv -and $normalized -eq ".env.local") {
    return $true
  }

  $fileName = Split-Path -Leaf $normalized
  $excludedFiles = @(
    "school_affairs_backup.dump"
  )

  if ($excludedFiles -contains $fileName) {
    return $true
  }

  if ($fileName -like "*.zip" -or $fileName -like "*.dump" -or $fileName -like "*.log") {
    return $true
  }

  return $false
}

function Test-IsExcludedDirectoryName {
  param([string]$Name)

  $excludedDirs = @(
    ".git",
    ".next",
    ".tmp",
    "artifacts",
    "logs",
    "node_modules",
    "outputs"
  )

  return $excludedDirs -contains $Name
}

function Get-PackageFiles {
  param([string]$DirectoryPath)

  foreach ($child in Get-ChildItem -LiteralPath $DirectoryPath -Force) {
    if ($child.PSIsContainer) {
      if (Test-IsExcludedDirectoryName -Name $child.Name) {
        continue
      }

      Get-PackageFiles -DirectoryPath $child.FullName
      continue
    }

    $relativePath = Get-RelativePath -RootPath $projectRoot -FullPath $child.FullName

    if (Test-IsExcludedPath -RelativePath $relativePath -IncludeEnv $IncludeEnvLocal.IsPresent) {
      continue
    }

    $child
  }
}

function Get-RelativePath {
  param(
    [string]$RootPath,
    [string]$FullPath
  )

  $root = [System.IO.Path]::GetFullPath($RootPath).TrimEnd('\', '/') + [System.IO.Path]::DirectorySeparatorChar
  $full = [System.IO.Path]::GetFullPath($FullPath)

  if ($full.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase)) {
    return $full.Substring($root.Length)
  }

  return Split-Path -Leaf $FullPath
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$packageName = "xiaowuxitong-school-transfer-$timestamp"
$stagingRoot = Join-Path $env:TEMP $packageName
$zipPath = Join-Path $OutputDir "$packageName.zip"

Write-Host "School transfer package builder" -ForegroundColor Green
Write-Host "Project path: $projectRoot"
Write-Host "Output path: $zipPath"

if (Test-Path $stagingRoot) {
  Remove-Item -LiteralPath $stagingRoot -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $stagingRoot | Out-Null
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

Write-Step "Copying project files"

$files = Get-PackageFiles -DirectoryPath $projectRoot

foreach ($file in $files) {
  $relativePath = Get-RelativePath -RootPath $projectRoot -FullPath $file.FullName
  $targetPath = Join-Path $stagingRoot $relativePath
  $targetDir = Split-Path -Parent $targetPath

  if ($targetDir -and -not (Test-Path $targetDir)) {
    New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
  }

  Copy-Item -LiteralPath $file.FullName -Destination $targetPath -Force
}

$notePath = Join-Path $stagingRoot "SCHOOL_TRANSFER_README.txt"
@"
校务系统迁移包

这个压缩包只包含项目代码和交付脚本，不包含当前电脑的数据库数据。

在学校办公室电脑上使用：

1. 解压到 D:\xiaowuxitong
2. 双击 setup-school-workstation.cmd
3. 按提示输入 PostgreSQL 的 postgres 超级用户密码
4. 等脚本完成后，打开 logs\current-school-pilot-url.txt 里的登录地址

setup-school-workstation.cmd 会检查 Node.js LTS 和 PostgreSQL；如果缺失，会尝试通过 winget 安装。
它也会创建或更新默认的 school_admin 用户和 school_affairs 数据库。

如果不想写入演示数据，请用 PowerShell 执行：

powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\setup-school-workstation.ps1 -SkipDemoSeed

"@ | Set-Content -LiteralPath $notePath -Encoding UTF8

Write-Step "Creating zip"

if (Test-Path $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

Compress-Archive -Path (Join-Path $stagingRoot "*") -DestinationPath $zipPath -Force

Write-Step "Package ready"
Write-Host "Created: $zipPath" -ForegroundColor Green
Write-Host "Copy this zip to the school office computer and extract it to D:\xiaowuxitong."

Remove-Item -LiteralPath $stagingRoot -Recurse -Force
