[CmdletBinding()]
param(
    [string]$OutputRoot = "",
    [string]$PythonHome = "",
    [string]$VenvRoot = "",
    [string]$ModelRoot = "",
    [string]$FfmpegBinRoot = "",
    [switch]$IncludeRuntime,
    [switch]$IncludeModels,
    [switch]$IncludeTools,
    [switch]$Clean
)

$ErrorActionPreference = "Stop"
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)

function New-Utf8NoBomEncoding {
    return [System.Text.UTF8Encoding]::new($false)
}

function Resolve-ExistingPath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$PathValue
    )

    $resolved = Resolve-Path -LiteralPath $PathValue -ErrorAction Stop
    return $resolved.ProviderPath
}

function Ensure-Directory {
    param(
        [Parameter(Mandatory = $true)]
        [string]$PathValue
    )

    if (-not (Test-Path -LiteralPath $PathValue)) {
        New-Item -ItemType Directory -Path $PathValue | Out-Null
    }
}

function Copy-TreeContents {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Source,
        [Parameter(Mandatory = $true)]
        [string]$Destination
    )

    $sourceResolved = Resolve-ExistingPath -PathValue $Source
    Ensure-Directory -PathValue $Destination
    Get-ChildItem -LiteralPath $sourceResolved -Force | ForEach-Object {
        Copy-Item -LiteralPath $_.FullName -Destination $Destination -Recurse -Force
    }
}

function Copy-RequiredItem {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RepoRoot,
        [Parameter(Mandatory = $true)]
        [string]$RelativePath,
        [Parameter(Mandatory = $true)]
        [string]$BundleRoot
    )

    $sourcePath = Join-Path $RepoRoot $RelativePath
    if (-not (Test-Path -LiteralPath $sourcePath)) {
        throw "Required project path not found: $sourcePath"
    }
    Copy-Item -LiteralPath $sourcePath -Destination $BundleRoot -Recurse -Force
}

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-ExistingPath -PathValue $repoRoot
if ([string]::IsNullOrWhiteSpace($OutputRoot)) {
    $OutputRoot = Join-Path $repoRoot "dist"
}

if ($IncludeModels -and -not $IncludeRuntime) {
    Write-Warning "IncludeModels is intended for full portable packages. The light launcher will still use the sibling model cache by default."
}

if ($Clean -and (Test-Path -LiteralPath $OutputRoot)) {
    Write-Host "Removing existing bundle output at $OutputRoot"
    Remove-Item -LiteralPath $OutputRoot -Recurse -Force
}

Ensure-Directory -PathValue $OutputRoot
$outputRootResolved = Resolve-ExistingPath -PathValue $OutputRoot

$bundleRoot = Join-Path $outputRootResolved "SpriteForgeLab"
$internalRoot = Join-Path $bundleRoot "_internal"
$runtimeRoot = Join-Path $internalRoot "runtime"
$pythonRuntimeRoot = Join-Path $runtimeRoot "python"
$ffmpegRuntimeRoot = Join-Path $runtimeRoot "ffmpeg"
$modelsRuntimeRoot = Join-Path $runtimeRoot "models\portable-models"

if (Test-Path -LiteralPath $bundleRoot) {
    Write-Host "Refreshing bundle directory $bundleRoot"
    Remove-Item -LiteralPath $bundleRoot -Recurse -Force
}

Ensure-Directory -PathValue $bundleRoot
Ensure-Directory -PathValue $internalRoot

Write-Host "Copying project files..."
$rootFiles = @(
    "Start.exe",
    "README.md"
)
foreach ($item in $rootFiles) {
    Copy-RequiredItem -RepoRoot $repoRoot -RelativePath $item -BundleRoot $bundleRoot
}

Write-Host "Copying internal project files..."
$projectFiles = @(
    "app",
    "docs",
    "server.py",
    "requirements.txt",
    "requirements-ai.txt",
    "AGENT_INSTALL.md",
    "AI_MATTING.md",
    "USAGE.md",
    "USAGE.zh-CN.md",
    "CHANGELOG.md",
    "LICENSE",
    "VERSION",
    "sprite_video_lab_icon.ico",
    "sprite_video_lab_icon.png"
)
foreach ($item in $projectFiles) {
    Copy-RequiredItem -RepoRoot $repoRoot -RelativePath $item -BundleRoot $internalRoot
}

Write-Host "Copying internal launch scripts..."
$scriptFiles = @(
    "setup_ai_runtime.bat",
    "setup_and_start.bat",
    "start_sprite_video_lab.bat",
    "start_sprite_video_lab_portable.bat"
)
foreach ($item in $scriptFiles) {
    Copy-RequiredItem -RepoRoot $repoRoot -RelativePath $item -BundleRoot $internalRoot
}

if ($IncludeRuntime) {
    if ([string]::IsNullOrWhiteSpace($PythonHome)) {
        throw "PythonHome is required when -IncludeRuntime is used."
    }
    if ([string]::IsNullOrWhiteSpace($VenvRoot)) {
        throw "VenvRoot is required when -IncludeRuntime is used."
    }

    Write-Host "Copying Python runtime..."
    Copy-TreeContents -Source $PythonHome -Destination $pythonRuntimeRoot

    $sitePackagesSource = Join-Path (Resolve-ExistingPath -PathValue $VenvRoot) "Lib\site-packages"
    $sitePackagesDest = Join-Path $pythonRuntimeRoot "Lib\site-packages"
    Write-Host "Copying Python packages from venv..."
    Copy-TreeContents -Source $sitePackagesSource -Destination $sitePackagesDest
}

if ($IncludeTools) {
    if ([string]::IsNullOrWhiteSpace($FfmpegBinRoot)) {
        throw "FfmpegBinRoot is required when -IncludeTools is used."
    }
    $ffmpegRootResolved = Resolve-ExistingPath -PathValue $FfmpegBinRoot
    Write-Host "Copying ffmpeg tools..."
    Ensure-Directory -PathValue $ffmpegRuntimeRoot
    Get-ChildItem -LiteralPath $ffmpegRootResolved -Filter *.exe | ForEach-Object {
        Copy-Item -LiteralPath $_.FullName -Destination $ffmpegRuntimeRoot -Force
    }
}

if ($IncludeModels) {
    if ([string]::IsNullOrWhiteSpace($ModelRoot)) {
        throw "ModelRoot is required when -IncludeModels is used."
    }
    $modelRootResolved = Resolve-ExistingPath -PathValue $ModelRoot
    Write-Host "Copying optional model cache..."
    Ensure-Directory -PathValue $modelsRuntimeRoot
    $huggingFaceRoot = Join-Path $modelRootResolved "huggingface"
    $corridorKeyRoot = Join-Path $modelRootResolved "CorridorKey"
    if (Test-Path -LiteralPath $huggingFaceRoot) {
        Copy-Item -LiteralPath $huggingFaceRoot -Destination $modelsRuntimeRoot -Recurse -Force
    }
    if (Test-Path -LiteralPath $corridorKeyRoot) {
        Copy-Item -LiteralPath $corridorKeyRoot -Destination $modelsRuntimeRoot -Recurse -Force
    }
}

$readmePath = Join-Path $bundleRoot "PORTABLE_README.txt"
$packageType = if ($IncludeRuntime) { "full runtime package" } else { "light package" }
$readmeText = @"
Sprite Forge Lab Portable ($packageType)

Recommended coworker flow:
1. Extract this folder.
2. Double-click Start.exe.
3. Open Model Management in the app and download missing models or tools.

Light package notes:
- The visible folder is intentionally clean. Application files, runtime cache, model cache, and work files are under _internal.
- This package does not include AI models, ffmpeg, Real-ESRGAN, or generated work files.
- If your network needs a proxy, set it only in your local shell before starting:
  set SPRITE_VIDEO_LAB_PROXY=http://127.0.0.1:7897

Full package notes:
- Internal scripts are in the _internal folder for troubleshooting.
- start_sprite_video_lab_portable.bat requires runtime\python and runtime\ffmpeg.
- Optional model cache can be included with -IncludeModels, but it is usually better to distribute models separately.
"@
[System.IO.File]::WriteAllText($readmePath, $readmeText, (New-Utf8NoBomEncoding))

$zipName = if ($IncludeRuntime) { "SpriteForgeLab-full-portable.zip" } else { "SpriteForgeLab-light.zip" }
$zipPath = Join-Path $outputRootResolved $zipName
if (Test-Path -LiteralPath $zipPath) {
    Remove-Item -LiteralPath $zipPath -Force
}

Write-Host "Creating zip archive..."
Compress-Archive -LiteralPath $bundleRoot -DestinationPath $zipPath -CompressionLevel Optimal

$summary = [pscustomobject]@{
    BundleRoot = $bundleRoot
    ZipPath = $zipPath
    PackageType = $packageType
    IncludesRuntime = [bool]$IncludeRuntime
    IncludesTools = [bool]$IncludeTools
    IncludesModels = [bool]$IncludeModels
}

Write-Host ""
Write-Host "Portable bundle created:"
$summary | Format-List
