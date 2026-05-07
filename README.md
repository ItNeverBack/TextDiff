# TextDiff

专业文本对比工具，支持文件对比、目录对比与三路合并。

## 功能特性

- **多种 Diff 算法** — Myers / Patience / Histogram，可自由切换
- **目录对比与同步** — 递归扫描、双向同步、增量扫描、过滤与统计
- **三路合并** — 基于 base 的三路合并，冲突检测与解决
- **大文件支持** — Worker 线程池并行处理，自动检测大文件
- **搜索与导航** — 全局搜索（支持正则）、Diff 块导航、折叠
- **撤销/重做** — 完整的文件操作历史管理
- **Monaco 编辑器** — 内置 Monaco Diff Editor，语法高亮
- **报告导出** — HTML / JSON / CSV / XML 格式
- **多语言** — 中文 / 英文
- **深色模式** — 跟随系统或手动切换

## 下载安装

从 [Releases](https://github.com/ItNeverBack/TextDiff/releases) 下载最新版本。

| 平台 | 文件 | 说明 |
|------|------|------|
| Windows x64 | `TextDiff-x.x.x-win.tar.gz` | 解压即用，无需安装 |
| Linux amd64 | `textdiff_x.x.x_amd64.deb` | Debian/Ubuntu 安装包 |

### Linux 安装

```bash
sudo dpkg -i textdiff_x.x.x_amd64.deb
sudo apt-get install -f  # 安装依赖
```

### Linux 卸载

```bash
sudo dpkg -r textdiff
```

## 开发

### 环境要求

- Node.js >= 18
- npm >= 9
- WSL (Ubuntu) — 仅构建 Linux deb 包时需要

### 常用命令

```bash
npm install       # 安装依赖
npm run dev       # 启动开发服务器（Electron + Vite 热重载）
npm run build     # 编译项目
npm run typecheck # TypeScript 类型检查
npm run lint      # ESLint 代码检查
npm run test      # 运行测试（Vitest）
```

### 构建与发布

详见 [build-guide.md](docs/build-guide.md)。

```bash
npm run dist      # 构建并打包（产物在 dist/v<版本号>/ 下）
```

## 项目结构

```
packages/
├── main/       # Electron 主进程（diff 引擎、文件 I/O、IPC、CLI）
├── renderer/   # React 渲染进程（UI、状态管理、Monaco 编辑器）
└── shared/     # 共享类型、常量、工具函数
```

## 技术栈

- **框架**: Electron + React + TypeScript
- **构建**: electron-vite + electron-builder
- **状态管理**: Zustand
- **编辑器**: Monaco Editor
- **样式**: Tailwind CSS + CSS Custom Properties
- **数据库**: better-sqlite3
- **测试**: Vitest

## License

MIT
