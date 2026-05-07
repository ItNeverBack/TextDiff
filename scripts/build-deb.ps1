#!/usr/bin/env pwsh
#requires -Version 5.1

<#
.SYNOPSIS
    Build TextDiff deb package in WSL

.DESCRIPTION
    This script builds a proper .deb package for TextDiff with dependency management.
    It runs the build process in WSL to create a debian package.

.EXAMPLE
    .\build-deb.ps1
    Builds the deb package using existing linux-unpacked files

.EXAMPLE
    .\build-deb.ps1 -Build
    First builds the Linux version, then creates the deb package
#>

[CmdletBinding()]
param(
    [switch]$Build,
    [switch]$Install,
    [string]$OutputDir = "$PSScriptRoot\..\dist"
)

$ErrorActionPreference = "Stop"

# Color output
function Write-Info { param([string]$Message) Write-Host "[INFO] $Message" -ForegroundColor Cyan }
function Write-Success { param([string]$Message) Write-Host "[SUCCESS] $Message" -ForegroundColor Green }
function Write-Warning { param([string]$Message) Write-Host "[WARNING] $Message" -ForegroundColor Yellow }
function Write-Error { param([string]$Message) Write-Host "[ERROR] $Message" -ForegroundColor Red }

# Check prerequisites
function Test-Prerequisites {
    Write-Info "Checking prerequisites..."

    # Check WSL
    try {
        $wslStatus = wsl --status 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Error "WSL is not available. Please install WSL first."
            exit 1
        }
    } catch {
        Write-Error "WSL is not available. Please install WSL first."
        exit 1
    }

    # Check linux-unpacked exists
    $linuxUnpacked = Join-Path $PSScriptRoot "..\dist\linux-unpacked"
    if (-not (Test-Path $linuxUnpacked)) {
        Write-Error "linux-unpacked directory not found at: $linuxUnpacked"
        Write-Info "Please build the Linux version first:"
        Write-Info "  .\scripts\build-linux.ps1"
        exit 1
    }

    Write-Success "Prerequisites check passed"
}

# Build Linux version if requested
function Build-Linux {
    if ($Build) {
        Write-Info "Building Linux version first..."
        & "$PSScriptRoot\build-linux.ps1"
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Linux build failed"
            exit 1
        }
    }
}

# Copy necessary files to WSL
function Copy-ToWSL {
    Write-Info "Copying files to WSL..."

    $sourceDir = (Resolve-Path "$PSScriptRoot\..").Path -replace '\\', '/' -replace '^C:', '/mnt/c'
    $buildDir = "/home/$env:USERNAME/textdiff-deb-build"

    # Create WSL build directory
    wsl mkdir -p $buildDir

    # Copy linux-unpacked
    wsl rm -rf "$buildDir/dist"
    wsl mkdir -p "$buildDir/dist"
    wsl cp -r "$sourceDir/dist/linux-unpacked" "$buildDir/dist/"

    # Copy build files
    wsl cp -r "$sourceDir/build" "$buildDir/"

    # Copy scripts
    wsl cp "$sourceDir/scripts/build-deb.sh" "$buildDir/"

    Write-Success "Files copied to WSL"
    return $buildDir
}

# Build deb package in WSL
function Build-DebPackage {
    param([string]$BuildDir)

    Write-Info "Building deb package in WSL..."

    $result = wsl bash -c "
        cd $BuildDir
        chmod +x build-deb.sh
        ./build-deb.sh 2>&1
        echo \"BUILD_EXIT_CODE:\$?\"
    "

    $exitCode = $result | Select-String "BUILD_EXIT_CODE:" | ForEach-Object { 
        if ($_ -match "BUILD_EXIT_CODE:0") { 0 } else { 1 }
    }

    if ($exitCode -ne 0) {
        Write-Error "Deb package build failed"
        Write-Info $result
        exit 1
    }

    Write-Success "Deb package built successfully"
}

# Copy package back to Windows
function Copy-PackageBack {
    param([string]$BuildDir)

    Write-Info "Copying deb package to Windows..."

    $wslDebPath = "$BuildDir/dist/*.deb"
    $winDistDir = (Resolve-Path "$PSScriptRoot\..\dist").Path -replace '\\', '/' -replace '^C:', '/mnt/c'

    # Copy deb files
    wsl bash -c "
        for deb in $wslDebPath; do
            if [ -f \"\$deb\" ]; then
                cp \"\$deb\" $winDistDir/
                echo \"Copied: \$(basename \$deb)\"
            fi
        done
    "

    # Verify
    $debFiles = Get-ChildItem -Path "$PSScriptRoot\..\dist" -Filter "*.deb"
    if ($debFiles) {
        Write-Success "Deb package copied to dist/"
        foreach ($file in $debFiles) {
            $size = [math]::Round($file.Length / 1MB, 2)
            Write-Info "  - $($file.Name) ($size MB)"
        }
    } else {
        Write-Error "Failed to copy deb package"
        exit 1
    }
}

# Install package locally (for testing)
function Install-Package {
    $debFiles = Get-ChildItem -Path "$PSScriptRoot\..\dist" -Filter "*.deb" | Sort-Object LastWriteTime -Descending
    
    if (-not $debFiles) {
        Write-Error "No deb package found"
        exit 1
    }

    $latestDeb = $debFiles[0]
    Write-Info "Installing package: $($latestDeb.Name)"

    $debPath = $latestDeb.FullName -replace '\\', '/' -replace '^C:', '/mnt/c'
    
    wsl bash -c "
        echo \"Installing deb package...\"
        sudo dpkg -i $debPath 2>&1 || {
            echo \"Fixing dependencies...\"
            sudo apt-get install -f -y 2>&1
        }
        echo \"Installation complete!\"
    "

    Write-Success "Package installed in WSL"
}

# Clean up WSL files
function Clean-WSL {
    param([string]$BuildDir)

    Write-Info "Cleaning up WSL temporary files..."
    wsl rm -rf $BuildDir
    Write-Success "Cleanup complete"
}

# Main function
function Main {
    Write-Info "TextDiff Deb Package Builder"
    Write-Info "============================"

    Test-Prerequisites
    Build-Linux

    $buildDir = Copy-ToWSL
    Build-DebPackage -BuildDir $buildDir
    Copy-PackageBack -BuildDir $buildDir

    if ($Install) {
        Install-Package
    }

    Clean-WSL -BuildDir $buildDir

    Write-Info ""
    Write-Success "========================================"
    Write-Success "Deb package build completed!"
    Write-Success "========================================"
    Write-Info ""
    Write-Info "To install on Ubuntu/Debian:"
    Write-Info "  sudo dpkg -i dist/textdiff_1.0.0_amd64.deb"
    Write-Info "  sudo apt-get install -f  # if dependencies are missing"
    Write-Info ""
    Write-Info "The package includes automatic dependency resolution for:"
    Write-Info "  - libnss3, libnspr4 (NSS libraries)"
    Write-Info "  - libasound2 (Audio support)"
    Write-Info "  - libgtk-3-0, libnotify4 (GUI libraries)"
    Write-Info "  - and other required system libraries"
}

# Run main
try {
    Main
} catch {
    Write-Error "An error occurred: $_"
    exit 1
}
