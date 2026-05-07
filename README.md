<p align="center">
  <img src="build/icon.svg" alt="TextDiff" width="128" height="128">
</p>

<h1 align="center">TextDiff</h1>

<p align="center">
  <strong>专业文本对比工具 / Professional Text Comparison Tool</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue" alt="version">
  <img src="https://img.shields.io/badge/Electron-30-green" alt="electron">
  <img src="https://img.shields.io/badge/React-18-61dafb" alt="react">
  <img src="https://img.shields.io/badge/TypeScript-5.4-3178c6" alt="typescript">
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20Linux-lightgrey" alt="platform">
</p>

<p align="center">
  [ <a href="#中文文档">中文</a> | <a href="#english">English</a> ]
</p>

---

<a id="中文文档"></a>

# TextDiff 中文文档

一款功能强大的桌面文本对比应用，支持文件差异对比、目录比较与三方合并。基于 Electron、React、Monaco Editor 和 TypeScript 构建。

## 功能特性

### 差异引擎

- **三种算法** — Myers（默认）、Patience、Histogram（Git 的 `--histogram`）
- **字符级内联差异** — 基于 LCS 的高亮显示修改行
- **三方合并** — 自动冲突检测，支持手动解决
- **大文件支持** — Worker 线程池（2 个线程）处理 > 5 MB 文件，带进度报告
- **差异缓存与增量计算** — LRU 缓存（50 条目，5 分钟 TTL）+ 智能增量重算

### 忽略规则引擎

- 空白字符：`无` / `首尾` / `全部`
- 大小写不敏感比较
- 行尾符规范化（CRLF ↔ LF）
- 正则表达式过滤
- 注释行忽略 — 15+ 默认前缀，支持 20+ 语言的智能检测

### 视图模式

| 模式 | 快捷键 | 说明 |
|------|--------|------|
| 分栏 | `Ctrl+1` | 左右双栏并排对比 |
| 统一 | `Ctrl+2` | 单栏统一差异视图 |
| 目录 | `Ctrl+3` | 基于树形结构的目录比较 |
| 合并 | `Ctrl+4` | 三方合并编辑器 |

### 目录比较

- 递归扫描，Worker 并行哈希计算
- 比较模式：`文件名` / `大小` / `内容` / `完整`
- 5 种过滤器：扩展名、Glob、正则、大小、日期
- 默认排除：`node_modules`、`.git`、`dist`、`build`、`__pycache__` 等
- 大型目录树虚拟滚动
- 增量扫描 + LRU 缓存

### 目录同步

- 双向文件同步，支持同步计划生成
- 策略：左→右、右→左、双向
- 计划验证、分析与进度追踪
- 通过 UndoManager 支持撤销

### 报告生成

- 导出为 **HTML**、**JSON**、**CSV**、**XML**
- Handlebars 模板，支持保存前预览

### 其他功能

- **多标签页** — 多个对比会话以标签页形式管理
- **Monaco 编辑器** — 30+ 语言语法高亮，自定义明暗主题
- **文件编码** — 自动检测（chardet）+ 手动覆盖（UTF-8、GBK、BIG5 等）
- **文件监听** — 外部修改时自动重新计算差异
- **搜索** — 全局搜索，支持正则、大小写敏感、全词匹配
- **会话管理** — SQLite 持久化，最近文件/目录追踪
- **国际化** — 中文（zh-CN）和英文（en-US），270+ 翻译条目
- **主题** — 浅色 / 深色 / 跟随系统，自定义差异配色方案

## 快捷键

### 文件与标签页

| 快捷键 | 操作 |
|--------|------|
| `Ctrl+O` | 打开文件对 |
| `Ctrl+L` | 打开左侧文件 |
| `Ctrl+R` | 打开右侧文件 |
| `Ctrl+S` | 保存会话 |
| `Ctrl+T` | 新建标签页 |
| `Ctrl+W` | 关闭标签页 |
| `Ctrl+Shift+D` | 打开目录比较 |
| `Ctrl+Shift+V` | 粘贴文本对比 |
| `Ctrl+Shift+X` | 交换左右文件 |

### 导航

| 快捷键 | 操作 |
|--------|------|
| `F7` / `Alt+↓` | 下一个差异 |
| `F6` / `Alt+↑` | 上一个差异 |
| `Alt+Home` | 第一个差异 |
| `Alt+End` | 最后一个差异 |
| `Ctrl+Shift+C` | 折叠/展开未更改行 |

### 通用

| 快捷键 | 操作 |
|--------|------|
| `Ctrl+Shift+T` | 切换主题 |
| `Ctrl+,` | 打开设置 |
| `Ctrl+F` | 搜索 |
| `Ctrl+H` | 会话历史 |
| `Esc` | 关闭浮层 |

## 命令行

TextDiff 同时支持 GUI 和 CLI 模式：

```bash
# 启动 GUI
textdiff

# 启动 GUI 并打开文件
textdiff file1.txt file2.txt

# CLI：输出统一差异
textdiff diff <file1> <file2>

# CLI：并排输出
textdiff diff <file1> <file2> -o side-by-side

# CLI：三方合并
textdiff merge <base> <left> <right> -o <output>

# CLI 参数
--ignore-whitespace <none|leading-trailing|all>
--ignore-case
--ignore-line-endings
--auto   # 自动合并，冲突时失败
```

**Git 集成：**

```bash
git config --global diff.tool textdiff
git config --global merge.tool textdiff
```

## 下载

| 平台 | 格式 | 架构 |
|------|------|------|
| Windows | NSIS 安装包 | x64, ia32 |
| Windows | 便携版 | x64 |
| Linux | AppImage | x64, arm64 |
| Linux | deb | x64, arm64 |
| Linux | rpm | x64 |
| Linux | tar.gz | x64, arm64 |

前往 [Releases](https://github.com/Wisdom45/TextDiff/releases) 下载。

## 配置

默认设置（可通过 GUI `Ctrl+,` 编辑）：

```json
{
  "theme": "system",
  "language": "zh-CN",
  "diff": {
    "defaultAlgorithm": "myers",
    "defaultIgnoreWhitespace": "leading-trailing",
    "defaultIgnoreCase": false,
    "defaultIgnoreLineEndings": true,
    "defaultIgnoreComments": false,
    "contextLines": 3,
    "foldUnchanged": false
  },
  "editor": {
    "fontSize": 13,
    "fontFamily": "'Geist Mono', 'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
    "tabSize": 2,
    "wordWrap": false
  }
}
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | Electron 30 |
| UI 框架 | React 18, Tailwind CSS, Radix UI |
| 编辑器 | Monaco Editor 0.55 |
| 状态管理 | Zustand, Immer |
| 差异算法 | Myers / Patience / Histogram |
| 数据库 | better-sqlite3 (SQLite) |
| 构建工具 | electron-vite, Vite 5 |
| 测试 | Vitest, Playwright |
| 语言 | TypeScript 5.4 |

## 开发

### 环境要求

- Node.js ≥ 20
- npm

### 安装

```bash
git clone https://github.com/Wisdom45/TextDiff.git
cd TextDiff
npm install
```

### 命令

```bash
npm run dev          # 启动开发服务器（热重载）
npm run build        # 构建所有目标（main、preload、renderer）
npm run typecheck    # TypeScript 类型检查
npm run lint         # ESLint 代码检查
npm run test         # Vitest（监听模式）
npm run test -- --run  # Vitest（单次运行）
npm run dist         # 构建 + 打包分发
```

## 项目结构

```
packages/
├── main/src/           # Electron 主进程
│   ├── cli/            # CLI 模块（commander）
│   ├── diff/           # 差异引擎（Myers、Patience、Histogram、三方合并、缓存、同步）
│   ├── directory/      # 目录引擎（扫描、比较、过滤、同步、报告、撤销）
│   ├── fs/             # 文件 I/O、编码、监听
│   ├── ignore/         # 忽略规则引擎（空白、大小写、行尾、模式）
│   ├── ipc/            # IPC 处理器与预加载
│   ├── session/        # SQLite 数据库与会话管理
│   └── settings/       # 设置管理器
├── renderer/src/       # React 前端
│   ├── components/     # 布局、对话框、欢迎页
│   ├── features/       # diff-view、directory、merge、shortcuts、theme
│   ├── stores/         # 10 个 Zustand 状态仓库
│   └── hooks/          # 自定义 React Hooks
└── shared/src/         # 共享类型、常量、国际化、工具函数
```

## 测试

41+ 测试文件，覆盖单元测试、组件测试、集成测试和性能测试：

| 类别 | 示例 |
|------|------|
| 差异引擎 | Myers/Patience/Histogram 算法、块构建器、缓存、同步 |
| 目录 | 扫描器、比较器、过滤器、统计、同步计划 |
| IPC | 端到端处理器测试、目录处理器 |
| 组件 | DirectoryView、TreeNode、FilterBar、MonacoDiffEditor |
| Hooks | useDirectoryCompare、useTreeExpand、useVirtualScroll |
| 集成 | 完整流水线、文件系统、会话管理器 |

```bash
npm run test -- --run              # 运行所有测试
npm run test -- --run --coverage   # 带覆盖率
npm run test -- --run packages/main/src/diff/__tests__/diff-engine.unit.test.ts  # 指定文件
```

## 许可证

Copyright © 2026 TextDiff Team. 保留所有权利。

---

<a id="english"></a>

# TextDiff English

A powerful desktop application for file diff, directory comparison, and three-way merge. Built with Electron, React, Monaco Editor, and TypeScript.

## Features

### Diff Engine

- **Three algorithms** — Myers (default), Patience, Histogram (Git's `--histogram`)
- **Character-level inline diff** — LCS-based highlighting for modified lines
- **Three-way merge** — automatic conflict detection with manual resolution
- **Large file support** — Worker thread pool (2 workers) for files > 5 MB with progress reporting
- **Diff cache & incremental** — LRU cache (50 entries, 5 min TTL) + smart incremental recomputation

### Ignore Rules Engine

- Whitespace: `none` / `leading-trailing` / `all`
- Case-insensitive comparison
- Line-ending normalization (CRLF ↔ LF)
- Regex pattern filtering
- Comment line ignoring — 15+ default prefixes, language-aware detection for 20+ languages

### View Modes

| Mode | Shortcut | Description |
|------|----------|-------------|
| Split | `Ctrl+1` | Side-by-side dual pane |
| Unified | `Ctrl+2` | Single-pane unified diff |
| Directory | `Ctrl+3` | Tree-based directory comparison |
| Merge | `Ctrl+4` | Three-way merge editor |

### Directory Comparison

- Recursive scanning with parallel Worker-based hashing
- Compare modes: `name` / `size` / `content` / `full`
- 5 filter types: extension, glob, regex, size, date
- Default excludes: `node_modules`, `.git`, `dist`, `build`, `__pycache__`, etc.
- Virtual scrolling for large directory trees
- Incremental scanning with LRU cache

### Directory Sync

- Bidirectional file synchronization with sync plan generation
- Strategies: left-to-right, right-to-left, bidirectional
- Plan validation, analysis, and progress tracking
- Undo support via UndoManager

### Report Generation

- Export to **HTML**, **JSON**, **CSV**, **XML**
- Handlebars templates with preview-before-save

### Other

- **Multi-tab** — multiple comparison sessions in tabs
- **Monaco Editor** — syntax highlighting for 30+ languages, custom light/dark themes
- **File encoding** — auto-detection (chardet) + manual override (UTF-8, GBK, BIG5, etc.)
- **File watching** — auto-recompute diff on external changes
- **Search** — global search with regex, case-sensitive, and whole-word modes
- **Session management** — SQLite persistence, recent files/directories tracking
- **i18n** — Chinese (zh-CN) and English (en-US), 270+ translation keys
- **Theme** — Light / Dark / System with custom diff color schemes

## Keyboard Shortcuts

### File & Tab

| Shortcut | Action |
|----------|--------|
| `Ctrl+O` | Open file pair |
| `Ctrl+L` | Open left file |
| `Ctrl+R` | Open right file |
| `Ctrl+S` | Save session |
| `Ctrl+T` | New tab |
| `Ctrl+W` | Close tab |
| `Ctrl+Shift+D` | Open directory compare |
| `Ctrl+Shift+V` | Paste text to compare |
| `Ctrl+Shift+X` | Swap left/right files |

### Navigation

| Shortcut | Action |
|----------|--------|
| `F7` / `Alt+↓` | Next diff |
| `F6` / `Alt+↑` | Previous diff |
| `Alt+Home` | First diff |
| `Alt+End` | Last diff |
| `Ctrl+Shift+C` | Toggle collapse unchanged |

### General

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+T` | Toggle theme |
| `Ctrl+,` | Open settings |
| `Ctrl+F` | Search |
| `Ctrl+H` | Session history |
| `Esc` | Close overlay |

## CLI

TextDiff supports both GUI and CLI modes:

```bash
# Launch GUI
textdiff

# Launch GUI with files
textdiff file1.txt file2.txt

# CLI: output unified diff
textdiff diff <file1> <file2>

# CLI: side-by-side output
textdiff diff <file1> <file2> -o side-by-side

# CLI: three-way merge
textdiff merge <base> <left> <right> -o <output>

# CLI flags
--ignore-whitespace <none|leading-trailing|all>
--ignore-case
--ignore-line-endings
--auto   # auto-merge, fail on conflict
```

**Git integration:**

```bash
git config --global diff.tool textdiff
git config --global merge.tool textdiff
```

## Download

| Platform | Format | Arch |
|----------|-------|------|
| Windows | NSIS Installer | x64, ia32 |
| Windows | Portable | x64 |
| Linux | AppImage | x64, arm64 |
| Linux | deb | x64, arm64 |
| Linux | rpm | x64 |
| Linux | tar.gz | x64, arm64 |

See [Releases](https://github.com/Wisdom45/TextDiff/releases) for download.

## Configuration

Default settings (editable via GUI `Ctrl+,`):

```json
{
  "theme": "system",
  "language": "zh-CN",
  "diff": {
    "defaultAlgorithm": "myers",
    "defaultIgnoreWhitespace": "leading-trailing",
    "defaultIgnoreCase": false,
    "defaultIgnoreLineEndings": true,
    "defaultIgnoreComments": false,
    "contextLines": 3,
    "foldUnchanged": false
  },
  "editor": {
    "fontSize": 13,
    "fontFamily": "'Geist Mono', 'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
    "tabSize": 2,
    "wordWrap": false
  }
}
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Shell | Electron 30 |
| UI | React 18, Tailwind CSS, Radix UI |
| Editor | Monaco Editor 0.55 |
| State | Zustand, Immer |
| Diff | Myers / Patience / Histogram algorithms |
| Database | better-sqlite3 (SQLite) |
| Build | electron-vite, Vite 5 |
| Test | Vitest, Playwright |
| Language | TypeScript 5.4 |

## Development

### Prerequisites

- Node.js ≥ 20
- npm

### Setup

```bash
git clone https://github.com/Wisdom45/TextDiff.git
cd TextDiff
npm install
```

### Commands

```bash
npm run dev          # Start dev server (hot reload)
npm run build        # Build all targets (main, preload, renderer)
npm run typecheck    # TypeScript type checking
npm run lint         # ESLint
npm run test         # Vitest (watch mode)
npm run test -- --run  # Vitest (single run)
npm run dist         # Build + package distributable
```

## Project Structure

```
packages/
├── main/src/           # Electron main process
│   ├── cli/            # CLI module (commander)
│   ├── diff/           # Diff engine (Myers, Patience, Histogram, three-way, cache, sync)
│   ├── directory/      # Directory engine (scanner, comparator, filter, sync, report, undo)
│   ├── fs/             # File I/O, encoding, watching
│   ├── ignore/         # Ignore rule engine (whitespace, case, line-ending, pattern)
│   ├── ipc/            # IPC handlers & preload
│   ├── session/        # SQLite database & session management
│   └── settings/       # Settings manager
├── renderer/src/       # React frontend
│   ├── components/     # Layout, dialogs, welcome
│   ├── features/       # diff-view, directory, merge, shortcuts, theme
│   ├── stores/         # 10 Zustand stores
│   └── hooks/          # Custom React hooks
└── shared/src/         # Shared types, constants, locales, utils
```

## Testing

41+ test files covering unit, component, integration, and performance tests:

| Category | Examples |
|----------|----------|
| Diff engine | Myers/Patience/Histogram algorithms, chunk builder, cache, sync |
| Directory | Scanner, comparator, filter, stats, sync plan |
| IPC | End-to-end handler tests, directory handler |
| Components | DirectoryView, TreeNode, FilterBar, MonacoDiffEditor |
| Hooks | useDirectoryCompare, useTreeExpand, useVirtualScroll |
| Integration | Full pipeline, filesystem, session manager |

```bash
npm run test -- --run              # Run all tests
npm run test -- --run --coverage   # With coverage
npm run test -- --run packages/main/src/diff/__tests__/diff-engine.unit.test.ts  # Specific file
```

## License

Copyright © 2026 TextDiff Team. All rights reserved.
