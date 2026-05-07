# TextDiff Linux 版本构建文档

本文档描述了如何使用 WSL (Windows Subsystem for Linux) 构建 TextDiff 的 Linux 版本安装包。

> **📦 最终产物说明**
> 
> Linux 版本的最终分发产物是 **`.deb` 安装包**（`textdiff_1.0.0_amd64.deb`）。
> 
> deb 包优势：
> - ✅ 自动处理依赖安装（libnss3, libasound2 等系统库）
> - ✅ 自动创建桌面快捷方式和应用菜单项
> - ✅ 可通过 `sudo apt-get install -f` 自动修复缺失依赖
> - ✅ 支持标准卸载（`sudo apt-get remove textdiff`）
> - ✅ 符合 Debian/Ubuntu 软件包管理规范
> 
> 仅在需要支持非 Debian 系发行版（如 Arch、openSUSE）时才使用 tar.gz 格式。

---

## 📋 环境要求

### 必需环境
- **Windows 10/11**  with WSL2 已安装
- **WSL 发行版**: Ubuntu (推荐 20.04 或 22.04)
- **Node.js**: v18+ (WSL 中)
- **npm**: v9+ (WSL 中)

### 验证 WSL 环境
```powershell
# 在 PowerShell 中检查 WSL 状态
wsl --status

# 列出可用的 WSL 发行版
wsl --list --verbose

# 检查 WSL 中的 Node.js 版本
wsl node --version
wsl npm --version
```

---

## 🚀 快速构建（一键脚本）

### 方式一：构建 deb 包（⭐ 推荐 - 最终产物）

```powershell
# 一键构建 deb 安装包（最终产物，含依赖管理）
.\scripts\build-deb.ps1
```

输出文件：
- `dist/textdiff_1.0.0_amd64.deb` - **最终分发产物**
- `dist/linux-unpacked/` - 解压后的应用目录（用于调试）

**参数选项：**
```powershell
# 如果还没有构建 Linux 版本，添加 -Build 参数
.\scripts\build-deb.ps1 -Build

# 构建并在 WSL 中测试安装
.\scripts\build-deb.ps1 -Install

# 完整流程：构建 + 测试安装
.\scripts\build-deb.ps1 -Build -Install
```

### 方式二：仅构建 tar.gz（其他 Linux 发行版）

如果目标系统是 Arch、openSUSE 等非 Debian 系发行版：

```powershell
# 在项目根目录执行
.\scripts\build-linux.ps1
```

输出文件：
- `dist/textdiff-1.0.0.tar.gz` - 通用压缩包
- `dist/linux-unpacked/` - 解压后的应用目录

**注意**：tar.gz 需要用户手动安装系统依赖（见下文"Linux 运行时依赖问题"章节）。

---

## 📝 手动构建步骤详解（deb 包）

如需手动控制构建过程或自定义 deb 包配置，请按以下步骤执行：

### 步骤 1: 准备 WSL 构建环境

```powershell
# 在 Windows PowerShell 中执行

# 1.1 确保已构建 Linux 版本
if (-not (Test-Path "dist\linux-unpacked\textdiff")) {
    Write-Error "请先构建 Linux 版本: .\scripts\build-linux.ps1"
    exit 1
}

# 1.2 创建 WSL 构建目录
wsl mkdir -p /home/$env:USERNAME/textdiff-deb-build

# 1.3 复制文件到 WSL
$sourceDir = (Resolve-Path ".").Path -replace '\\', '/' -replace '^C:', '/mnt/c'
wsl cp -r "$sourceDir/dist/linux-unpacked" /home/$env:USERNAME/textdiff-deb-build/
wsl cp -r "$sourceDir/build" /home/$env:USERNAME/textdiff-deb-build/
```

### 步骤 2: 创建 deb 包结构

在 WSL 中创建标准的 Debian 包结构：

```bash
# 进入 WSL 构建目录
cd ~/textdiff-deb-build

# 创建目录结构
mkdir -p deb-build/DEBIAN
mkdir -p deb-build/opt/textdiff
mkdir -p deb-build/usr/share/applications
mkdir -p deb-build/usr/share/icons/hicolor/256x256/apps

# 复制应用文件
cp -r linux-unpacked/* deb-build/opt/textdiff/
```

### 步骤 3: 创建控制文件

创建 `deb-build/DEBIAN/control`：

```
Package: textdiff
Version: 1.0.0
Section: devel
Priority: optional
Architecture: amd64
Depends: libnss3 (>= 2:3.26), libnspr4 (>= 2:4.9), libasound2 (>= 1.0.16), libgtk-3-0 (>= 3.9.10), libnotify4, libxss1, libxtst6, xdg-utils, libatspi2.0-0, libuuid1, libsecret-1-0
Recommends: libgbm1, libx11-xcb1
Maintainer: TextDiff Team <support@textdiff.app>
Description: Professional text comparison tool
 TextDiff is a powerful text comparison tool for Linux with support for
 file diff, directory diff, and three-way merge.
```

### 步骤 4: 创建桌面入口

创建 `deb-build/usr/share/applications/textdiff.desktop`：

```ini
[Desktop Entry]
Name=TextDiff
Comment=Professional text comparison tool
Exec=/usr/bin/textdiff %F
Icon=textdiff
Type=Application
Categories=Development;TextEditor;
Terminal=false
```

### 步骤 5: 创建维护脚本

创建 `deb-build/DEBIAN/postinst`（安装后执行）：

```bash
#!/bin/bash
set -e

# 创建命令行快捷方式
ln -sf /opt/textdiff/textdiff /usr/bin/textdiff

# 设置权限
chmod 4755 /opt/textdiff/chrome-sandbox 2>/dev/null || true

# 更新桌面数据库
update-desktop-database /usr/share/applications 2>/dev/null || true

echo "TextDiff installed successfully!"
```

创建 `deb-build/DEBIAN/prerm`（卸载前执行）：

```bash
#!/bin/bash
set -e

# 删除快捷方式
rm -f /usr/bin/textdiff
```

赋予执行权限：
```bash
chmod 755 deb-build/DEBIAN/postinst
chmod 755 deb-build/DEBIAN/prerm
```

### 步骤 6: 构建 deb 包

```bash
# 构建包
dpkg-deb --build deb-build textdiff_1.0.0_amd64.deb

# 验证包信息
dpkg-deb -I textdiff_1.0.0_amd64.deb

# 查看包内容
dpkg-deb -c textdiff_1.0.0_amd64.deb
```

### 步骤 7: 复制到 Windows

```powershell
# 复制 deb 包到 dist 目录
wsl cp /home/$env:USERNAME/textdiff-deb-build/textdiff_1.0.0_amd64.deb `
  /mnt/c/Users/$env:USERNAME/Desktop/code/diffText/dist/

# 清理 WSL 临时目录
wsl rm -rf /home/$env:USERNAME/textdiff-deb-build
```

---

## 📝 手动构建步骤详解（tar.gz - 非 Debian 系发行版）

### 步骤 1: 准备 WSL 构建环境

```powershell
# 在 Windows PowerShell 中执行

# 1.1 创建 WSL 构建目录（避免权限问题）
wsl mkdir -p /home/$env:USERNAME/textdiff-build

# 1.2 将项目文件复制到 WSL 本地目录
# 注意：排除 node_modules 和已构建的输出目录
wsl rsync -av `
  --exclude=node_modules `
  --exclude=.git `
  --exclude=out `
  --exclude=dist `
  /mnt/c/Users/$env:USERNAME/Desktop/code/diffText/ `
  /home/$env:USERNAME/textdiff-build/
```

### 步骤 2: 安装依赖

```powershell
# 在 WSL 中安装 npm 依赖
wsl bash -c '
  cd /home/$USER/textdiff-build
  npm install
'
```

**常见问题**: 
- 如果遇到权限错误，确保在 WSL 本地目录（`/home/username/`）而非 `/mnt/c/` 下操作
- 如果 npm 安装卡住，可以尝试 `npm install --prefer-offline`

### 步骤 3: 构建项目

```powershell
# 构建主进程、预加载脚本和渲染进程
wsl bash -c '
  cd /home/$USER/textdiff-build
  npm run build
'
```

### 步骤 4: 构建 Linux 安装包

```powershell
# 仅构建 Linux 版本
wsl bash -c '
  cd /home/$USER/textdiff-build
  npm run dist -- --linux
'
```

**构建目标**（根据 `electron-builder.yml` 配置）：
- `AppImage` - 便携式应用（如果网络允许）
- `deb` - Debian/Ubuntu 安装包
- `rpm` - RHEL/CentOS/Fedora 安装包
- `tar.gz` - 压缩归档（最可靠）

### 步骤 5: 复制构建结果到 Windows

```powershell
# 创建 Windows dist 目录（如果不存在）
New-Item -ItemType Directory -Force -Path dist\linux-unpacked

# 复制解压后的应用目录
wsl cp -r /home/$env:USERNAME/textdiff-build/dist/linux-unpacked/* `
  /mnt/c/Users/$env:USERNAME/Desktop/code/diffText/dist/linux-unpacked/

# 复制压缩包（如果有）
wsl cp /home/$env:USERNAME/textdiff-build/dist/textdiff-*.tar.gz `
  /mnt/c/Users/$env:USERNAME/Desktop/code/diffText/dist/

# 复制其他包格式（如果有）
wsl cp /home/$env:USERNAME/textdiff-build/dist/*.deb `
  /mnt/c/Users/$env:USERNAME/Desktop/code/diffText/dist/ 2>/dev/null
  
wsl cp /home/$env:USERNAME/textdiff-build/dist/*.rpm `
  /mnt/c/Users/$env:USERNAME/Desktop/code/diffText/dist/ 2>/dev/null

wsl cp /home/$env:USERNAME/textdiff-build/dist/*.AppImage `
  /mnt/c/Users/$env:USERNAME/Desktop/code/diffText/dist/ 2>/dev/null
```

### 步骤 6: 清理

```powershell
# 删除 WSL 中的临时构建目录
wsl rm -rf /home/$env:USERNAME/textdiff-build

# 验证 Windows dist 目录中的文件
dir dist\linux-unpacked
dir dist\*.tar.gz
```

---

## ✅ 验证构建结果

### 检查生成的 deb 包（最终产物）

```powershell
# 检查 deb 包
Test-Path dist\textdiff_1.0.0_amd64.deb

# 查看 deb 包大小
(Get-ChildItem dist\textdiff_1.0.0_amd64.deb).Length / 1MB

# 查看 deb 包信息（在 WSL 中）
wsl dpkg-deb -I /mnt/c/Users/$env:USERNAME/Desktop/code/diffText/dist/textdiff_1.0.0_amd64.deb

# 查看 deb 包内容列表
wsl dpkg-deb -c /mnt/c/Users/$env:USERNAME/Desktop/code/diffText/dist/textdiff_1.0.0_amd64.deb | head -20
```

### 测试 deb 包安装

在 WSL 中测试 deb 包是否能正常安装：

```powershell
# 复制 deb 包到 WSL 并测试安装
wsl bash -c '
  cp /mnt/c/Users/$USER/Desktop/code/diffText/dist/textdiff_1.0.0_amd64.deb /tmp/
  sudo dpkg -i /tmp/textdiff_1.0.0_amd64.deb
  sudo apt-get install -f -y  # 修复依赖
  textdiff --version
'
```

### 检查 tar.gz 包（备用格式）

```powershell
# 检查压缩包（如构建了 tar.gz）
Test-Path dist\textdiff-1.0.0.tar.gz

# 检查解压目录
Test-Path dist\linux-unpacked\textdiff

# 查看文件大小
(Get-ChildItem dist\textdiff-1.0.0.tar.gz).Length / 1MB
```

---

## 🔧 常见问题及解决方案

### 问题 1: npm install 权限错误

**症状**: 
```
npm ERR! code EACCES
npm ERR! syscall rmdir
```

**解决方案**:
确保在 WSL 本地文件系统（`/home/username/`）中操作，而非 `/mnt/c/` 挂载点。

```powershell
# 正确：使用 WSL 本地目录
wsl mkdir -p /home/$env:USERNAME/textdiff-build

# 错误：在挂载目录中操作可能导致权限问题
# wsl mkdir -p /mnt/c/Users/.../node_modules
```

### 问题 2: 缺少 node_modules

**症状**:
构建时报错找不到模块

**解决方案**:
```powershell
# 清理并重新安装
wsl bash -c '
  cd /home/$USER/textdiff-build
  rm -rf node_modules package-lock.json
  npm install
'
```

### 问题 3: AppImage 构建失败（网络超时）

**症状**:
```
cannot resolve https://github.com/AppImage/AppImageKit/releases/...
```

**解决方案**:
AppImage 构建需要下载外部工具，网络不稳定时会失败。不影响其他格式构建：
- `tar.gz` 格式始终可用
- `deb` 和 `rpm` 格式通常也能成功

如需 AppImage，可手动下载工具或使用代理。

### 问题 4: 原生模块编译失败

**症状**:
```
better-sqlite3 编译错误
```

**解决方案**:
安装构建工具链：
```powershell
wsl sudo apt-get update
wsl sudo apt-get install -y build-essential python3 libsqlite3-dev
```

### 问题 5: 磁盘空间不足

**症状**:
构建过程中报错 `ENOSPC`

**解决方案**:
```powershell
# 检查 WSL 磁盘空间
wsl df -h

# 清理 npm 缓存
wsl npm cache clean --force

# 删除旧构建目录
wsl rm -rf /home/$env:USERNAME/textdiff-build
```

### 问题 6: 目标系统运行时报错找不到 libnss.so

**症状**:
在目标 Linux 系统上运行 `./textdiff` 时提示：
```
error while loading shared libraries: libnss3.so: cannot open shared object file
```

**原因**:
Electron 应用依赖一些系统级动态库（NSS、NSPR、ALSA 等），这些库在构建时不会打包，需要在目标系统上单独安装。

**解决方案**:
1. 在目标系统上安装运行时依赖：
```bash
# Ubuntu/Debian
sudo apt-get install libnss3 libnspr4 libasound2

# CentOS/RHEL/Fedora
sudo yum install nss nspr alsa-lib
```

2. 或者使用提供的依赖检查脚本：
```bash
# 检查依赖
./scripts/install-linux-deps.sh check

# 自动安装缺失依赖
./scripts/install-linux-deps.sh install
```

3. 使用 deb/rpm 包安装（会自动处理依赖）：
```bash
# deb 包会自动安装依赖
sudo dpkg -i textdiff-1.0.0_amd64.deb
sudo apt-get install -f  # 修复依赖
```

---

## 📝 更新记录

| 日期 | 版本 | 更新内容 |
|------|------|----------|
| 2025-04-29 | 1.0.0 | 初始文档创建 |
| 2025-04-29 | 1.0.1 | 添加运行时依赖问题解决方案 |

---

## 📦 分发指南

### tar.gz 格式（通用）

### deb 格式（⭐ 推荐 - Debian/Ubuntu）

**这是最推荐的安装方式**，deb 包会自动处理所有依赖：

```bash
# 1. 下载 textdiff_1.0.0_amd64.deb

# 2. 安装（会自动安装依赖）
sudo dpkg -i textdiff_1.0.0_amd64.deb

# 3. 如有依赖缺失，自动修复
sudo apt-get install -f

# 4. 运行
textdiff
```

**deb 包优势：**
- ✅ 自动安装 libnss3、libasound2 等系统依赖
- ✅ 自动创建 `/usr/bin/textdiff` 命令
- ✅ 自动添加到应用菜单
- ✅ 支持标准卸载：`sudo apt-get remove textdiff`

### tar.gz 格式（其他 Linux 发行版）

适用于 Arch Linux、openSUSE、Gentoo 等非 Debian 系发行版：

```bash
# 1. 解压
tar -xzf textdiff-1.0.0.tar.gz
cd textdiff-1.0.0

# 2. 安装运行时依赖（必须手动安装）
# Arch Linux:
sudo pacman -S nss nspr alsa-lib

# openSUSE:
sudo zypper install mozilla-nss mozilla-nspr alsa-lib

# CentOS/RHEL:
sudo yum install nss nspr alsa-lib

# 3. 移动到系统目录
sudo mkdir -p /opt/textdiff
sudo cp -r * /opt/textdiff/
sudo ln -sf /opt/textdiff/textdiff /usr/local/bin/textdiff

# 4. 运行
textdiff
```

**注意**: tar.gz 格式不包含依赖管理，首次运行前必须手动安装系统库。

### rpm 格式（RHEL/CentOS/Fedora）

```bash
sudo rpm -i textdiff-1.0.0.x86_64.rpm
# 或使用 dnf
sudo dnf install textdiff-1.0.0.x86_64.rpm
```

---

## 🐧 Linux 运行时依赖问题

在目标 Linux 系统上运行 TextDiff 时，可能会遇到缺少系统库的错误。

### 常见错误：缺少 libnss.so

**症状**:
```bash
./textdiff: error while loading shared libraries: libnss3.so: cannot open shared object file: No such file or directory
```

**原因**: Electron 应用依赖一些系统库（如 NSS、NSPR、ALSA 等），这些库在不同 Linux 发行版上需要单独安装。

### 解决方案

#### Ubuntu / Debian

```bash
# 安装所有必需的运行时依赖
sudo apt-get update
sudo apt-get install -y \
    libnss3 \
    libnspr4 \
    libasound2 \
    libgtk-3-0 \
    libnotify4 \
    libxss1 \
    libxtst6 \
    xdg-utils \
    libatspi2.0-0 \
    libuuid1 \
    libsecret-1-0

# 或者只安装最小依赖集（如果只需要修复 libnss）
sudo apt-get install -y libnss3 libnspr4 libasound2
```

#### CentOS / RHEL / Fedora

```bash
# RHEL/CentOS 8+
sudo dnf install -y \
    nss \
    nspr \
    alsa-lib \
    gtk3 \
    libnotify \
    libXScrnSaver \
    libXtst \
    xdg-utils \
    at-spi2-core \
    libuuid \
    libsecret

# CentOS 7
sudo yum install -y \
    nss \
    nspr \
    alsa-lib \
    gtk3 \
    libnotify \
    libXScrnSaver \
    libXtst \
    xdg-utils \
    at-spi2-core \
    libuuid \
    libsecret
```

#### Arch Linux

```bash
sudo pacman -S \
    nss \
    nspr \
    alsa-lib \
    gtk3 \
    libnotify \
    libxss \
    libxtst \
    xdg-utils \
    at-spi2-core \
    util-linux-libs \
    libsecret
```

### 检查依赖完整性

运行以下脚本检查所有依赖是否满足：

```bash
#!/bin/bash
# check-deps.sh - 检查 TextDiff 运行时依赖

echo "检查 TextDiff 运行时依赖..."

missing_libs=()

# 检查关键库
for lib in libnss3.so libnspr4.so libasound.so.2 libgtk-3.so.0; do
    if ! ldconfig -p | grep -q "$lib"; then
        missing_libs+=("$lib")
    fi
done

if [ ${#missing_libs[@]} -eq 0 ]; then
    echo "✓ 所有关键依赖已安装"
    exit 0
else
    echo "✗ 缺少以下依赖库:"
    for lib in "${missing_libs[@]}"; do
        echo "  - $lib"
    done
    echo ""
    echo "请根据您的发行版安装相应软件包:"
    echo "  Ubuntu/Debian: sudo apt-get install libnss3 libnspr4 libasound2"
    echo "  CentOS/RHEL:   sudo yum install nss nspr alsa-lib"
    exit 1
fi
```

### 验证修复

安装依赖后，验证是否可以正常运行：

```bash
# 1. 检查动态库依赖
ldd ./textdiff | grep "not found"

# 2. 如果输出为空，说明所有库都已找到
# 3. 运行应用
./textdiff
```

---

## 🔍 故障排查

### 查看详细日志

```powershell
# 查看 WSL 中的 npm 日志
wsl cat /home/$env:USERNAME/.npm/_logs/*.log

# 查看 electron-builder 日志
wsl cat /home/$env:USERNAME/textdiff-build/dist/builder-debug.yml
```

### 调试构建过程

```powershell
# 进入 WSL 交互式 shell 手动执行
wsl

cd /home/$USER/textdiff-build
npm install
npm run build
DEBUG=electron-builder npm run dist -- --linux
```

---

## 📊 构建流程总结

### 完整构建流程图

```
┌─────────────────────────────────────────────────────────────────┐
│                     TextDiff Linux 构建流程                        │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────────────┐
│   源代码      │────▶│  WSL 构建     │────▶│  linux-unpacked/     │
│  (Windows)   │     │  (Ubuntu)     │     │  (Linux 可执行文件)   │
└──────────────┘     └──────────────┘     └──────────────────────┘
                                                         │
                                                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    最终产物（二选一）                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────┐    ┌─────────────────────────────┐ │
│  │  deb 包（⭐ 推荐）        │    │  tar.gz（其他发行版）         │ │
│  │  textdiff_1.0.0_amd64   │    │  textdiff-1.0.0.tar.gz       │ │
│  │  .deb                   │    │                             │ │
│  │                         │    │                             │ │
│  │  优点：                   │    │  优点：                      │ │
│  │  ✅ 自动安装依赖           │    │  ✅ 通用性强                  │ │
│  │  ✅ 自动创建快捷方式       │    │  ✅ 支持所有发行版             │ │
│  │  ✅ 应用菜单集成          │    │                             │ │
│  │  ✅ 标准卸载支持          │    │  缺点：                      │ │
│  │                         │    │  ❌ 需手动安装依赖             │ │
│  │  适用：Ubuntu/Debian    │    │  ❌ 无桌面集成                │ │
│  │                         │    │                             │ │
│  │  安装命令：               │    │  适用：Arch/openSUSE/RHEL    │ │
│  │  sudo dpkg -i xxx.deb   │    │                             │ │
│  │  sudo apt-get install -f│    │  安装命令：                   │ │
│  │                         │    │  tar -xzf xxx.tar.gz         │ │
│  └─────────────────────────┘    └─────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 构建命令速查表

| 需求 | 命令 | 输出文件 |
|------|------|----------|
| 构建 deb 包（推荐） | `.\scripts\build-deb.ps1` | `dist/textdiff_1.0.0_amd64.deb` |
| 完整构建 + deb 包 | `.\scripts\build-deb.ps1 -Build` | 同上（包含重新编译） |
| 仅构建 tar.gz | `.\scripts\build-linux.ps1` | `dist/textdiff-1.0.0.tar.gz` |
| 构建 + WSL 测试 | `.\scripts\build-deb.ps1 -Install` | deb 包 + WSL 安装测试 |

---

## 📚 参考信息

### 相关配置文件

- `electron-builder.yml` - Electron Builder 配置（包含 Linux 目标）
- `package.json` - 项目依赖和构建脚本
- `scripts/build-deb.ps1` - **deb 包构建脚本（主要）**
- `scripts/build-linux.ps1` - tar.gz 构建脚本
- `scripts/build-deb.sh` - WSL 内 deb 包构建脚本
- `build/deb/control` - deb 包控制文件模板
- `build/deb/textdiff.desktop` - 桌面入口文件模板

### 构建目标配置（electron-builder.yml）

```yaml
linux:
  target:
    - target: deb      # ✅ 推荐，自动处理依赖
      arch: [x64, arm64]
    - target: tar.gz   # 通用格式，需手动处理依赖
      arch: [x64, arm64]
    - target: rpm      # RHEL/CentOS/Fedora
      arch: [x64]
    - target: AppImage # 便携格式（网络要求高）
      arch: [x64, arm64]
```

### 版本信息

- **当前版本**: 1.0.0
- **Electron 版本**: 30.0.0
- **Node 版本要求**: >= 18.0.0

---

## 💡 提示

1. **首次构建较慢**：首次构建需要下载依赖和编译原生模块，可能需要 10-30 分钟
2. **后续构建更快**：依赖已缓存，仅需构建项目代码
3. **建议定期清理**：WSL 中的 npm 缓存和构建目录会占用空间
4. **网络环境**：确保网络稳定，特别是构建 AppImage 时需要下载外部工具

---

如有问题，请参考 [AGENTS.md](./AGENTS.md) 中的项目架构说明或查看构建日志。
