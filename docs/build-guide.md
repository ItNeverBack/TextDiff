# TextDiff 发版构建指南

## 前置条件

- Node.js 已安装
- WSL (Ubuntu) 已安装（用于构建 Linux deb 包）
- 项目依赖已安装 (`npm install`)

## 构建步骤

### 1. 修改版本号

编辑 `package.json`，将 `version` 改为目标版本号：

```json
"version": "x.x.x",
```

### 2. 创建输出目录

构建产物统一放在 `dist/v<版本号>/` 目录下：

```powershell
New-Item -ItemType Directory -Path "dist/vx.x.x" -Force
```

### 3. 编译项目

```powershell
npm run build
```

### 4. 构建 Windows tar.gz 包

```powershell
npx electron-builder --win --x64 --config.directories.output="dist/vx.x.x"
```

此命令会生成：
- `win-unpacked/` — 解压即用目录
- `TextDiff-x.x.x-win.tar.gz` — Windows 压缩包（x64）

### 5. 构建 Linux deb 包

由于 Windows 上 `electron-builder` 的 deb 构建依赖 `fpm`（需 Ruby），而 Ruby 在 Windows 上安装不便，
因此采用 **WSL + dpkg-deb** 方式构建。

#### 5.1 先生成 linux-unpacked 目录

```powershell
npx electron-builder --linux --x64 --config.directories.output="dist/vx.x.x"
```

此命令会生成 `linux-unpacked/` 目录（即使 deb 构建失败，该目录也会生成）。

#### 5.2 使用 WSL 构建 deb 包

将以下脚本保存为 `dist/vx.x.x/build-deb.sh`：

```bash
#!/bin/bash
set -e

VERSION="x.x.x"  # ← 改为实际版本号
SRC="/mnt/c/Users/m1552/Desktop/code/diffText/dist/v${VERSION}/linux-unpacked"
DEB_ROOT="/tmp/textdiff-deb-build"
OUTPUT="/mnt/c/Users/m1552/Desktop/code/diffText/dist/v${VERSION}/textdiff_${VERSION}_amd64.deb"
ICON="/mnt/c/Users/m1552/Desktop/code/diffText/build/icon.png"

# 清理上次构建
rm -rf "$DEB_ROOT"

# 创建目录结构
mkdir -p "$DEB_ROOT/DEBIAN"
mkdir -p "$DEB_ROOT/opt/TextDiff"
mkdir -p "$DEB_ROOT/usr/share/applications"
mkdir -p "$DEB_ROOT/usr/share/icons/hicolor/0x0/apps"

# 复制应用文件
cp -r "$SRC"/* "$DEB_ROOT/opt/TextDiff/"

# 复制图标
if [ -f "$ICON" ]; then
    cp "$ICON" "$DEB_ROOT/usr/share/icons/hicolor/0x0/apps/textdiff.png"
fi

# 创建桌面快捷方式
cat > "$DEB_ROOT/usr/share/applications/textdiff.desktop" << 'DESKTOP'
[Desktop Entry]
Name=TextDiff
Comment=Professional text comparison tool
Categories=Development;TextEditor;
MimeType=text/plain;
Icon=textdiff
Terminal=false
Type=Application
Exec=/opt/TextDiff/textdiff %F
DESKTOP

# 创建 postinst 脚本
cat > "$DEB_ROOT/DEBIAN/postinst" << 'POSTINST'
#!/bin/bash
if [ -f /opt/TextDiff/chrome-sandbox ]; then
    chmod 4755 /opt/TextDiff/chrome-sandbox
fi
POSTINST
chmod 755 "$DEB_ROOT/DEBIAN/postinst"

# 创建 postrm 脚本
cat > "$DEB_ROOT/DEBIAN/postrm" << 'POSTRM'
#!/bin/bash
rm -rf /opt/TextDiff
POSTRM
chmod 755 "$DEB_ROOT/DEBIAN/postrm"

# 创建 control 文件
cat > "$DEB_ROOT/DEBIAN/control" << CONTROL
Package: textdiff
Version: ${VERSION}
Section: devel
Priority: optional
Architecture: amd64
Depends: libgtk-3-0, libnotify4, libnss3, libxss1, libxtst6, xdg-utils, libatspi2.0-0, libuuid1, libsecret-1-0
Maintainer: TextDiff Team
Description: Professional text comparison tool
 A powerful text comparison tool for Linux with support for
 file diff, directory diff, and three-way merge.
Homepage: https://github.com/ItNeverBack/TextDiff
CONTROL

# 设置可执行权限
chmod 0755 "$DEB_ROOT/opt/TextDiff/textdiff" 2>/dev/null || true
chmod 0755 "$DEB_ROOT/opt/TextDiff/chrome-crashpad-handler" 2>/dev/null || true

# 构建 deb 包（使用 xz 压缩）
dpkg-deb --build -Zxz "$DEB_ROOT" "$OUTPUT"

echo "DEB 构建完成: $OUTPUT"
ls -lh "$OUTPUT"
```

在 WSL 中执行：

```powershell
wsl -d Ubuntu -- bash /mnt/c/Users/m1552/Desktop/code/diffText/dist/vx.x.x/build-deb.sh
```

> **注意**：构建目录必须放在 Linux 文件系统（`/tmp/`）下，不能放在 NTFS 挂载路径下，
> 否则 `dpkg-deb` 会因权限问题报错 `control directory is not a directory`。

### 6. 清理临时文件

```powershell
Remove-Item "dist/vx.x.x/linux-unpacked" -Recurse -Force
Remove-Item "dist/vx.x.x/win-unpacked" -Recurse -Force
Remove-Item "dist/vx.x.x/build-deb.sh" -Force
Remove-Item "dist/vx.x.x/builder-debug.yml" -Force -ErrorAction SilentlyContinue
Remove-Item "dist/vx.x.x/latest.yml" -Force -ErrorAction SilentlyContinue
```

---

## 最终产物

以 v1.1.0 为例，`dist/v1.1.0/` 目录结构如下：

```
dist/v1.1.0/
├── TextDiff-1.1.0-win.tar.gz            # Windows 压缩包（x64，~98 MB）
└── textdiff_1.1.0_amd64.deb             # Linux DEB 安装包（amd64，~87 MB）
```

### 产物说明

| 产物 | 格式 | 平台 | 说明 |
|------|------|------|------|
| `TextDiff-x.x.x-win.tar.gz` | tar.gz | Windows x64 | 解压即用，无需安装 |
| `textdiff_x.x.x_amd64.deb` | deb | Linux amd64 | Debian/Ubuntu 安装包 |

### deb 包内部结构

```
textdiff_x.x.x_amd64.deb
├── DEBIAN/
│   ├── control       # 包元信息（名称、版本、依赖等）
│   ├── postinst      # 安装后脚本（设置 chrome-sandbox SUID 权限）
│   └── postrm        # 卸载后脚本（清理 /opt/TextDiff）
├── opt/TextDiff/     # 应用主体（来自 linux-unpacked）
├── usr/
│   ├── share/
│   │   ├── applications/textdiff.desktop   # 桌面快捷方式
│   │   └── icons/hicolor/0x0/apps/textdiff.png  # 应用图标
```

安装路径：`/opt/TextDiff/`
依赖：`libgtk-3-0, libnotify4, libnss3, libxss1, libxtst6, xdg-utils, libatspi2.0-0, libuuid1, libsecret-1-0`

---

## 常见问题

### Q: `dpkg-deb` 报错 `control directory is not a directory`
A: 构建目录不能放在 NTFS 挂载路径（`/mnt/c/...`）下，必须使用 Linux 原生文件系统（如 `/tmp/`）。

### Q: `electron-builder` 构建 deb 时报错 `fpm not found`
A: Windows 上 `fpm` 需要 Ruby 环境。推荐使用 WSL + `dpkg-deb` 方式替代。

### Q: 如何验证 deb 包内容？
A: 在 WSL 中执行：
```bash
dpkg-deb -I textdiff_x.x.x_amd64.deb    # 查看包信息
dpkg-deb -c textdiff_x.x.x_amd64.deb    # 查看文件列表
```
