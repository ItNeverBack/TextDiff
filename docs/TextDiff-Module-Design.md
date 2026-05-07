# TextDiff 功能模块设计文档

**文档版本**：v2.0  
**创建日期**：2026-04-21  
**更新日期**：2026-04-22  
**技术方案**：方案A - Electron + React + TypeScript

---

## 目录

1. [模块总览](#1-模块总览)
2. [主进程模块（packages/main）](#2-主进程模块packagesmain)
3. [渲染进程模块（packages/renderer）](#3-渲染进程模块packagesrenderer)
4. [共享模块（packages/shared）](#4-共享模块packagesshared)
5. [模块依赖关系](#5-模块依赖关系)
6. [模块接口规范](#6-模块接口规范)
7. [状态管理设计](#7-状态管理设计)
8. [快捷键体系](#8-快捷键体系)

---

## 1. 模块总览

### 1.1 架构分层

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户界面层                                │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │  DiffView    │ │ DirectoryView│ │  MergeView   │  Renderer  │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │  MenuBar     │ │  Toolbar     │ │  StatusBar   │  Renderer  │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │  TabManager  │ │  Minimap     │ │  Dialogs     │  Renderer  │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
├─────────────────────────────────────────────────────────────────┤
│                        状态管理层                                │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ DiffStore    │ │ SessionStore │ │ SettingsStore│  Renderer  │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│  ┌──────────────┐ ┌──────────────┐                             │
│  │ ThemeStore   │ │  TabStore    │                 Renderer    │
│  └──────────────┘ └──────────────┘                             │
├─────────────────────────────────────────────────────────────────┤
│                        IPC 通信层                                │
│  ┌──────────────────────────────────────────────────┐          │
│  │              TextDiffAPI (contextBridge)          │          │
│  └──────────────────────────────────────────────────┘          │
├─────────────────────────────────────────────────────────────────┤
│                        业务逻辑层                                │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ DiffEngine   │ │ FileSystem   │ │ SessionMgr   │  Main      │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
├─────────────────────────────────────────────────────────────────┤
│                        基础设施层                                │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ WorkerPool   │ │ SQLite       │ │ CLI Parser   │  Main      │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 模块清单

| 层级 | 模块名称 | 所属包 | 职责 |
|------|----------|--------|------|
| 用户界面层 | DiffView | renderer | 文本对比双栏/统一视图 |
| 用户界面层 | DirectoryView | renderer | 目录对比树形视图 |
| 用户界面层 | MergeView | renderer | 三路合并视图 |
| 用户界面层 | MenuBar | renderer | 顶部菜单栏组件 |
| 用户界面层 | Toolbar | renderer | 工具栏组件 |
| 用户界面层 | StatusBar | renderer | 状态栏组件 |
| 用户界面层 | TabManager | renderer | 标签页管理 |
| 用户界面层 | Minimap | renderer | 差异缩略图 |
| 用户界面层 | Dialogs | renderer | 对话框组件集合 |
| 用户界面层 | FileDropZone | renderer | 拖拽上传区域 |
| 用户界面层 | WelcomeView | renderer | 欢迎/空状态视图 |
| 状态管理层 | DiffStore | renderer | 对比状态管理 |
| 状态管理层 | SessionStore | renderer | 会话状态管理 |
| 状态管理层 | SettingsStore | renderer | 设置状态管理 |
| 状态管理层 | ThemeStore | renderer | 主题状态管理 |
| 状态管理层 | TabStore | renderer | 标签页状态管理 |
| IPC通信层 | IPCHandler | main | IPC 消息处理 |
| IPC通信层 | TextDiffAPI | shared | API 接口定义 |
| 业务逻辑层 | DiffEngine | main | 差异计算引擎 |
| 业务逻辑层 | FileSystem | main | 文件系统操作 |
| 业务逻辑层 | SessionManager | main | 会话管理器 |
| 业务逻辑层 | IgnoreRuleEngine | main | 忽略规则引擎 |
| 基础设施层 | WorkerPool | main | Worker 线程池 |
| 基础设施层 | Database | main | SQLite 数据库 |
| 基础设施层 | CLI | main | 命令行接口 |
| 基础设施层 | ShortcutManager | main | 快捷键管理 |

---

## 2. 主进程模块

### 2.1 DiffEngine 模块

**路径**：`packages/main/src/diff/`

#### 2.1.1 模块职责

负责文本差异计算，包括行级差异、字符级内联差异、三路合并差异。

#### 2.1.2 子模块划分

```
diff/
├── index.ts              # 模块入口，导出公共 API
├── myers.ts              # Myers 差异算法实现
├── inline.ts             # 字符级内联差异
├── three-way.ts          # 三路合并差异
├── preprocessor.ts       # 文本预处理
├── chunk-builder.ts      # 差异块构建
├── stats-calculator.ts   # 统计信息计算
└── worker/
    ├── index.ts          # Worker 池管理
    ├── diff-worker.ts    # Worker 线程脚本
    └── types.ts          # Worker 通信类型
```

#### 2.1.3 核心接口

```typescript
export interface DiffEngine {
  compute(left: string, right: string, options: DiffOptions): Promise<DiffResult>
  computeInline(leftLine: string, rightLine: string): InlineDiffSegment[]
  computeThreeWay(base: string, left: string, right: string): Promise<ThreeWayDiffResult>
}

export interface DiffResult {
  lines: DiffLine[]
  chunks: DiffChunk[]
  stats: DiffStats
  computedAt: number
}

export interface DiffLine {
  leftLineNo: number | null
  rightLineNo: number | null
  type: DiffLineType
  leftContent: string
  rightContent: string
  inlineDiff?: InlineDiff
}

export type DiffLineType = 'equal' | 'insert' | 'delete' | 'replace'

export interface InlineDiff {
  left: InlineDiffSegment[]
  right: InlineDiffSegment[]
}

export interface InlineDiffSegment {
  text: string
  type: 'equal' | 'insert' | 'delete'
}

export interface DiffChunk {
  id: string
  startIndex: number
  endIndex: number
  type: 'change' | 'insert' | 'delete'
  leftLineRange: [number, number]
  rightLineRange: [number, number]
}

export interface DiffStats {
  totalLines: number
  equalLines: number
  insertedLines: number
  deletedLines: number
  modifiedLines: number
  chunkCount: number
}
```

#### 2.1.4 处理流程

```
┌─────────────────────────────────────────────────────────────────┐
│                        DiffEngine 流程                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │ 输入文本  │───▶│ 预处理器      │───▶│ 行级差异计算  │          │
│  └──────────┘    └──────────────┘    └──────────────┘          │
│                         │                   │                   │
│                         ▼                   ▼                   │
│                  ┌──────────────┐    ┌──────────────┐          │
│                  │ 编码规范化    │    │ Myers 算法   │          │
│                  │ 行尾符规范化  │    │ 输出 DiffOp  │          │
│                  │ 空白符处理    │    └──────────────┘          │
│                  │ 大小写处理    │              │               │
│                  └──────────────┘              ▼               │
│                                        ┌──────────────┐        │
│                                        │ DiffLine 构建 │        │
│                                        └──────────────┘        │
│                                              │                 │
│                                              ▼                 │
│                                        ┌──────────────┐        │
│                                        │ 内联差异计算  │        │
│                                        │ (replace 行) │        │
│                                        └──────────────┘        │
│                                              │                 │
│                                              ▼                 │
│                                        ┌──────────────┐        │
│                                        │ Chunk 构建   │        │
│                                        └──────────────┘        │
│                                              │                 │
│                                              ▼                 │
│                                        ┌──────────────┐        │
│                                        │ 统计计算     │        │
│                                        └──────────────┘        │
│                                              │                 │
│                                              ▼                 │
│                                        ┌──────────────┐        │
│                                        │ DiffResult   │        │
│                                        └──────────────┘        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### 2.1.5 大文件处理

```typescript
const LARGE_FILE_THRESHOLD = 5 * 1024 * 1024

export class DiffWorkerPool {
  private workers: Worker[] = []
  private taskQueue: TaskQueue<DiffTask, DiffResult>
  
  async computeDiff(left: string, right: string, options: DiffOptions): Promise<DiffResult> {
    const totalSize = left.length + right.length
    
    if (totalSize > LARGE_FILE_THRESHOLD) {
      return this.submitToWorker({ left, right, options })
    }
    
    return this.computeSync(left, right, options)
  }
}
```

---

### 2.2 FileSystem 模块

**路径**：`packages/main/src/fs/`

#### 2.2.1 模块职责

负责文件和目录的读取、监听、编码检测等操作。

#### 2.2.2 子模块划分

```
fs/
├── index.ts              # 模块入口
├── reader.ts             # 文件读取器
├── writer.ts             # 文件写入器
├── watcher.ts            # 文件监听器
├── directory.ts          # 目录操作
├── encoding.ts           # 编码检测与转换
└── language.ts           # 语言检测
```

#### 2.2.3 核心接口

```typescript
export interface FileReader {
  read(path: string): Promise<FileInfo>
  readWithEncoding(path: string, encoding: string): Promise<FileInfo>
}

export interface FileInfo {
  path: string | null
  content: string
  encoding: string
  lineEnding: 'lf' | 'crlf' | 'mixed'
  size: number
  mtime: number | null
  language: string
}

export interface FileWatcher {
  watch(path: string, callback: (event: WatchEvent) => void): () => void
}

export interface DirectoryReader {
  read(dir: string, options?: DirectoryReadOptions): Promise<DirectoryEntry[]>
  compare(leftDir: string, rightDir: string, options?: CompareOptions): Promise<DirectoryDiffEntry[]>
}

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

#### 2.2.4 语言检测映射

```typescript
const LANGUAGE_MAP: Record<string, string> = {
  'js': 'javascript',
  'ts': 'typescript',
  'tsx': 'typescript',
  'jsx': 'javascript',
  'json': 'json',
  'yml': 'yaml',
  'yaml': 'yaml',
  'md': 'markdown',
  'html': 'html',
  'css': 'css',
  'py': 'python',
  'go': 'go',
  'rs': 'rust',
  'c': 'c',
  'cpp': 'cpp',
  'h': 'c',
  'java': 'java',
  'xml': 'xml',
  'sql': 'sql',
  'sh': 'shell',
  'bash': 'shell'
}
```

---

### 2.3 SessionManager 模块

**路径**：`packages/main/src/session/`

#### 2.3.1 模块职责

负责对比会话的持久化存储、加载、删除等管理操作。

#### 2.3.2 子模块划分

```
session/
├── index.ts                  # 模块入口
├── session.repository.ts     # 会话仓库
├── recent-files.repository.ts # 最近文件仓库
├── database.ts               # 数据库初始化
└── migrations/
    └── 001_init.sql
```

#### 2.3.3 核心接口

```typescript
export interface SessionRepository {
  save(session: DiffSession): Promise<void>
  load(id: string): Promise<DiffSession | null>
  list(options?: ListOptions): Promise<DiffSession[]>
  delete(id: string): Promise<void>
  update(id: string, updates: Partial<DiffSession>): Promise<void>
}

export interface RecentFilesRepository {
  add(path: string): Promise<void>
  list(limit?: number): Promise<RecentFile[]>
  clear(): Promise<void>
}

export interface RecentFile {
  path: string
  accessedAt: number
}
```

---

### 2.4 IgnoreRuleEngine 模块

**路径**：`packages/main/src/ignore/`

#### 2.4.1 模块职责

管理差异忽略规则，包括空白符、大小写、行尾符、正则表达式等。

#### 2.4.2 子模块划分

```
ignore/
├── index.ts              # 模块入口
├── whitespace.ts         # 空白符处理
├── case.ts               # 大小写处理
├── line-ending.ts        # 行尾符处理
├── pattern.ts            # 正则模式处理
└── preprocessor.ts       # 预处理器组合
```

#### 2.4.3 核心接口

```typescript
export interface IgnoreRuleEngine {
  preprocess(content: string, options: DiffOptions): ProcessedContent
  shouldIgnore(line: string, options: DiffOptions): boolean
}

export type WhitespaceMode = 'none' | 'leading-trailing' | 'all'

export interface DiffOptions {
  ignoreWhitespace: WhitespaceMode
  ignoreCase: boolean
  ignoreLineEndings: boolean
  ignorePatterns: string[]
  algorithm: 'myers' | 'patience' | 'histogram'
  contextLines: number
}
```

---

### 2.5 IPC Handler 模块

**路径**：`packages/main/src/ipc/`

#### 2.5.1 模块职责

处理渲染进程通过 IPC 发送的请求，协调各业务模块完成操作。

#### 2.5.2 子模块划分

```
ipc/
├── index.ts              # IPC 注册入口
├── diff.handler.ts       # 差异计算处理器
├── file.handler.ts       # 文件操作处理器
├── session.handler.ts    # 会话管理处理器
├── settings.handler.ts   # 设置处理器
└── preload.ts            # contextBridge 暴露
```

#### 2.5.3 核心接口

```typescript
export interface TextDiffAPI {
  openFile: (side: 'left' | 'right') => Promise<FileInfo | null>
  readFile: (path: string) => Promise<FileInfo>
  watchFile: (path: string, callback: () => void) => () => void
  computeDiff: (left: FileInfo, right: FileInfo, options: DiffOptions) => Promise<DiffResult>
  computeThreeWayDiff: (base: FileInfo, left: FileInfo, right: FileInfo) => Promise<ThreeWayDiffResult>
  compareDirectories: (leftDir: string, rightDir: string) => Promise<DirectoryDiffEntry[]>
  saveSession: (session: DiffSession) => Promise<void>
  loadSession: (id: string) => Promise<DiffSession>
  listSessions: () => Promise<DiffSession[]>
  deleteSession: (id: string) => Promise<void>
  getSettings: () => Promise<AppSettings>
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>
  showSaveDialog: (options: SaveDialogOptions) => Promise<string | null>
}
```

---

### 2.6 CLI 模块

**路径**：`packages/main/src/cli/`

#### 2.6.1 模块职责

提供命令行接口，支持 GUI 启动、纯文本差异输出、三路合并等功能。

#### 2.6.2 子模块划分

```
cli/
├── index.ts              # CLI 入口
├── commands/
│   ├── diff.ts           # diff 命令
│   ├── merge.ts          # merge 命令
│   └── gui.ts            # gui 命令（默认）
└── output.ts             # 输出格式化
```

#### 2.6.3 命令结构

```bash
textdiff [file1] [file2]           # 启动 GUI 对比
textdiff diff <file1> <file2>      # 输出文本差异到 stdout
textdiff merge <base> <left> <right> -o <output>  # 三路合并

# 选项
--ignore-whitespace <mode>  # none | leading-trailing | all
--ignore-case               # 忽略大小写
--ignore-line-endings       # 忽略行尾符差异
-o, --output <format>       # unified | side-by-side
--auto                      # 自动合并，冲突时失败
```

---

## 3. 渲染进程模块

### 3.1 布局组件模块

**路径**：`packages/renderer/src/components/layout/`

#### 3.1.1 模块职责

提供应用整体布局组件，包括菜单栏、工具栏、状态栏、标签页等。

#### 3.1.2 子模块划分

```
layout/
├── index.ts
├── MenuBar.tsx               # 菜单栏组件
├── MenuDropdown.tsx          # 下拉菜单组件
├── Toolbar.tsx               # 工具栏组件
├── StatusBar.tsx             # 状态栏组件
├── TabBar.tsx                # 标签页栏组件
├── Tab.tsx                   # 单个标签页组件
├── FileDropZone.tsx          # 拖拽上传区域
└── AppShell.tsx              # 应用外壳布局
```

#### 3.1.3 MenuBar 组件设计

```typescript
export interface MenuBarProps {
  onFileOpen: (side: 'left' | 'right' | 'both') => void
  onPasteDialog: () => void
  onSaveSession: () => void
  onSwapFiles: () => void
  onToggleCollapse: () => void
  onViewModeChange: (mode: ViewMode) => void
  onThemeToggle: () => void
  onNewTab: () => void
  onCloseTab: () => void
  onShowSessionList: () => void
  onShowSettings: () => void
  onShowShortcuts: () => void
  onShowAbout: () => void
}

export type ViewMode = 'split' | 'unified' | 'directory'

export interface MenuItem {
  label: string
  shortcut?: string
  onClick?: () => void
  children?: MenuItem[]
  divider?: boolean
}
```

菜单结构：
```
文件(F)  编辑(E)  视图(V)  会话(S)  工具(T)  帮助(H)
├─打开文件对...      Ctrl+O    ├─交换左右文件        ├─双栏对比      Ctrl+1    ├─新建对比      Ctrl+T    ├─忽略规则设置        ├─快捷键
├─打开左侧文件       Ctrl+L    ├─────────────        ├─统一视图      Ctrl+2    ├─关闭当前标签  Ctrl+W    ├─────────────        ├─关于 TextDiff
├─打开右侧文件       Ctrl+R    ├─折叠相同区域        ├─目录对比      Ctrl+3    ├─────────────        ├─首选项        Ctrl+,
├─────────────                 Ctrl+Shift+C        ├─────────────        ├─会话历史
├─粘贴文本对比       Ctrl+Shift+V                    ├─切换主题      Ctrl+Shift+T
├─────────────
├─保存会话          Ctrl+S
```

#### 3.1.4 Toolbar 组件设计

```typescript
export interface ToolbarProps {
  onOpenFile: (side: 'left' | 'right') => void
  ignoreOptions: IgnoreOptions
  onIgnoreChange: (options: Partial<IgnoreOptions>) => void
  onShowIgnorePanel: () => void
  diffNavigation: DiffNavigationState
  onNavigate: (direction: 'first' | 'prev' | 'next' | 'last') => void
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  onToggleCollapse: () => void
  searchVisible: boolean
  onToggleSearch: () => void
  onSearch: (query: string) => void
}

export interface IgnoreOptions {
  whitespace: boolean
  case: boolean
  lineEnding: boolean
}

export interface DiffNavigationState {
  current: number
  total: number
}
```

工具栏分区：
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [左侧文件] [右侧文件] │ 忽略: [空白符] [大小写] [行尾符] [更多] │            │
│                      │ < 1/12处差异 > │ [双栏] [统一] [目录] │ [折叠] │ [搜索] │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 3.1.5 StatusBar 组件设计

```typescript
export interface StatusBarProps {
  stats: DiffStats | null
  isComputing: boolean
  algorithm: string
  computeTime: number
  cursorPosition: { line: number; column: number }
}

export interface DiffStats {
  chunkCount: number
  insertedLines: number
  deletedLines: number
  modifiedLines: number
}
```

状态栏布局：
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 差异 [12块] [+8行] [-4行] [~4行]  │  正在计算差异...  │  算法: Myers │ 耗时: 12ms │ 行 1, 列 1 │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 3.1.6 TabBar 组件设计

```typescript
export interface TabBarProps {
  tabs: TabInfo[]
  activeIndex: number
  onTabSelect: (index: number) => void
  onTabClose: (index: number) => void
  onNewTab: () => void
}

export interface TabInfo {
  id: string
  title: string
  diffCount: number
  hasChanges: boolean
}
```

---

### 3.2 DiffView 模块

**路径**：`packages/renderer/src/features/diff-view/`

#### 3.2.1 模块职责

提供文本对比的双栏/单栏视图，包括差异高亮、导航、同步滚动等功能。

#### 3.2.2 子模块划分

```
diff-view/
├── index.ts
├── components/
│   ├── SplitDiffView.tsx       # 双栏对比视图
│   ├── UnifiedDiffView.tsx     # 统一视图
│   ├── DiffEditorPane.tsx      # 单侧编辑器面板
│   ├── DiffLine.tsx            # 差异行组件
│   ├── FileInfoBar.tsx         # 文件信息栏
│   ├── DiffNavigator.tsx       # 差异导航组件
│   ├── DiffStats.tsx           # 差异统计显示
│   ├── FoldedLine.tsx          # 折叠行组件
│   └── InlineDiff.tsx          # 行内差异高亮
├── components/
│   ├── Minimap.tsx             # 差异缩略图
│   └── MinimapCanvas.tsx       # Canvas 渲染
├── hooks/
│   ├── useDiff.ts              # 差异计算 hook
│   ├── useSyncScroll.ts        # 同步滚动 hook
│   ├── useDiffNavigation.ts    # 差异导航 hook
│   └── useMinimap.ts           # 缩略图 hook
└── stores/
    └── diff.store.ts           # 差异状态
```

#### 3.2.3 核心接口

```typescript
export interface SplitDiffViewProps {
  leftFile: FileInfo
  rightFile: FileInfo
  diffResult: DiffResult
  options: DiffEditorOptions
  onLeftChange?: (content: string) => void
  onRightChange?: (content: string) => void
  onChunkSelect?: (chunkIndex: number) => void
  activeChunkIndex: number
  isCollapsed: boolean
}

export interface DiffEditorOptions {
  readOnly: boolean
  renderSideBySide: boolean
  ignoreTrimWhitespace: boolean
  foldUnchanged: boolean
  showInvisibleCharacters: boolean
}

export interface FileInfoBarProps {
  leftFile: FileInfo
  rightFile: FileInfo
  onSwap: () => void
}

export interface DiffLineProps {
  line: DiffLine
  side: 'left' | 'right'
  isActive: boolean
  showInlineDiff: boolean
}
```

#### 3.2.4 组件结构

```
┌─────────────────────────────────────────────────────────────────┐
│                         SplitDiffView                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                      FileInfoBar                         │   │
│  │  ┌─────────────────────┐ ┌─────────────────────┐       │   │
│  │  │ 左侧文件信息          │ [⇄] │ 右侧文件信息          │       │   │
│  │  │ 路径 / 编码 / 行数    │     │ 路径 / 编码 / 行数    │       │   │
│  │  └─────────────────────┘ └─────────────────────┘       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌────────────────────┬──────────┬────────────────────┐        │
│  │  DiffEditorPane    │ Minimap  │  DiffEditorPane    │        │
│  │  ┌──────────────┐  │  Canvas  │  ┌──────────────┐  │        │
│  │  │ DiffLine     │  │          │  │ DiffLine     │  │        │
│  │  │ DiffLine     │  │  ████    │  │ DiffLine     │  │        │
│  │  │ FoldedLine   │  │  ████    │  │ FoldedLine   │  │        │
│  │  │ DiffLine     │  │  ████    │  │ DiffLine     │  │        │
│  │  │ (active)     │  │  ████    │  │ (active)     │  │        │
│  │  └──────────────┘  │          │  └──────────────┘  │        │
│  │  同步滚动 ◀────────┼──────────┼───────────────▶ 同步滚动    │
│  └────────────────────┴──────────┴────────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

#### 3.2.5 Minimap 组件设计

```typescript
export interface MinimapProps {
  lines: DiffLine[]
  height?: number
  scrollPosition?: number
  viewportHeight?: number
  onScrollTo?: (ratio: number) => void
}

export const LINE_COLORS = {
  light: {
    equal: '#e9ecef',
    insert: '#acf2bd',
    delete: '#fdb8c0',
    replace: '#ffdf5d'
  },
  dark: {
    equal: '#333333',
    insert: '#2ea043',
    delete: '#f85149',
    replace: '#d4a017'
  }
}
```

---

### 3.3 DirectoryView 模块

**路径**：`packages/renderer/src/features/directory/`

#### 3.3.1 模块职责

提供目录对比的树形视图，展示两个目录之间的文件差异。

#### 3.3.2 子模块划分

```
directory/
├── index.ts
├── components/
│   ├── DirectoryView.tsx       # 目录视图容器
│   ├── DirectoryHeader.tsx     # 目录路径头部
│   ├── DirectoryLegend.tsx     # 状态图例
│   ├── DirectoryTree.tsx       # 目录树组件
│   ├── TreeNode.tsx            # 树节点组件
│   └── TreeNodeStatus.tsx      # 节点状态标签
├── hooks/
│   ├── useDirectoryCompare.ts  # 目录对比 hook
│   └── useTreeExpand.ts        # 树展开 hook
└── stores/
    └── directory.store.ts      # 目录状态
```

#### 3.3.3 核心接口

```typescript
export interface DirectoryViewProps {
  leftDir: string
  rightDir: string
  entries: DirectoryDiffEntry[]
  onFileSelect: (entry: DirectoryDiffEntry) => void
}

export interface TreeNodeProps {
  node: DirectoryDiffEntry
  depth: number
  expanded: boolean
  selected: boolean
  onToggleExpand: () => void
  onSelect: () => void
}

export interface DirectoryLegendProps {
  showEqual?: boolean
  showModified?: boolean
  showLeftOnly?: boolean
  showRightOnly?: boolean
}
```

#### 3.3.4 组件结构

```
┌─────────────────────────────────────────────────────────────────┐
│                       DirectoryView                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    DirectoryHeader                       │   │
│  │  📁 /home/user/project-v1                               │   │
│  │  📁 /home/user/project-v2                               │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   DirectoryLegend                        │   │
│  │  ● 相同  ● 修改  ● 左侧独有  ● 右侧独有                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    DirectoryTree                         │   │
│  │  ▼ 📁 src                              [修改]            │   │
│  │    ▶ 📁 components                                       │   │
│  │    ▶ 📁 hooks                         [右侧独有]         │   │
│  │    ▼ 📁 utils                           [修改]           │   │
│  │        📄 helpers.ts                     [修改]          │   │
│  │        📄 constants.ts                                   │   │
│  │        📄 validators.ts                [左侧独有]        │   │
│  │    📄 App.tsx                           [修改]           │   │
│  │  ▶ 📁 public                                             │   │
│  │  📄 package.json                        [修改]           │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

### 3.4 MergeView 模块

**路径**：`packages/renderer/src/features/merge/`

#### 3.4.1 模块职责

提供三路合并视图，帮助用户解决合并冲突。

#### 3.4.2 子模块划分

```
merge/
├── index.ts
├── components/
│   ├── MergeView.tsx           # 合并视图容器
│   ├── MergeEditor.tsx         # 三栏合并编辑器
│   ├── MergePane.tsx           # 单侧合并面板
│   ├── ConflictBlock.tsx       # 冲突块组件
│   ├── MergeToolbar.tsx        # 合并工具栏
│   └── ResultPreview.tsx       # 结果预览
├── hooks/
│   ├── useMerge.ts             # 合并操作 hook
│   └── useConflictResolution.ts # 冲突解决 hook
└── stores/
    └── merge.store.ts          # 合并状态
```

#### 3.4.3 核心接口

```typescript
export interface MergeViewProps {
  baseFile: FileInfo
  leftFile: FileInfo
  rightFile: FileInfo
  mergeResult: ThreeWayDiffResult
  onResolve: (conflictId: string, resolution: Resolution) => void
  onSave: (content: string) => void
}

export type Resolution = 
  | { type: 'base' }
  | { type: 'left' }
  | { type: 'right' }
  | { type: 'manual'; content: string }

export interface ConflictBlockProps {
  conflict: ConflictRegion
  onResolve: (resolution: Resolution) => void
}
```

---

### 3.5 Dialog 模块

**路径**：`packages/renderer/src/components/dialogs/`

#### 3.5.1 模块职责

提供各类对话框组件。

#### 3.5.2 子模块划分

```
dialogs/
├── index.ts
├── PasteDialog.tsx             # 粘贴文本对话框
├── IgnorePanel.tsx             # 忽略规则面板
├── SessionListDialog.tsx       # 会话历史对话框
├── SettingsDialog.tsx          # 设置对话框
├── ShortcutsDialog.tsx         # 快捷键帮助对话框
└── AboutDialog.tsx             # 关于对话框
```

#### 3.5.3 核心接口

```typescript
export interface PasteDialogProps {
  open: boolean
  onClose: () => void
  onCompare: (leftText: string, rightText: string) => void
}

export interface IgnorePanelProps {
  open: boolean
  onClose: () => void
  options: DiffOptions
  onApply: (options: Partial<DiffOptions>) => void
  onReset: () => void
}

export interface SettingsDialogProps {
  open: boolean
  onClose: () => void
  settings: AppSettings
  onSave: (settings: Partial<AppSettings>) => void
}
```

#### 3.5.4 IgnorePanel 组件结构

```
┌─────────────────────────────────────────────────────────────────┐
│                     差异忽略规则                           [×]  │
├─────────────────────────────────────────────────────────────────┤
│  空白符处理                                                     │
│  ○ 不忽略                                                       │
│  ● 忽略首尾空白                                                 │
│  ○ 忽略全部空白                                                 │
│                                                                 │
│  其他选项                                                       │
│  □ 忽略大小写差异                                               │
│  ☑ 忽略行尾符差异（CRLF vs LF）                                │
│  □ 忽略注释行                                                   │
│                                                                 │
│  自定义正则忽略规则                                             │
│  ┌─────────────────────────────────────────┐ [×]              │
│  │ ^\s*#.*$                                │                  │
│  └─────────────────────────────────────────┘                  │
│  [+ 添加规则]                                                   │
│                                                                 │
│  差异算法                                                       │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐                │
│  │   Myers    │ │  Patience  │ │ Histogram  │                │
│  │ 默认/Git同款│ │ 更清晰的上下文│ │ 改进型Patience│            │
│  └────────────┘ └────────────┘ └────────────┘                │
├─────────────────────────────────────────────────────────────────┤
│                                    [重置]  [应用]               │
└─────────────────────────────────────────────────────────────────┘
```

---

### 3.6 WelcomeView 模块

**路径**：`packages/renderer/src/components/welcome/`

#### 3.6.1 模块职责

提供欢迎/空状态视图，支持拖拽上传和最近会话列表。

#### 3.6.2 子模块划分

```
welcome/
├── index.ts
├── WelcomeView.tsx             # 欢迎视图容器
├── WelcomeActions.tsx          # 操作按钮
├── RecentSessions.tsx          # 最近会话列表
└── SessionItem.tsx             # 会话项组件
```

#### 3.6.3 核心接口

```typescript
export interface WelcomeViewProps {
  onOpenFiles: () => void
  onPasteText: () => void
  recentSessions: RecentSession[]
  onSessionSelect: (id: string) => void
}

export interface RecentSession {
  id: string
  name: string
  accessedAt: string
}
```

---

### 3.7 Theme 模块

**路径**：`packages/renderer/src/features/theme/`

#### 3.7.1 模块职责

管理应用主题（亮色/暗色），提供主题切换和持久化。

#### 3.7.2 子模块划分

```
theme/
├── index.ts
├── ThemeProvider.tsx           # 主题提供者
├── useTheme.ts                 # 主题 hook
├── colors.ts                   # 颜色定义
└── stores/
    └── theme.store.ts          # 主题状态
```

#### 3.7.3 核心接口

```typescript
export type Theme = 'light' | 'dark' | 'system'

export interface ThemeColors {
  bg: {
    app: string
    surface: string
    elevated: string
    hover: string
    active: string
  }
  text: {
    primary: string
    secondary: string
    muted: string
    inverse: string
  }
  diff: {
    addedBg: string
    addedLine: string
    addedText: string
    deletedBg: string
    deletedLine: string
    deletedText: string
    modifiedBg: string
    modifiedLine: string
    modifiedText: string
    conflictBg: string
    conflictLine: string
  }
  accent: {
    primary: string
    primaryHover: string
    primaryLight: string
  }
  border: string
  borderLight: string
}

export const LIGHT_COLORS: ThemeColors = {
  diff: {
    addedBg: '#e6ffed',
    addedLine: '#acf2bd',
    addedText: '#22863a',
    deletedBg: '#ffeef0',
    deletedLine: '#fdb8c0',
    deletedText: '#cb2431',
    modifiedBg: '#fff5b1',
    modifiedLine: '#ffdf5d',
    modifiedText: '#b08800',
    conflictBg: '#fff3cd',
    conflictLine: '#ffc107'
  }
}

export const DARK_COLORS: ThemeColors = {
  diff: {
    addedBg: '#1a3a2a',
    addedLine: '#2ea043',
    addedText: '#56d364',
    deletedBg: '#3d1a1a',
    deletedLine: '#f85149',
    deletedText: '#f97583',
    modifiedBg: '#3d3510',
    modifiedLine: '#d4a017',
    modifiedText: '#e3b341',
    conflictBg: '#3d2e00',
    conflictLine: '#e3b341'
  }
}
```

---

### 3.8 Shortcut 模块

**路径**：`packages/renderer/src/features/shortcuts/`

#### 3.8.1 模块职责

管理应用快捷键，提供快捷键注册、冲突检测、帮助显示。

#### 3.8.2 子模块划分

```
shortcuts/
├── index.ts
├── ShortcutProvider.tsx        # 快捷键提供者
├── useShortcuts.ts             # 快捷键 hook
├── shortcuts.ts                # 快捷键定义
└── components/
    └── ShortcutsHelp.tsx       # 快捷键帮助
```

#### 3.8.3 快捷键映射

```typescript
export const SHORTCUTS: ShortcutDefinition[] = [
  { key: 'Ctrl+O', action: 'openFilePair', description: '打开文件对' },
  { key: 'Ctrl+L', action: 'openLeftFile', description: '打开左侧文件' },
  { key: 'Ctrl+R', action: 'openRightFile', description: '打开右侧文件' },
  { key: 'Ctrl+S', action: 'saveSession', description: '保存会话' },
  { key: 'Ctrl+T', action: 'newTab', description: '新建对比标签' },
  { key: 'Ctrl+W', action: 'closeTab', description: '关闭当前标签' },
  { key: 'Ctrl+F', action: 'search', description: '搜索' },
  { key: 'Ctrl+1', action: 'viewSplit', description: '双栏视图' },
  { key: 'Ctrl+2', action: 'viewUnified', description: '统一视图' },
  { key: 'Ctrl+3', action: 'viewDirectory', description: '目录视图' },
  { key: 'Ctrl+Shift+C', action: 'toggleCollapse', description: '折叠相同区域' },
  { key: 'Ctrl+Shift+T', action: 'toggleTheme', description: '切换主题' },
  { key: 'Ctrl+Shift+V', action: 'pasteText', description: '粘贴文本对比' },
  { key: 'Ctrl+,', action: 'openSettings', description: '首选项' },
  { key: 'F7', action: 'nextDiff', description: '下一处差异' },
  { key: 'F6', action: 'prevDiff', description: '上一处差异' },
  { key: 'Alt+↓', action: 'nextDiff', description: '下一处差异' },
  { key: 'Alt+↑', action: 'prevDiff', description: '上一处差异' },
  { key: 'Alt+Home', action: 'firstDiff', description: '第一处差异' },
  { key: 'Alt+End', action: 'lastDiff', description: '最后一处差异' },
  { key: 'Escape', action: 'closeOverlay', description: '关闭浮层/搜索' }
]
```

---

## 4. 共享模块

### 4.1 模块职责

定义主进程和渲染进程共享的类型、常量、工具函数。

### 4.2 子模块划分

```
shared/
├── types/
│   ├── diff.types.ts           # 差异相关类型
│   ├── file.types.ts           # 文件相关类型
│   ├── session.types.ts        # 会话相关类型
│   ├── ipc.types.ts            # IPC 通信类型
│   ├── settings.types.ts       # 设置相关类型
│   └── error.types.ts          # 错误类型
├── constants/
│   ├── diff.ts                 # 差异常量
│   ├── encoding.ts             # 编码常量
│   ├── keybindings.ts          # 快捷键常量
│   └── languages.ts            # 语言映射
└── utils/
    ├── id.ts                   # ID 生成
    ├── format.ts               # 格式化工具
    └── escape.ts               # HTML 转义
```

### 4.3 核心类型定义

```typescript
export type DiffLineType = 'equal' | 'insert' | 'delete' | 'replace'

export type ViewMode = 'split' | 'unified' | 'directory'

export type WhitespaceMode = 'none' | 'leading-trailing' | 'all'

export type Theme = 'light' | 'dark' | 'system'

export interface AppSettings {
  theme: Theme
  language: 'zh-CN' | 'en-US'
  diff: DiffSettings
  editor: EditorSettings
  keyBindings: KeyBindingMap
}

export interface DiffSettings {
  defaultIgnoreWhitespace: WhitespaceMode
  defaultIgnoreCase: boolean
  defaultIgnoreLineEndings: boolean
  defaultAlgorithm: 'myers' | 'patience' | 'histogram'
  contextLines: number
  foldUnchanged: boolean
}

export interface EditorSettings {
  fontSize: number
  fontFamily: string
  tabSize: number
  showInvisibleCharacters: boolean
}
```

---

## 5. 模块依赖关系

### 5.1 主进程依赖图

```
┌─────────────────────────────────────────────────────────────────┐
│                           CLI Layer                              │
│                          (cli/index.ts)                          │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                          IPC Layer                               │
│                    (ipc/*.handler.ts)                            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ DiffHandler  │ │ FileHandler  │ │SessionHandler│            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Business Layer                            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ DiffEngine   │ │ FileSystem   │ │SessionManager│            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│         │                │                                      │
│         ▼                ▼                                      │
│  ┌──────────────┐ ┌──────────────┐                             │
│  │IgnoreEngine  │ │ Encoding     │                             │
│  └──────────────┘ └──────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Infrastructure Layer                        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ WorkerPool   │ │ SQLite       │ │ chokidar     │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 渲染进程依赖图

```
┌─────────────────────────────────────────────────────────────────┐
│                         Feature Layer                            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ DiffView     │ │DirectoryView │ │ MergeView    │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│  ┌──────────────┐ ┌──────────────┐                             │
│  │ WelcomeView  │ │ Dialogs      │                             │
│  └──────────────┘ └──────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Store Layer                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ DiffStore    │ │SessionStore  │ │SettingsStore │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│  ┌──────────────┐ ┌──────────────┐                             │
│  │ ThemeStore   │ │  TabStore    │                             │
│  └──────────────┘ └──────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Hook Layer                               │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ useDiff      │ │useSession    │ │useSettings   │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│                         │                                       │
│                         ▼                                       │
│                  ┌──────────────┐                               │
│                  │ window.api   │  (IPC Bridge)                 │
│                  └──────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Component Layer                            │
│  ┌──────────────────────────────────────────────────────┐      │
│  │ Monaco Editor, Radix UI, Tailwind CSS                │      │
│  └──────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. 模块接口规范

### 6.1 错误处理规范

```typescript
export type ErrorCode = 
  | 'FILE_NOT_FOUND'
  | 'FILE_READ_ERROR'
  | 'ENCODING_DETECTION_FAILED'
  | 'DIFF_COMPUTATION_ERROR'
  | 'SESSION_NOT_FOUND'
  | 'SESSION_SAVE_ERROR'
  | 'INVALID_OPTIONS'
  | 'WORKER_ERROR'

export interface AppError {
  code: ErrorCode
  message: string
  details?: unknown
}
```

### 6.2 日志规范

```typescript
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export class Logger {
  constructor(module: string)
  debug(message: string, data?: unknown): void
  info(message: string, data?: unknown): void
  warn(message: string, data?: unknown): void
  error(message: string, error?: Error): void
}
```

### 6.3 测试规范

```
模块目录/
├── src/
│   └── *.ts
└── __tests__/
    ├── *.unit.test.ts      # 单元测试
    └── *.integration.test.ts # 集成测试
```

测试覆盖率要求：
- 业务逻辑层：≥ 80%
- 工具函数：≥ 90%
- UI 组件：≥ 60%（关键交互）

---

## 7. 状态管理设计

### 7.1 Store 结构

```typescript
export interface RootStore {
  diff: DiffStore
  session: SessionStore
  settings: SettingsStore
  theme: ThemeStore
  tabs: TabStore
}

export interface DiffStore {
  leftFile: FileInfo | null
  rightFile: FileInfo | null
  diffResult: DiffResult | null
  options: DiffOptions
  viewMode: ViewMode
  isComputing: boolean
  activeChunkIndex: number
  isCollapsed: boolean
  scrollSyncEnabled: boolean
}

export interface TabStore {
  tabs: TabInfo[]
  activeIndex: number
}

export interface ThemeStore {
  theme: Theme
  systemTheme: 'light' | 'dark'
}
```

### 7.2 Store Actions

```typescript
export interface DiffActions {
  setLeftFile: (file: FileInfo) => void
  setRightFile: (file: FileInfo) => void
  setOptions: (options: Partial<DiffOptions>) => void
  setViewMode: (mode: ViewMode) => void
  computeDiff: () => Promise<void>
  navigateToChunk: (index: number) => void
  nextChunk: () => void
  prevChunk: () => void
  firstChunk: () => void
  lastChunk: () => void
  toggleCollapse: () => void
  swapFiles: () => void
}

export interface TabActions {
  addTab: () => void
  closeTab: (index: number) => void
  selectTab: (index: number) => void
  updateTabTitle: (index: number, title: string) => void
}
```

---

## 8. 快捷键体系

### 8.1 快捷键分类

| 分类 | 快捷键 | 功能 |
|------|--------|------|
| 文件操作 | Ctrl+O | 打开文件对 |
| | Ctrl+L | 打开左侧文件 |
| | Ctrl+R | 打开右侧文件 |
| | Ctrl+S | 保存会话 |
| | Ctrl+Shift+V | 粘贴文本对比 |
| 标签页管理 | Ctrl+T | 新建对比标签 |
| | Ctrl+W | 关闭当前标签 |
| 视图切换 | Ctrl+1 | 双栏视图 |
| | Ctrl+2 | 统一视图 |
| | Ctrl+3 | 目录视图 |
| | Ctrl+Shift+V | 切换统一/双栏视图 |
| 差异导航 | F7 / Alt+↓ | 下一处差异 |
| | F6 / Alt+↑ | 上一处差异 |
| | Alt+Home | 第一处差异 |
| | Alt+End | 最后一处差异 |
| 其他 | Ctrl+F | 搜索 |
| | Ctrl+Shift+C | 折叠相同区域 |
| | Ctrl+Shift+T | 切换主题 |
| | Ctrl+, | 首选项 |
| | Escape | 关闭浮层/搜索 |

### 8.2 快捷键处理流程

```
┌─────────────────────────────────────────────────────────────────┐
│                    Keyboard Event                                │
│                         │                                        │
│                         ▼                                        │
│                  ┌──────────────┐                                │
│                  │ Event Filter │                                │
│                  │ (modifiers)  │                                │
│                  └──────────────┘                                │
│                         │                                        │
│                         ▼                                        │
│                  ┌──────────────┐                                │
│                  │ Shortcut Map │                                │
│                  │   Lookup     │                                │
│                  └──────────────┘                                │
│                         │                                        │
│            ┌────────────┼────────────┐                          │
│            ▼            ▼            ▼                          │
│     ┌───────────┐ ┌───────────┐ ┌───────────┐                  │
│     │  Global   │ │   Tab     │ │  Dialog   │                  │
│     │  Handler  │ │  Handler  │ │  Handler  │                  │
│     └───────────┘ └───────────┘ └───────────┘                  │
│            │            │            │                          │
│            └────────────┼────────────┘                          │
│                         ▼                                        │
│                  ┌──────────────┐                                │
│                  │   Action     │                                │
│                  │  Execution   │                                │
│                  └──────────────┘                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 附录

### A. 模块开发优先级

| 优先级 | 模块 | 阶段 | 说明 |
|--------|------|------|------|
| P0 | shared/types | Phase 1 | 类型定义是其他模块基础 |
| P0 | DiffEngine | Phase 1 | 核心功能 |
| P0 | FileSystem | Phase 1 | 文件操作基础 |
| P0 | IPC Handler | Phase 1 | 通信基础 |
| P0 | DiffView | Phase 1 | 核心UI |
| P0 | MenuBar/Toolbar/StatusBar | Phase 1 | 基础布局 |
| P0 | TabManager | Phase 1 | 标签页管理 |
| P1 | CLI | Phase 1 | 命令行支持 |
| P1 | Session | Phase 1 | 会话管理 |
| P1 | IgnoreRuleEngine | Phase 1 | 忽略规则 |
| P1 | Theme | Phase 1 | 主题管理 |
| P1 | Shortcuts | Phase 1 | 快捷键 |
| P2 | DirectoryView | Phase 2 | 目录对比 |
| P2 | MergeView | Phase 2 | 三路合并 |
| P2 | Settings | Phase 1 | 应用设置 |
| P2 | Minimap | Phase 1 | 差异缩略图 |

### B. 技术栈依赖版本

```json
{
  "dependencies": {
    "electron": "^30.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "typescript": "^5.4.0",
    "monaco-editor": "^0.45.0",
    "zustand": "^4.5.0",
    "@tanstack/react-query": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "@radix-ui/react-dialog": "^1.0.0",
    "@radix-ui/react-dropdown-menu": "^2.0.0",
    "diff-match-patch": "^1.0.5",
    "chardet": "^2.0.0",
    "iconv-lite": "^0.6.3",
    "chokidar": "^3.6.0",
    "better-sqlite3": "^9.4.0",
    "commander": "^12.0.0"
  },
  "devDependencies": {
    "electron-vite": "^2.0.0",
    "electron-builder": "^24.0.0",
    "vite": "^5.0.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "vitest": "^1.0.0",
    "playwright": "^1.40.0"
  }
}
```

### C. UI 设计规范参考

基于 prototype 的 CSS 变量体系：

```css
:root {
  --font-sans: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'Geist Mono', 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  
  --radius-xs: 3px;
  --radius-sm: 5px;
  --radius-md: 8px;
  --radius-lg: 12px;
  
  --transition-fast: 0.1s ease;
  --transition-normal: 0.2s ease;
}

[data-theme="light"] {
  --bg-app: #f8f9fa;
  --bg-surface: #ffffff;
  --diff-added-bg: #e6ffed;
  --diff-deleted-bg: #ffeef0;
  --diff-modified-bg: #fff5b1;
}

[data-theme="dark"] {
  --bg-app: #1a1a1a;
  --bg-surface: #242424;
  --diff-added-bg: #1a3a2a;
  --diff-deleted-bg: #3d1a1a;
  --diff-modified-bg: #3d3510;
}
```

---

*文档维护：技术团队 | 如有疑问请提 Issue*
