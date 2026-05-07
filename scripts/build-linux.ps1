#!/usr/bin/env pwsh
#requires -Version 5.1

<#
.SYNOPSIS
    TextDiff Linux 版本自动化构建脚本

.DESCRIPTION
    使用 WSL (Windows Subsystem for Linux) 构建 TextDiff 的 Linux 版本安装包
    并将生成的文件复制到 dist/linux-unpacked/ 目录

.EXAMPLE
    .\build-linux.ps1
    执行完整的 Linux 构建流程

.EXAMPLE
    .\build-linux.ps1 -SkipBuild
    跳过构建步骤，仅复制已有的构建结果

.EXAMPLE
    .\build-linux.ps1 -KeepTemp
    保留 WSL 中的临时构建目录（用于调试）
#>

[CmdletBinding()]
param(
    [switch]$SkipBuild,
    [switch]$KeepTemp,
    [string]$BuildDir = "/home/$env:USERNAME/textdiff-build",
    [string]$SourceDir = $PSScriptRoot | Split-Path -Parent
)

# 设置错误处理
$ErrorActionPreference = "Stop"

# 颜色输出函数
function Write-Info { param([string]$Message) Write-Host "[INFO] $Message" -ForegroundColor Cyan }
function Write-Success { param([string]$Message) Write-Host "[SUCCESS] $Message" -ForegroundColor Green }
function Write-Warning { param([string]$Message) Write-Host "[WARNING] $Message" -ForegroundColor Yellow }
function Write-Error { param([string]$Message) Write-Host "[ERROR] $Message" -ForegroundColor Red }

# 检查 WSL 是否可用
function Test-WSL {
    try {
        $wslStatus = wsl --status 2&1
        if ($LASTEXITCODE -eq 0) {
            return $true
        }
    } catch {
        return $false
    }
    return $false
}

# 检查 WSL 中的 Node.js
function Test-NodeInWSL {
    try {
        $nodeVersion = wsl node --version 2&1
        $npmVersion = wsl npm --version 2&1
        if ($nodeVersion -and $npmVersion) {
            Write-Info "WSL Node.js 版本: $nodeVersion"
            Write-Info "WSL npm 版本: $npmVersion"
            return $true
        }
    } catch {
        return $false
    }
    return $false
}

# 主构建流程
function Start-LinuxBuild {
    Write-Info "开始 TextDiff Linux 版本构建..."
    Write-Info "项目目录: $SourceDir"
    Write-Info "WSL 构建目录: $BuildDir"

    # 步骤 1: 检查 WSL 环境
    Write-Info "步骤 1/7: 检查 WSL 环境..."
    if (-not (Test-WSL)) {
        Write-Error "WSL 未安装或不可用。请先安装 WSL 和 Ubuntu。"
        Write-Info "安装指南: https://docs.microsoft.com/zh-cn/windows/wsl/install"
        exit 1
    }
    Write-Success "WSL 环境正常"

    if (-not (Test-NodeInWSL)) {
        Write-Error "WSL 中未安装 Node.js。请在 WSL 中安装 Node.js:"
        Write-Info "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
        Write-Info "  sudo apt-get install -y nodejs"
        exit 1
    }

    # 步骤 2: 清理旧构建目录
    if (-not $SkipBuild) {
        Write-Info "步骤 2/7: 准备 WSL 构建环境..."
        wsl rm -rf $BuildDir
        wsl mkdir -p $BuildDir
        Write-Success "WSL 构建目录已创建"

        # 步骤 3: 复制项目文件到 WSL
        Write-Info "步骤 3/7: 复制项目文件到 WSL..."
        $sourcePath = $SourceDir -replace '\\', '/' -replace '^C:', '/mnt/c' -replace '^D:', '/mnt/d'
        wsl rsync -av --exclude=node_modules --exclude=.git --exclude=out --exclude=dist "$sourcePath/" "$BuildDir/"
        Write-Success "项目文件已复制"

        # 步骤 4: 安装依赖
        Write-Info "步骤 4/7: 安装 npm 依赖..."
        Write-Info "这可能需要几分钟时间，请耐心等待..."
        $installResult = wsl bash -c "cd $BuildDir && npm install 2>&1"
        if ($LASTEXITCODE -ne 0) {
            Write-Error "npm install 失败"
            Write-Info $installResult
            exit 1
        }
        Write-Success "依赖安装完成"

        # 步骤 5: 构建项目
        Write-Info "步骤 5/7: 构建项目..."
        $buildResult = wsl bash -c "cd $BuildDir && npm run build 2>&1"
        if ($LASTEXITCODE -ne 0) {
            Write-Error "项目构建失败"
            Write-Info $buildResult
            exit 1
        }
        Write-Success "项目构建完成"

        # 步骤 6: 构建 Linux 包
        Write-Info "步骤 6/7: 构建 Linux 安装包..."
        Write-Info "构建目标: tar.gz (可能还有 deb、rpm、AppImage)..."
        $distResult = wsl bash -c "cd $BuildDir && npm run dist -- --linux 2>&1"
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "electron-builder 返回非零退出码，但可能已生成部分包"
        }
        Write-Success "Linux 包构建完成"
    } else {
        Write-Info "步骤 2-6: 跳过构建 (使用 --SkipBuild 参数)"
    }

    # 步骤 7: 复制构建结果到 Windows
    Write-Info "步骤 7/7: 复制构建结果到 Windows..."

    # 确保 Windows dist 目录存在
    $winDistDir = Join-Path $SourceDir "dist"
    $winLinuxUnpackedDir = Join-Path $winDistDir "linux-unpacked"

    New-Item -ItemType Directory -Force -Path $winLinuxUnpackedDir | Out-Null

    # 检查 WSL dist 目录是否存在
    $wslDistExists = wsl test -d "$BuildDir/dist/linux-unpacked" 2&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "WSL 中未找到构建结果。构建可能失败了。"
        exit 1
    }

    # 复制 linux-unpacked 目录
    Write-Info "复制 linux-unpacked 目录..."
    wsl cp -r "$BuildDir/dist/linux-unpacked/"* "$($winLinuxUnpackedDir -replace '\\', '/' -replace '^C:', '/mnt/c' -replace '^D:', '/mnt/d')/"

    # 复制各种包格式
    $packageFiles = @(
        "*.tar.gz"
        "*.deb"
        "*.rpm"
        "*.AppImage"
    )

    foreach ($pattern in $packageFiles) {
        $files = wsl ls "$BuildDir/dist/$pattern" 2&1
        if ($LASTEXITCODE -eq 0 -and $files) {
            Write-Info "复制 $pattern 包..."
            wsl cp "$BuildDir/dist/$pattern" "$($winDistDir -replace '\\', '/' -replace '^C:', '/mnt/c' -replace '^D:', '/mnt/d')/" 2&1 | Out-Null
        }
    }

    Write-Success "构建结果已复制到 Windows"

    # 清理临时目录
    if (-not $KeepTemp) {
        Write-Info "清理 WSL 临时构建目录..."
        wsl rm -rf $BuildDir
        Write-Success "清理完成"
    } else {
        Write-Info "保留 WSL 临时目录: $BuildDir (使用 --KeepTemp 参数)"
    }

    # 显示结果
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Success "Linux 版本构建完成!"
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Info "生成的文件:"

    # 列出生成的文件
    $generatedFiles = Get-ChildItem -Path $winDistDir -Name | Where-Object { 
        $_ -match "textdiff.*\.(tar\.gz|deb|rpm|AppImage)$" -or $_ -eq "linux-unpacked" 
    }

    if ($generatedFiles) {
        foreach ($file in $generatedFiles) {
            $fullPath = Join-Path $winDistDir $file
            if (Test-Path $fullPath -PathType Container) {
                $size = (Get-ChildItem $fullPath -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
                Write-Host "  📁 $file ($([math]::Round($size, 2)) MB)" -ForegroundColor White
            } else {
                $size = (Get-Item $fullPath).Length / 1MB
                Write-Host "  📦 $file ($([math]::Round($size, 2)) MB)" -ForegroundColor White
            }
        }
    }

    Write-Host ""
    Write-Info "使用方法:"
    Write-Host "  1. 分发压缩包: dist/textdiff-1.0.0.tar.gz" -ForegroundColor Gray
    Write-Host "  2. 直接运行: dist/linux-unpacked/textdiff" -ForegroundColor Gray
    Write-Host ""
}

# 执行主函数
try {
    Start-LinuxBuild
} catch {
    Write-Error "构建过程中发生错误: $_"
    exit 1
}
