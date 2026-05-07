# TextDiff 图标说明

## 所需图标文件

请将以下图标文件放入此目录 (`build/`):

### 必需文件
- `icon.png` - 主图标 (至少 512x512 像素，PNG 格式)

### 可选文件（用于不同平台）
- `icon.ico` - Windows 图标 (多尺寸: 16x16, 32x32, 48x48, 256x256)
- `icon.icns` - macOS 图标
- `icon.svg` - 矢量图标（Linux 优先）

## Linux 图标路径

打包后会自动安装到:
- `/usr/share/icons/hicolor/512x512/apps/textdiff.png`
- `/usr/share/pixmaps/textdiff.png`

## 图标规范

- **格式**: PNG (推荐), SVG (Linux 优先)
- **尺寸**: 512x512 像素（最小）
- **背景**: 透明
- **设计**: 建议体现"差异对比"的概念（如左右对比、高亮差异）

## 生成图标

可以使用以下工具生成多平台图标:

```bash
# 使用 electron-icon-builder
npx electron-icon-builder --input=./build/icon.png --output=./build

# 或使用 electron-png-to-ico
npx electron-png-to-ico ./build/icon.png > ./build/icon.ico
```

## 参考

- Electron Builder 图标文档: https://www.electron.build/icons
- 图标设计指南: https://www.electronjs.org/docs/latest/api/native-image
