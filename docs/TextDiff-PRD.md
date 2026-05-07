# TextDiff — Linux 文本对比软件需求设计文档

**文档版本**：v1.0  
**创建日期**：2026-04-21  
**状态**：草稿  

---

## 目录

1. [产品概述](#1-产品概述)
2. [目标用户与使用场景](#2-目标用户与使用场景)
3. [竞品分析](#3-竞品分析-beyond-compare)
4. [功能需求](#4-功能需求)
5. [非功能需求](#5-非功能需求)
6. [技术架构设计](#6-技术架构设计)
7. [UI/UX 设计规范](#7-uiux-设计规范)
8. [数据模型设计](#8-数据模型设计)
9. [模块详细设计](#9-模块详细设计)
10. [API 接口设计（后端服务模式）](#10-api-接口设计后端服务模式)
11. [部署方案](#11-部署方案)
12. [里程碑计划](#12-里程碑计划)
13. [风险评估](#13-风险评估)

---

## 1. 产品概述

### 1.1 产品定位

**TextDiff** 是一款面向 Linux 平台的专业文本对比工具，提供直观的双栏/三栏差异视图，帮助开发者、运维工程师和内容编辑人员快速识别文件或文本块之间的差异。

### 1.2 产品目标

- 提供不亚于 Beyond Compare 的文本对比体验
- 完全开源/可私有部署，适配 Linux 桌面及服务器环境
- 支持命令行调用与 GUI 双模式
- 核心对比引擎性能优异，可处理数十万行级别的大文件

### 1.3 技术路线选择

| 方案 | 技术栈 | 特点 |
|------|--------|------|
| **方案 A（推荐）** | Electron + React + Node.js | 跨平台 GUI，Web 生态丰富，开发效率高 |
| 方案 B | Qt6 + C++ | 原生性能最优，但开发周期长 |
| 方案 C | GTK4 + Python | Linux 原生外观，适合轻量工具 |
| 方案 D | Web App（浏览器访问） | 可私有部署为 Web 服务，任意客户端访问 |

**推荐方案 A**：Electron + React + TypeScript，原因：
- 可同时支持 Linux 桌面 App 和 Web 浏览器模式
- Monaco Editor（VS Code 同款编辑器）提供顶级的代码差异视图
- Node.js 后端可直接调用 `diff` 算法库
- 生态成熟，易于扩展插件系统

---

## 2. 目标用户与使用场景

### 2.1 目标用户

| 用户类型 | 核心诉求 |
|----------|---------|
| **软件开发者** | 代码 Review、合并冲突解决、版本间差异查看 |
| **运维工程师** | 配置文件变更审计、日志差异分析 |
| **内容编辑** | 文档版本对比、文章修改追踪 |
| **数据分析师** | CSV/TSV 数据差异比对 |

### 2.2 核心使用场景

1. **文件对比**：打开两个本地文件，查看行级/字符级差异
2. **目录对比**：比较两个目录结构，找出新增/删除/修改的文件
3. **文本粘贴对比**：直接粘贴两段文字进行即时对比
4. **三路合并**：Base + 左侧修改 + 右侧修改，进行合并冲突解决
5. **Git 集成**：作为 `git difftool` / `git mergetool` 使用

---

## 3. 竞品分析：Beyond Compare

### 3.1 核心功能参考

| 功能模块 | Beyond Compare 实现 | 我们的策略 |
|---------|-------------------|-----------|
| 文本对比 | 行级 + 字符级高亮 | ✅ 完整实现 |
| 目录对比 | 树形结构，递归对比 | ✅ 完整实现 |
| 三路合并 | Base/Left/Right 三栏 | ✅ 完整实现 |
| 语法高亮 | 支持多种语言 | ✅ Monaco Editor 原生支持 |
| 忽略规则 | 空白符/大小写/正则 | ✅ 完整实现 |
| 会话管理 | 保存对比会话 | ✅ 完整实现 |
| 文件过滤 | 扩展名/通配符过滤 | ✅ 完整实现 |
| 二进制对比 | Hex 视图 | 🔄 Phase 2 实现 |
| FTP/SFTP 对比 | 远程文件系统 | 🔄 Phase 2 实现 |
| 脚本化 | 命令行脚本支持 | ✅ 完整实现 |

### 3.2 差异化亮点

- **完全免费开源**（Beyond Compare 商业收费）
- **Web 模式**：可部署为团队内部 Web 服务，无需安装客户端
- **AI 辅助差异摘要**：可选接入 LLM，自动总结变更意图
- **实时协作**：多人同时查看同一对比会话（WebSocket 支持）

---

## 4. 功能需求

### 4.1 核心功能 MVP（Phase 1）

#### F1. 文本对比视图

| 编号 | 需求描述 | 优先级 |
|------|---------|--------|
| F1.1 | 双栏并排显示左右两个文本，实时同步滚动 | P0 |
| F1.2 | 行级差异高亮：新增（绿色）、删除（红色）、修改（橙色） | P0 |
| F1.3 | 字符级差异高亮（行内 inline diff） | P0 |
| F1.4 | 差异块导航（上一处/下一处差异，显示差异总数） | P0 |
| F1.5 | 行号显示，可点击跳转 | P0 |
| F1.6 | 折叠相同区域（Collapse unchanged regions） | P1 |
| F1.7 | 单栏统一视图（Unified diff 模式） | P1 |
| F1.8 | 实时编辑并即时重新对比 | P1 |

#### F2. 文件/目录操作

| 编号 | 需求描述 | 优先级 |
|------|---------|--------|
| F2.1 | 通过文件选择对话框打开本地文件 | P0 |
| F2.2 | 拖拽文件到对比窗口 | P0 |
| F2.3 | 粘贴文本直接对比 | P0 |
| F2.4 | 目录递归对比，树形展示结构差异 | P1 |
| F2.5 | 文件过滤（扩展名/通配符/正则） | P1 |
| F2.6 | 会话保存与恢复 | P1 |

#### F3. 差异忽略规则

| 编号 | 需求描述 | 优先级 |
|------|---------|--------|
| F3.1 | 忽略空白字符差异（leading/trailing/all whitespace） | P0 |
| F3.2 | 忽略大小写差异 | P0 |
| F3.3 | 忽略行尾符差异（CRLF vs LF） | P0 |
| F3.4 | 自定义正则表达式忽略规则 | P1 |
| F3.5 | 忽略注释行（可配置注释前缀） | P2 |

#### F4. 三路合并

| 编号 | 需求描述 | 优先级 |
|------|---------|--------|
| F4.1 | Base + Left + Right 三栏合并视图 | P1 |
| F4.2 | 冲突块标记，逐块选择采用哪侧修改 | P1 |
| F4.3 | 合并结果输出到文件 | P1 |
| F4.4 | 支持手动编辑合并结果 | P2 |

#### F5. 语法与编码支持

| 编号 | 需求描述 | 优先级 |
|------|---------|--------|
| F5.1 | 基于文件扩展名自动选择语法高亮 | P0 |
| F5.2 | 支持 UTF-8、GBK、UTF-16 等编码检测与切换 | P0 |
| F5.3 | 支持 100+ 编程语言语法高亮（Monaco 原生） | P1 |

#### F6. 命令行界面（CLI）

| 编号 | 需求描述 | 优先级 |
|------|---------|--------|
| F6.1 | `textdiff <file1> <file2>` 打开 GUI 对比 | P0 |
| F6.2 | `textdiff --diff <file1> <file2>` 输出文本差异到 stdout | P0 |
| F6.3 | `textdiff --merge <base> <left> <right> -o <output>` 三路合并 | P1 |
| F6.4 | `--ignore-whitespace`、`--ignore-case` 等命令行标志 | P0 |
| F6.5 | 作为 `git difftool` / `git mergetool` 的配置方式文档 | P0 |

### 4.2 扩展功能（Phase 2）

- **远程文件对比**：通过 SFTP/FTP 连接远程主机，直接对比远程文件
- **二进制/Hex 对比**：十六进制视图对比二进制文件
- **历史记录**：记录最近对比的文件对，快速重新打开
- **插件系统**：允许扩展自定义差异处理器（如 JSON/XML 智能对比）
- **AI 变更摘要**：接入 LLM API，自动生成差异的自然语言描述
- **团队协作模式**：通过 WebSocket 实现多人实时共享查看对比会话

---

## 5. 非功能需求

### 5.1 性能要求

| 场景 | 指标 |
|------|------|
| 打开并对比 10 万行文件 | < 2 秒完成差异计算 |
| 文件变更后重新对比 | < 500ms 更新视图 |
| 目录对比（1000 个文件） | < 5 秒完成扫描 |
| GUI 滚动帧率 | ≥ 60fps |
| 内存占用（普通文件） | < 200MB |

### 5.2 兼容性要求

- **Linux 发行版**：Ubuntu 20.04+、Debian 11+、CentOS 8+、Fedora 36+、Arch Linux
- **CPU 架构**：x86_64，aarch64（ARM）
- **显示服务器**：X11 和 Wayland 均需支持
- **最小内存**：512MB RAM

### 5.3 可访问性

- 支持键盘完全操作（Tab 导航 + 快捷键）
- 高对比度主题选项
- 支持屏幕阅读器（ARIA 标签）

### 5.4 国际化

- 界面语言：中文（简体）、英文（至少两种）
- 支持非 ASCII 文件名和内容

---

## 6. 技术架构设计

### 6.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                     TextDiff 应用                           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Electron Main Process                   │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │   │
│  │  │  File I/O   │  │  Diff Engine│  │  CLI Layer │  │   │
│  │  │  (Node.js)  │  │ (diff-match │  │ (commander)│  │   │
│  │  │             │  │  -patch /   │  │            │  │   │
│  │  │             │  │  Myers Diff)│  │            │  │   │
│  │  └─────────────┘  └─────────────┘  └────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
│          IPC (contextBridge / ipcMain / ipcRenderer)        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Electron Renderer Process               │   │
│  │  ┌────────────────────────────────────────────────┐ │   │
│  │  │        React + TypeScript UI                   │ │   │
│  │  │  ┌──────────────┐  ┌──────────────────────┐   │ │   │
│  │  │  │ Monaco Editor│  │  Directory Tree View  │   │ │   │
│  │  │  │ Diff View    │  │  (虚拟滚动)            │   │ │   │
│  │  │  └──────────────┘  └──────────────────────┘   │ │   │
│  │  │  ┌──────────────┐  ┌──────────────────────┐   │ │   │
│  │  │  │ Session Mgr  │  │  Settings Panel       │   │ │   │
│  │  │  └──────────────┘  └──────────────────────┘   │ │   │
│  │  └────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 技术栈选型

**前端（Renderer）**

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.x | UI 框架 |
| TypeScript | 5.x | 类型安全 |
| Monaco Editor | 0.45+ | 代码编辑器 / Diff 视图 |
| Zustand | 4.x | 全局状态管理 |
| React Query | 5.x | 异步状态 / IPC 调用封装 |
| Tailwind CSS | 3.x | 样式系统 |
| Radix UI | 1.x | 无障碍 UI 组件 |
| Vite | 5.x | 构建工具 |

**后端（Main Process）**

| 技术 | 版本 | 用途 |
|------|------|------|
| Electron | 30.x | 桌面应用容器 |
| Node.js | 20.x | 运行时 |
| diff-match-patch | latest | Google 出品的差异算法库 |
| chardet | latest | 文件编码检测 |
| iconv-lite | latest | 编码转换 |
| chokidar | 3.x | 文件变更监听 |
| better-sqlite3 | 9.x | 会话持久化 |
| commander | 12.x | CLI 解析 |
| electron-builder | 24.x | 打包发布 |

### 6.3 差异算法选型

采用**分层差异策略**：

```
Level 1: 行级差异（Myers Diff Algorithm）
         ↓ 对变更行进行
Level 2: 字符级内联差异（Bitap / diff-match-patch）
         ↓ 可选
Level 3: 语义级差异（词级 / Token 级，针对自然语言文本）
```

**为何选 Myers Diff**：
- 时间复杂度 O((N+M)D)，空间优化版 O(D²)
- Git 默认使用的算法
- diff-match-patch 库提供生产级实现

**大文件优化策略**：
- 文件大于 5MB 时，在 Node.js Worker Thread 中计算差异，不阻塞 UI
- 启用虚拟滚动（Virtual Scrolling），仅渲染可视区域行
- 使用 Web Workers 或 Node Child Process 分块计算

### 6.4 项目结构

```
textdiff/
├── packages/
│   ├── main/                   # Electron 主进程
│   │   ├── src/
│   │   │   ├── ipc/            # IPC 处理器
│   │   │   │   ├── diff.handler.ts
│   │   │   │   ├── file.handler.ts
│   │   │   │   └── session.handler.ts
│   │   │   ├── diff/           # 差异计算引擎
│   │   │   │   ├── myers.ts
│   │   │   │   ├── inline.ts
│   │   │   │   └── three-way.ts
│   │   │   ├── fs/             # 文件系统操作
│   │   │   │   ├── reader.ts
│   │   │   │   ├── watcher.ts
│   │   │   │   └── directory.ts
│   │   │   ├── session/        # 会话管理
│   │   │   │   └── session.repository.ts
│   │   │   └── cli/            # 命令行入口
│   │   │       └── index.ts
│   │   └── package.json
│   │
│   ├── renderer/               # React 前端
│   │   ├── src/
│   │   │   ├── features/
│   │   │   │   ├── diff-view/  # 核心对比视图
│   │   │   │   ├── directory/  # 目录对比
│   │   │   │   ├── merge/      # 三路合并
│   │   │   │   └── session/    # 会话管理
│   │   │   ├── components/     # 通用 UI 组件
│   │   │   ├── hooks/          # 自定义 Hooks
│   │   │   ├── stores/         # Zustand 状态
│   │   │   └── lib/            # 工具函数
│   │   └── package.json
│   │
│   └── shared/                 # 主进程 & 渲染进程共享类型
│       └── types/
│           ├── diff.types.ts
│           └── ipc.types.ts
│
├── electron.vite.config.ts
├── package.json
└── README.md
```

---

## 7. UI/UX 设计规范

### 7.1 布局规范

#### 主界面布局

```
┌──────────────────────────────────────────────────────────────┐
│ [菜单栏]  文件 | 编辑 | 视图 | 会话 | 工具 | 帮助              │
├──────────────────────────────────────────────────────────────┤
│ [工具栏]  📂左文件  📂右文件  [忽略选项▼]  ↑↓差异导航  🔀合并  │
├──────────────────────────────────────────────────────────────┤
│ [标签页]  + 对比1  + 对比2  ...                               │
├────────────────────────┬─────────────────────────────────────┤
│ 左侧面板                │ 右侧面板                             │
│ 路径: /path/to/a.txt  │ 路径: /path/to/b.txt               │
│ 编码: UTF-8  行数:1024 │ 编码: UTF-8  行数:1032             │
├────────────────────────┼─────────────────────────────────────┤
│  1  │ function foo() {  │  1  │ function foo() {              │
│  2  │   return 1;       │  2  │   return 2;    ← [字符级高亮] │
│  3  │ }                 │  3  │ }                             │
│  4  │                   │  4  │ // new comment [新增行-绿色]  │
│ ...                     │ ...                                  │
├──────────────────────────────────────────────────────────────┤
│ [状态栏]  差异: 12块 | 新增: 5行 | 删除: 3行 | 修改: 4行      │
└──────────────────────────────────────────────────────────────┘
```

### 7.2 颜色方案

#### 亮色主题

| 差异类型 | 行背景色 | 字符高亮色 |
|---------|---------|-----------|
| 新增行 | `#e6ffed` | `#acf2bd` |
| 删除行 | `#ffeef0` | `#fdb8c0` |
| 修改行 | `#fff5b1` | `#ffdf5d` |
| 冲突行 | `#fff3cd` | `#ffc107` |
| 相同行 | 无 | 无 |

#### 暗色主题

| 差异类型 | 行背景色 | 字符高亮色 |
|---------|---------|-----------|
| 新增行 | `#1a3a2a` | `#2ea043` |
| 删除行 | `#3d1a1a` | `#f85149` |
| 修改行 | `#3d3510` | `#d4a017` |
| 冲突行 | `#3d2e00` | `#e3b341` |

### 7.3 快捷键规范

| 功能 | 快捷键 |
|------|--------|
| 打开文件对话框（左侧） | `Ctrl+L` |
| 打开文件对话框（右侧） | `Ctrl+R` |
| 下一处差异 | `F7` 或 `Alt+↓` |
| 上一处差异 | `F6` 或 `Alt+↑` |
| 第一处差异 | `Alt+Home` |
| 最后一处差异 | `Alt+End` |
| 折叠/展开相同区域 | `Ctrl+Shift+C` |
| 切换统一视图/双栏视图 | `Ctrl+Shift+V` |
| 复制左侧到右侧（当前差异块） | `Ctrl+Right` |
| 复制右侧到左侧（当前差异块） | `Ctrl+Left` |
| 保存会话 | `Ctrl+S` |
| 新建对比标签 | `Ctrl+T` |
| 关闭当前标签 | `Ctrl+W` |
| 切换主题 | `Ctrl+Shift+T` |
| 搜索 | `Ctrl+F` |
| 全屏 | `F11` |

---

## 8. 数据模型设计

### 8.1 核心数据类型（TypeScript）

```typescript
// shared/types/diff.types.ts

/** 差异行类型 */
export type DiffLineType = 
  | 'equal'     // 相同
  | 'insert'    // 新增（右侧）
  | 'delete'    // 删除（左侧）
  | 'replace'   // 修改（两侧都有，内容不同）

/** 字符级内联差异片段 */
export interface InlineDiffSegment {
  text: string
  type: 'equal' | 'insert' | 'delete'
}

/** 单行差异信息 */
export interface DiffLine {
  leftLineNo: number | null   // null 表示右侧新增行
  rightLineNo: number | null  // null 表示左侧删除行
  type: DiffLineType
  leftContent: string
  rightContent: string
  inlineDiff?: {
    left: InlineDiffSegment[]
    right: InlineDiffSegment[]
  }
}

/** 差异块（连续的变更区域） */
export interface DiffChunk {
  id: string
  startIndex: number    // 在 DiffLine[] 中的起始位置
  endIndex: number
  type: 'change' | 'insert' | 'delete'
  leftLineRange: [number, number]   // [起始行, 结束行]
  rightLineRange: [number, number]
}

/** 完整对比结果 */
export interface DiffResult {
  lines: DiffLine[]
  chunks: DiffChunk[]
  stats: {
    totalLines: number
    equalLines: number
    insertedLines: number
    deletedLines: number
    modifiedLines: number
    chunkCount: number
  }
  computedAt: number  // Unix timestamp
}

/** 对比选项 */
export interface DiffOptions {
  ignoreWhitespace: 'none' | 'leading-trailing' | 'all'
  ignoreCase: boolean
  ignoreLineEndings: boolean
  ignorePatterns: string[]   // 正则表达式列表
  algorithm: 'myers' | 'patience' | 'histogram'
  contextLines: number       // 折叠时显示的上下文行数，默认 3
}

/** 文件信息 */
export interface FileInfo {
  path: string | null         // null 表示内容来自粘贴/输入
  content: string
  encoding: string
  lineEnding: 'lf' | 'crlf' | 'mixed'
  size: number                // bytes
  mtime: number | null        // 修改时间
  language: string            // Monaco language id
}

/** 对比会话 */
export interface DiffSession {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  left: FileInfo
  right: FileInfo
  options: DiffOptions
  scrollPosition?: {
    left: number
    right: number
  }
  activeChunkIndex?: number
}

/** 目录对比项目 */
export interface DirectoryDiffEntry {
  relativePath: string
  name: string
  type: 'file' | 'directory'
  status: 'equal' | 'left-only' | 'right-only' | 'modified' | 'conflict'
  leftPath: string | null
  rightPath: string | null
  children?: DirectoryDiffEntry[]
}
```

### 8.2 会话持久化（SQLite Schema）

```sql
-- sessions 表：存储对比会话基本信息
CREATE TABLE sessions (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  data        TEXT NOT NULL  -- JSON 序列化的 DiffSession
);

-- recent_files 表：最近打开文件历史
CREATE TABLE recent_files (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  path        TEXT NOT NULL UNIQUE,
  accessed_at INTEGER NOT NULL
);

-- settings 表：用户设置
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

---

## 9. 模块详细设计

### 9.1 差异计算引擎（Diff Engine）

```
输入：leftContent: string, rightContent: string, options: DiffOptions
输出：DiffResult

处理流程：
1. 预处理
   ├── 编码规范化（统一为 UTF-8）
   ├── 根据 options.ignoreLineEndings 规范化行尾符
   ├── 按行分割文本
   └── 根据 ignoreWhitespace / ignoreCase 对行内容预处理

2. 行级差异计算（Myers 算法）
   ├── 输入：左侧行数组、右侧行数组
   └── 输出：等价于 git diff 的 edit script

3. 构建 DiffLine[]
   ├── 连续等行 → type: 'equal'
   ├── 仅左侧有 → type: 'delete'
   ├── 仅右侧有 → type: 'insert'
   └── 两侧都有但不同 → type: 'replace'

4. 字符级内联 diff（仅对 'replace' 行）
   ├── 使用 diff-match-patch 计算字符级差异
   └── 填充 DiffLine.inlineDiff

5. 构建 DiffChunk[]（将连续变更行分组为块）

6. 计算统计信息 stats

7. 过滤应忽略的模式（ignorePatterns 正则）
```

### 9.2 大文件处理策略

```typescript
// main/diff/worker-pool.ts

const LARGE_FILE_THRESHOLD = 5 * 1024 * 1024  // 5MB

async function computeDiff(
  left: string, 
  right: string, 
  options: DiffOptions
): Promise<DiffResult> {
  const isLarge = left.length + right.length > LARGE_FILE_THRESHOLD
  
  if (isLarge) {
    // 在 Worker Thread 中计算，不阻塞主进程
    return computeInWorker(left, right, options)
  }
  
  return computeSync(left, right, options)
}
```

### 9.3 IPC 通信协议

所有 IPC 通信通过 contextBridge 暴露的 `window.api` 对象进行：

```typescript
// shared/types/ipc.types.ts

export interface TextDiffAPI {
  // 文件操作
  openFile: (side: 'left' | 'right') => Promise<FileInfo | null>
  readFile: (path: string) => Promise<FileInfo>
  watchFile: (path: string, callback: () => void) => () => void

  // 差异计算
  computeDiff: (left: FileInfo, right: FileInfo, options: DiffOptions) => Promise<DiffResult>
  computeThreeWayDiff: (base: FileInfo, left: FileInfo, right: FileInfo) => Promise<ThreeWayDiffResult>

  // 目录对比
  compareDirectories: (leftDir: string, rightDir: string) => Promise<DirectoryDiffEntry[]>

  // 会话管理
  saveSession: (session: DiffSession) => Promise<void>
  loadSession: (id: string) => Promise<DiffSession>
  listSessions: () => Promise<DiffSession[]>
  deleteSession: (id: string) => Promise<void>

  // 设置
  getSettings: () => Promise<AppSettings>
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>

  // 系统
  showSaveDialog: (options: Electron.SaveDialogOptions) => Promise<string | null>
}
```

---

## 10. API 接口设计（后端服务模式）

> 若部署为 Web 应用（方案 D），提供以下 REST API：

### 基础信息

- **Base URL**：`http://localhost:3456/api/v1`
- **Content-Type**：`application/json`
- **编码**：UTF-8

### 接口列表

#### POST /diff/text — 文本对比

```
请求：
{
  "left": "Hello World\nLine 2",
  "right": "Hello TextDiff\nLine 2\nLine 3",
  "options": {
    "ignoreWhitespace": "leading-trailing",
    "ignoreCase": false,
    "algorithm": "myers"
  }
}

响应：
{
  "data": {
    "lines": [...],
    "chunks": [...],
    "stats": {
      "chunkCount": 2,
      "insertedLines": 2,
      "deletedLines": 1,
      "modifiedLines": 1
    }
  }
}
```

#### POST /diff/files — 服务端文件对比

```
请求：
{
  "leftPath": "/absolute/path/to/file1.txt",
  "rightPath": "/absolute/path/to/file2.txt",
  "options": {}
}
```

#### POST /diff/directories — 目录对比

```
请求：
{
  "leftDir": "/path/to/dir1",
  "rightDir": "/path/to/dir2",
  "filter": { "extensions": [".js", ".ts"], "exclude": ["node_modules"] }
}
```

---

## 11. 部署方案

### 11.1 Linux 桌面应用打包

```bash
# 构建
npm run build

# 打包为 AppImage（推荐，免安装，跨发行版）
npm run dist -- --linux AppImage

# 打包为 .deb（Ubuntu/Debian）
npm run dist -- --linux deb

# 打包为 .rpm（Fedora/CentOS）
npm run dist -- --linux rpm

# 打包为 .tar.gz（通用）
npm run dist -- --linux tar.gz
```

### 11.2 Git 集成配置

```bash
# 配置为 git difftool
git config --global diff.tool textdiff
git config --global difftool.textdiff.cmd 'textdiff "$LOCAL" "$REMOTE"'

# 配置为 git mergetool
git config --global merge.tool textdiff
git config --global mergetool.textdiff.cmd \
  'textdiff --merge "$BASE" "$LOCAL" "$REMOTE" -o "$MERGED"'

# 使用
git difftool HEAD~1 HEAD
git mergetool
```

### 11.3 Web 服务模式（Docker）

```dockerfile
# Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY dist/ ./dist/
EXPOSE 3456
CMD ["node", "dist/server.js"]
```

```bash
docker run -d -p 3456:3456 -v /your/files:/files textdiff:latest
```

---

## 12. 里程碑计划

### Phase 1 — MVP（预计 8 周）

| 周次 | 目标 |
|------|------|
| Week 1-2 | 项目初始化、Electron + React 脚手架、Monaco Editor 集成 |
| Week 3-4 | 差异计算引擎（Myers Diff + 内联 diff）、IPC 层搭建 |
| Week 5-6 | 核心 UI：双栏视图、差异高亮、导航、工具栏 |
| Week 7 | 文件操作（打开/拖拽/粘贴）、编码检测、忽略规则 |
| Week 8 | 会话管理、CLI 接口、Git 集成文档、打包测试 |

**MVP 交付物**：
- Linux AppImage 可执行文件
- 支持 F1、F2（基础）、F3、F5、F6 功能
- 完整的用户手册

### Phase 2 — 增强版（预计 6 周）

| 功能 | 预期完成 |
|------|---------|
| 三路合并视图 | Week 10 |
| 目录对比 | Week 11 |
| 插件系统基础框架 | Week 12 |
| 远程文件 SFTP | Week 13 |
| Web 服务模式 | Week 14 |

---

## 13. 风险评估

| 风险 | 概率 | 影响 | 缓解策略 |
|------|------|------|---------|
| Monaco Editor 大文件性能瓶颈 | 中 | 高 | 虚拟滚动 + Worker Thread 计算 |
| Wayland 兼容性问题 | 中 | 中 | 使用最新 Electron（原生 Wayland 支持），充分测试 |
| Myers Diff 超大文件内存溢出 | 低 | 高 | 文件大小限制警告 + 流式分块处理 |
| Electron 包体积过大（>100MB） | 高 | 低 | 使用 electron-builder 精简，考虑 Tauri 替代方案 |
| 编码检测误判（chardet 准确率） | 中 | 中 | 提供手动编码切换 UI，默认 UTF-8 |

---

## 附录

### A. 参考资料

- [Myers Diff Algorithm 论文](http://www.xmailserver.org/diff2.pdf)
- [Google diff-match-patch 库](https://github.com/google/diff-match-patch)
- [Monaco Editor Diff Editor API](https://microsoft.github.io/monaco-editor/docs.html#functions/editor.createDiffEditor.html)
- [Electron electron-vite 脚手架](https://electron-vite.org/)
- [Beyond Compare 功能参考](https://www.scootersoftware.com/features)

### B. 词汇表

| 术语 | 说明 |
|------|------|
| Diff Chunk / Hunk | 连续变更行组成的差异块 |
| Inline Diff | 行内字符级差异高亮 |
| Three-way Merge | 基于共同祖先的三路合并 |
| Myers Algorithm | O(ND) 差异算法，Git 默认使用 |
| Context Lines | 差异块上下显示的相同行数 |
| Virtual Scrolling | 仅渲染可见区域的滚动优化技术 |

---

*文档维护：技术团队 | 如有疑问请提 Issue*
