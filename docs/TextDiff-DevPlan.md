# TextDiff 开发计划

**文档版本**：v1.0
**创建日期**：2026-04-22
**基于**：TextDiff-PRD v1.0、TextDiff-Module-Design v2.0、前端原型

---

## 目录

1. [总体规划](#1-总体规划)
2. [Phase 1 — MVP（8 周）](#2-phase-1--mvp8-周)
3. [Phase 2 — 增强版（6 周）](#3-phase-2--增强版6-周)
4. [任务依赖图](#4-任务依赖图)
5. [测试策略](#5-测试策略)
6. [验收标准](#6-验收标准)

---

## 1. 总体规划

### 1.1 阶段划分

| 阶段 | 时间 | 目标 |
|------|------|------|
| Phase 1 — MVP | Week 1-8 | 可用的文本对比桌面应用，核心功能完备 |
| Phase 2 — 增强 | Week 9-14 | 三路合并、目录对比、CLI 完整化、打包发布 |

### 1.2 人力假设

- 前端工程师 1 人（React + Electron）
- 后端/全栈工程师 1 人（Node.js 主进程 + Diff 引擎）
- 如单人开发，按串联执行，总周期约 16-20 周

### 1.3 技术栈确认

| 类别 | 技术 | 版本 |
|------|------|------|
| 构建工具 | electron-vite | ^2.0.0 |
| 桌面框架 | Electron | ^30.0.0 |
| 前端框架 | React | ^18.2.0 |
| 类型系统 | TypeScript | ^5.4.0 |
| 编辑器 | Monaco Editor | ^0.45.0 |
| 状态管理 | Zustand | ^4.5.0 |
| 异步状态 | TanStack React Query | ^5.0.0 |
| 样式 | Tailwind CSS | ^3.4.0 |
| UI 组件 | Radix UI | ^1.0.0 |
| Diff 算法 | diff-match-patch | ^1.0.5 |
| 编码检测 | chardet | ^2.0.0 |
| 编码转换 | iconv-lite | ^0.6.3 |
| 文件监听 | chokidar | ^3.6.0 |
| 数据库 | better-sqlite3 | ^9.4.0 |
| CLI | commander | ^12.0.0 |
| 打包 | electron-builder | ^24.0.0 |
| 单元测试 | Vitest | ^1.0.0 |
| E2E 测试 | Playwright | ^1.40.0 |

---

## 2. Phase 1 — MVP（8 周）

### Week 1：项目脚手架 + 共享类型 + 基础布局

**目标**：搭建 Monorepo 工程结构，electron-vite 可启动，共享类型定义完成，App Shell 布局可用。

#### 2.1.1 工程初始化

- [x] 使用 `electron-vite` 初始化项目，配置 Monorepo 结构
  - `packages/main/` — Electron 主进程
  - `packages/renderer/` — React 渲染进程
  - `packages/shared/` — 共享类型
- [x] 配置 TypeScript（三套 tsconfig：main / renderer / shared）
- [x] 配置 Tailwind CSS，移植原型 `styles.css` 的 CSS 变量体系
- [x] 配置 Vitest 单元测试框架
- [x] 配置 ESLint + Prettier
- [x] 验证 `npm run dev` 可正常启动 Electron 窗口

#### 2.1.2 共享类型定义 (`packages/shared/`)

- [x] `types/diff.types.ts` — DiffLine、DiffChunk、DiffResult、DiffStats、InlineDiffSegment
- [x] `types/file.types.ts` — FileInfo、DirectoryDiffEntry、DirectoryReadOptions
- [x] `types/session.types.ts` — DiffSession、RecentFile
- [x] `types/ipc.types.ts` — TextDiffAPI 接口定义
- [x] `types/settings.types.ts` — AppSettings、DiffSettings、EditorSettings
- [x] `types/error.types.ts` — ErrorCode、AppError
- [x] `constants/diff.ts` — LARGE_FILE_THRESHOLD 等常量
- [x] `constants/languages.ts` — 语言检测映射表
- [x] `constants/keybindings.ts` — 快捷键定义
- [x] `utils/id.ts` — ID 生成
- [x] `utils/format.ts` — 格式化工具
- [x] `utils/escape.ts` — HTML 转义

**参考**：模块设计文档 §4 共享模块、§6.1 错误处理规范

#### 2.1.3 App Shell 布局 (`packages/renderer/`)

- [x] `ThemeProvider.tsx` — 主题切换（亮色/暗色），CSS 变量方案移植自原型
- [x] `AppShell.tsx` — 应用外壳，Flexbox 纵向布局（菜单栏 → 工具栏 → 标签页 → 内容区 → 状态栏）
- [x] `MenuBar.tsx` — 菜单栏组件（文件/编辑/视图/会话/工具/帮助），带下拉菜单
- [x] `StatusBar.tsx` — 状态栏组件
- [x] `TabBar.tsx` — 标签页栏（可复用 Radix Tabs）
- [x] 基础 Store 创建：ThemeStore（Zustand）

**参考**：原型 `index.html` 中菜单栏、工具栏、状态栏结构；模块设计文档 §3.1 布局组件

**交付物**：可启动的 Electron 窗口，显示菜单栏 + 工具栏（空壳） + 标签页 + 状态栏，支持主题切换。

---

### Week 2：DiffEngine 核心 + IPC 通信层

**目标**：差异计算引擎可用，IPC 通信管道打通，主进程与渲染进程可通信。

#### 2.2.1 DiffEngine (`packages/main/src/diff/`)

- [x] `preprocessor.ts` — 文本预处理（编码规范化、行尾符处理、空白符处理、大小写处理）
- [x] `myers.ts` — Myers 差异算法核心实现
  - 输入：左侧行数组、右侧行数组
  - 输出：DiffOp[]（edit script）
  - 参考：原型 `main.js` 中 `computeDiff` 和 `computeLCS` 的逻辑
- [x] `inline.ts` — 字符级内联差异
  - 对 replace 行使用 diff-match-patch 或 LCS 做字符级 diff
  - 输出：InlineDiffSegment[]
  - 参考：原型 `main.js` 中 `computeInlineDiff`
- [x] `chunk-builder.ts` — 将连续变更行分组为 DiffChunk[]
- [x] `stats-calculator.ts` — 统计信息计算（总行数、增/删/改/相同行数、chunk 数）
- [x] `index.ts` — DiffEngine 模块入口，编排处理流程
  - preprocess → myers → DiffLine[] → inline diff → chunks → stats → DiffResult

**参考**：模块设计文档 §2.1 DiffEngine、§2.1.4 处理流程

#### 2.2.2 IPC 通信层 (`packages/main/src/ipc/`)

- [x] `preload.ts` — contextBridge 暴露 `window.api`（TextDiffAPI 接口）
- [x] `diff.handler.ts` — 注册 `computeDiff` IPC handler
- [x] `index.ts` — IPC 注册入口

**参考**：模块设计文档 §2.5 IPC Handler、PRD §9.3 IPC 通信协议

#### 2.2.3 渲染进程 IPC 封装

- [x] `packages/renderer/src/lib/api.ts` — 封装 `window.api` 调用，提供类型安全的方法
- [x] 在 renderer 中测试：调用 `window.api.computeDiff()` 并 console.log 结果

**交付物**：渲染进程可调用主进程的 `computeDiff`，获得完整的 DiffResult。

---

### Week 3：FileSystem 模块 + DiffView 核心组件

**目标**：文件可读取，双栏 Diff 视图可用，差异高亮正常显示。

#### 2.3.1 FileSystem (`packages/main/src/fs/`)

- [x] `reader.ts` — FileReader（读取文件内容、检测编码、计算大小）
- [x] `encoding.ts` — 编码检测（chardet）与转换（iconv-lite）
- [x] `language.ts` — 语言检测（基于扩展名映射）
- [x] `ipc/file.handler.ts` — 注册 `openFile`、`readFile` IPC handler，调用 Electron dialog

**参考**：模块设计文档 §2.2 FileSystem

#### 2.3.2 DiffView 核心组件 (`packages/renderer/src/features/diff-view/`)

- [x] `SplitDiffView.tsx` — 双栏对比视图容器
- [x] `DiffEditorPane.tsx` — 单侧编辑器面板
  - 初期不使用 Monaco，先用自定义渲染（与原型一致），确保差异渲染逻辑正确
  - 后续 Week 4 替换为 Monaco Diff Editor
- [x] `DiffLine.tsx` — 差异行组件（行号 + gutter + 内容）
  - 支持 equal / insert / delete / replace 四种类型
  - 行背景色高亮
- [x] `InlineDiff.tsx` — 行内差异高亮组件
  - 渲染 InlineDiffSegment[]，对 insert/delete 片段添加高亮
- [x] `FileInfoBar.tsx` — 文件信息栏（路径、编码、行数）
- [x] `stores/diff.store.ts` — DiffStore（Zustand）
  - 状态：leftFile, rightFile, diffResult, options, viewMode, isComputing, activeChunkIndex, isCollapsed
  - Actions：setLeftFile, setRightFile, computeDiff, swapFiles, toggleCollapse, navigateToChunk
- [x] `hooks/useDiff.ts` — 差异计算 hook，封装 IPC 调用 + 状态更新

**参考**：原型 `index.html` 中 diff-editor-container 区域、`main.js` 中 renderDiffView；模块设计文档 §3.2 DiffView

**交付物**：选择两个文件后可显示双栏对比视图，行级和字符级差异高亮正常。

---

### Week 4：Monaco Editor 集成 + 同步滚动 + Diff 导航

**目标**：使用 Monaco Editor 替换自定义渲染，实现同步滚动、差异导航、折叠。

#### 2.4.1 Monaco Editor 集成

- [x] 安装 `monaco-editor`，配置 electron-vite 的 Monaco worker
- [x] `DiffEditorPane.tsx` 重写 — 使用 Monaco `DiffEditor` 或 `createDiffEditor` API
  - 左侧：original model
  - 右侧：modified model
  - 配置差异装饰器（diff decorations），使用 PRD 规定的颜色方案
- [x] 配置 Monaco 语法高亮（基于 language id）
- [x] 处理 Monaco 只读模式 + 大文件虚拟滚动

**参考**：PRD §6.2 技术栈选型（Monaco Editor 0.45+）

#### 2.4.2 同步滚动

- [x] `hooks/useSyncScroll.ts` — 同步滚动 hook
  - 监听 Monaco editor 的 onDidScrollTopChange 事件
  - 按比例同步两侧滚动位置
  - 参考：原型 `main.js` 中 syncScroll 函数

#### 2.4.3 Diff 导航

- [x] `DiffNavigator.tsx` — 差异导航组件
  - 当前位置 / 总数显示（如 1/12）
  - 上一处 / 下一处 / 第一处 / 最后一处按钮
  - 点击导航时调用 Monaco editor 的 revealLineInCenter
- [x] `hooks/useDiffNavigation.ts` — 导航 hook
  - 维护 activeChunkIndex 状态
  - nextChunk / prevChunk / firstChunk / lastChunk 方法
  - 参考：原型 `main.js` 中 navigateDiff 函数

#### 2.4.4 折叠相同区域

- [x] `FoldedLine.tsx` — 折叠行组件（在 Monaco 中通过 folding 实现）
- [x] 折叠逻辑：遍历 DiffLine[]，将连续 equal 行替换为折叠标记
  - 保留上下文行数（默认 3 行）
  - 参考：原型 `main.js` 中折叠逻辑

**交付物**：Monaco Editor 双栏视图可用，同步滚动流畅，差异导航准确，折叠功能正常。

---

### Week 5：Toolbar + 忽略规则 + 统一视图

**目标**：工具栏功能完备，忽略规则面板可用，统一视图实现。

#### 2.5.1 Toolbar 完善

- [x] `Toolbar.tsx` — 工具栏组件完整实现
  - 左侧/右侧文件打开按钮 → 调用 `window.api.openFile()`
  - 忽略选项 toggle chips（空白符、大小写、行尾符）
  - 差异导航区 → 与 DiffNavigator 联动
  - 视图模式切换（双栏/统一/目录）
  - 折叠按钮
  - 搜索按钮
- [x] `ipc/file.handler.ts` — 补充文件选择对话框逻辑

**参考**：原型 `index.html` 中工具栏区域；模块设计文档 §3.1.4 Toolbar

#### 2.5.2 忽略规则引擎 (`packages/main/src/ignore/`)

- [x] `whitespace.ts` — 空白符处理（none / leading-trailing / all）
- [x] `case.ts` — 大小写处理
- [x] `line-ending.ts` — 行尾符处理（CRLF → LF）
- [x] `pattern.ts` — 正则模式匹配忽略
- [x] `preprocessor.ts` — 组合预处理器，输出预处理后的文本
- [x] 修改 DiffEngine 的 `compute` 方法，在调用 myers 之前使用 IgnoreRuleEngine 预处理

**参考**：模块设计文档 §2.4 IgnoreRuleEngine

#### 2.5.3 忽略规则面板

- [x] `IgnorePanel.tsx` — 忽略规则设置对话框
  - 空白符处理选项（单选）
  - 忽略大小写、行尾符（复选）
  - 自定义正则规则列表（动态添加/删除）
  - 算法选择器（Myers / Patience / Histogram）
  - 重置 / 应用按钮
  - 参考：原型 `index.html` 中 overlay-ignore

#### 2.5.4 统一视图

- [x] `UnifiedDiffView.tsx` — 统一差异视图
  - 单栏显示，左侧显示 `+`/`-` gutter
  - 显示双侧行号
  - 差异行着色（新增绿色、删除红色）
  - 参考：原型 `index.html` 中 view-unified 区域

**交付物**：工具栏所有按钮可用，忽略规则修改后重新计算差异，统一视图可正常切换。

---

### Week 6：文件操作 + 粘贴对比 + 标签页 + 拖拽

**目标**：文件操作完整（打开/拖拽/粘贴），标签页管理可用。

#### 2.6.1 文件操作完善

- [x] 拖拽文件到窗口
  - `FileDropZone.tsx` — 拖拽上传区域
  - 主进程处理 `file://` 协议的文件拖入
  - 支持 1 个文件自动分配到空位，2 个文件左右分配
  - 参考：原型 `main.js` 中 setupDragDrop
- [x] 粘贴文本对比
  - `PasteDialog.tsx` — 粘贴文本对话框
  - 左右两个 textarea，点击"开始对比"后计算 diff
  - 参考：原型 `index.html` 中 overlay-paste
- [x] 文件监听
  - `fs/watcher.ts` — 使用 chokidar 监听文件变更
  - 文件变更时自动重新计算 diff

#### 2.6.2 标签页管理

- [x] `stores/tab.store.ts` — TabStore（Zustand）
  - tabs: TabInfo[]
  - activeIndex: number
  - addTab, closeTab, selectTab, updateTabTitle
- [x] `TabBar.tsx` 完善
  - 动态渲染标签页列表
  - 标签标题显示（文件名 vs 文件名）
  - 差异数量 badge
  - 关闭按钮
  - 新建标签按钮
  - 参考：原型 `index.html` 中 tab-bar 区域

#### 2.6.3 WelcomeView

- [x] `WelcomeView.tsx` — 欢迎/空状态视图
  - 拖拽文件提示
  - "打开文件对"和"粘贴文本"按钮
  - 最近会话列表（Phase 1 简化版，从 localStorage 读取）
  - 参考：原型 `index.html` 中 view-welcome 区域

**交付物**：可通过文件选择、拖拽、粘贴三种方式打开对比；多标签页可正常切换。

---

### Week 7：SessionManager + 设置 + 快捷键 + Minimap

**目标**：会话可持久化，设置面板可用，快捷键全覆盖，Minimap 可用。

#### 2.7.1 SessionManager (`packages/main/src/session/`)

- [x] `database.ts` — SQLite 数据库初始化（better-sqlite3）
- [x] `migrations/001_init.sql` — 建表（sessions, recent_files, settings）
- [x] `session.repository.ts` — SessionRepository
  - save / load / list / delete / update
- [x] `recent-files.repository.ts` — RecentFilesRepository
  - add / list / clear
- [x] `ipc/session.handler.ts` — 会话管理 IPC handler
  - saveSession, loadSession, listSessions, deleteSession
- [x] 渲染进程：`stores/session.store.ts` + `hooks/useSession.ts`

**参考**：模块设计文档 §2.3 SessionManager、PRD §8.2 会话持久化

#### 2.7.2 设置对话框

- [x] `SettingsDialog.tsx` — 设置对话框
  - 编辑器设置：字体大小、字体族、Tab 大小
  - Diff 默认设置：默认忽略空白符、默认算法
  - 主题设置：亮色/暗色/跟随系统
- [x] `stores/settings.store.ts` — SettingsStore
- [x] `ipc/settings.handler.ts` — 设置 IPC handler

#### 2.7.3 快捷键系统

- [x] `ShortcutProvider.tsx` — 全局快捷键 Provider
  - 注册所有快捷键（文件操作、视图切换、差异导航等）
  - 冲突检测
  - 参考：模块设计文档 §8 快捷键体系
- [x] `ShortcutsHelp.tsx` — 快捷键帮助对话框
- [x] 快捷键列表（全部实现）：
  - Ctrl+O / Ctrl+L / Ctrl+R（文件）
  - Ctrl+T / Ctrl+W（标签页）
  - Ctrl+1 / Ctrl+2 / Ctrl+3（视图）
  - Ctrl+Shift+C（折叠）
  - Ctrl+Shift+T（主题）
  - Ctrl+Shift+V（粘贴）
  - Ctrl+F（搜索）
  - F7 / F6 / Alt+↑↓ / Alt+Home / Alt+End（导航）
  - Ctrl+S（保存会话）
  - Ctrl+,（设置）
  - Escape（关闭浮层）

#### 2.7.4 Minimap

- [x] `Minimap.tsx` — 差异缩略图组件
  - 使用 Canvas 渲染
  - 每行映射为一个像素条
  - 颜色按 DiffLineType 区分（equal/insert/delete/replace）
  - 当前可视区域高亮
  - 支持点击跳转
  - 参考：原型 `main.js` 中 renderMinimap

**参考**：模块设计文档 §3.2.5 Minimap 组件设计

**交付物**：会话可保存/恢复，设置可持久化，全部快捷键生效，Minimap 正常显示。

---

### Week 8：CLI + Worker Pool + 集成测试 + 打包

**目标**：CLI 可用，大文件 Worker 线程处理，整体测试通过，可打包。

#### 2.8.1 CLI 模块 (`packages/main/src/cli/`)

- [x] `commands/gui.ts` — 默认命令，启动 GUI 并打开指定文件
  - `textdiff [file1] [file2]` → 启动 Electron 窗口
- [x] `commands/diff.ts` — diff 命令
  - `textdiff diff <file1> <file2>` → 输出 unified diff 到 stdout
  - 支持 `--ignore-whitespace`、`--ignore-case`、`--output` 等选项
- [x] `output.ts` — 输出格式化（unified / side-by-side）
- [x] 在 `package.json` 中配置 `bin` 入口

**参考**：模块设计文档 §2.6 CLI 模块、PRD §4.1 F6 命令行界面

#### 2.8.2 Worker Pool (`packages/main/src/diff/worker/`)

- [x] `worker/diff-worker.ts` — Worker 线程脚本
  - 接收差异计算任务，在 Worker 中执行
- [x] `worker/index.ts` — Worker 池管理
  - 文件总大小 > 5MB 时自动使用 Worker
  - 否则同步计算
- [x] 修改 IPC handler，大文件时返回进度通知

**参考**：模块设计文档 §2.1.5 大文件处理、PRD §9.2 大文件处理策略

#### 2.8.3 集成测试

- [x] DiffEngine 集成测试
  - 各种 diff 场景（纯新增、纯删除、替换、混合）
  - 忽略规则组合测试
  - 大文件性能测试（10 万行文件 < 2s）
- [x] FileSystem 集成测试
  - 编码检测（UTF-8、GBK、UTF-16）
  - 大文件读取
- [x] SessionManager 集成测试
  - CRUD 操作
- [x] IPC 端到端测试
  - 渲染进程调用 → 主进程处理 → 返回结果

> **注**：week6-features.test.ts 和 week7-features.test.ts 目前仅做文件存在性检查，缺少行为断言。
> 补充真实行为测试的任务已移至 Week 11（见 §3.3）。

#### 2.8.4 打包与发布准备

- [x] 配置 `electron-builder`
  - Linux 目标：AppImage（优先）、deb、rpm
  - 配置应用图标、名称、分类
- [ ] 编写 Git 集成文档
  - 配置为 `git difftool` / `git mergetool` 的说明
- [ ] 编写用户使用手册（基础版）

> **注**：Git 集成文档和用户手册为遗留项，将在 Week 9 开始前并行完成，不阻塞关键路径。

**交付物**：
- Linux AppImage 可执行文件
- CLI 可正常调用
- 核心功能（F1 文本对比、F2 文件操作、F3 忽略规则、F5 编码支持、F6 CLI）全部可用
- 测试覆盖率达标（业务逻辑 ≥ 80%，工具函数 ≥ 90%）

---

## 3. Phase 2 — 增强版（6 周）

### Week 9：三路合并视图（前端 UI）

> **后端已在 Phase 1 提前完成**：`three-way.ts` 算法、IPC `computeThreeWayDiff` handler、CLI `textdiff merge` 命令均已实现。
> 本周工作集中在渲染进程 UI 层，以及补齐 Week 8 遗留文档。

#### 9.1 遗留文档补齐（Week 8 遗留）

- [x] 编写 Git 集成文档（`git difftool` / `git mergetool` 配置说明）
- [x] 编写用户使用手册（基础版）

#### 9.2 三路合并视图（渲染进程）

- [x] ~~`packages/main/src/diff/three-way.ts` — 三路合并算法~~ （已完成）
- [x] ~~IPC：`computeThreeWayDiff` handler~~ （已完成）
- [x] ~~CLI：`textdiff merge <base> <left> <right> -o <output>`~~ （已完成）
- [x] `MergeView.tsx` — 三栏合并视图容器
- [x] `MergeEditor.tsx` — 三栏编辑器
- [x] `MergePane.tsx` — 单侧合并面板
- [x] `ConflictBlock.tsx` — 冲突块组件
  - 显示冲突内容，提供"采用左侧/采用右侧/手动编辑"选项
- [x] `MergeToolbar.tsx` — 合并工具栏
  - 自动合并、上一个/下一个冲突
- [x] `ResultPreview.tsx` — 合并结果预览
- [x] `stores/merge.store.ts` + `hooks/useMerge.ts` + `hooks/useConflictResolution.ts`

**参考**：模块设计文档 §3.4 MergeView、PRD §4.1 F4 三路合并

### Week 10：目录对比（组件拆分 + 功能完善）

> **基础实现已在 Phase 1 提前完成**：`fs/directory.ts`、IPC `compareDirectories` handler、`DirectoryView.tsx`（含内联 TreeNode）均已实现。
> 本周先做组件拆分重构，再补充独立 hook 和功能增强。

#### 10.1 组件拆分重构（已有实现内联在 DirectoryView 中）

- [ ] `DirectoryHeader.tsx` — 从 `DirectoryView.tsx` 拆分出目录路径头部
- [ ] `DirectoryLegend.tsx` — 从 `DirectityView.tsx` 拆分出状态图例（相同/修改/左侧独有/右侧独有）
- [ ] `DirectoryTree.tsx` — 从 `DirectoryView.tsx` 拆分出目录树组件
- [ ] `TreeNode.tsx` — 从 `DirectoryView.tsx` 拆分出树节点组件
  - 展开/折叠
  - 状态标签
  - 点击文件节点 → 切换到文件 DiffView

#### 10.2 独立 Hook

- [ ] `hooks/useDirectoryCompare.ts` — 目录对比逻辑 hook
- [ ] `hooks/useTreeExpand.ts` — 树展开/折叠状态 hook

#### 10.3 功能完善

- [x] ~~`packages/main/src/fs/directory.ts` — DirectoryReader~~ （已完成）
- [x] ~~IPC：`compareDirectories` handler~~ （已完成）
- [x] ~~`DirectoryView.tsx` — 目录对比视图容器~~ （已完成，本周拆分）
- [ ] 支持过滤（扩展名、通配符）

**参考**：模块设计文档 §3.3 DirectoryView、原型 `index.html` 中 view-directory 区域

### Week 11：Session 历史增强 + 文件过滤 + 行为测试补充

- [x] ~~Session 历史对话框完整实现~~ — `SessionListDialog.tsx` 已完成（含搜索/过滤/打开/删除）
- [ ] 文件过滤系统
  - 扩展名过滤
  - 通配符/正则过滤
  - 目录排除规则（如 node_modules）
- [ ] IgnoreRuleEngine 增强
  - 忽略注释行（可配置注释前缀 `//`、`#`、`--` 等）
- [ ] 补充行为测试（Week 6/7 遗留）
  - `week6-features.test.ts` — 补充 FileDropZone、PasteDialog、TabStore 的行为断言
  - `week7-features.test.ts` — 补充 SessionManager、SettingsStore、ShortcutProvider 的行为断言
  - 目标：业务逻辑覆盖率达到计划要求的 ≥ 80%

### Week 12：搜索增强 + 虚拟滚动优化

- [ ] 搜索功能增强
  - 全文搜索（在差异结果中搜索）
  - 正则搜索
  - 搜索结果高亮 + 导航
- [ ] 大文件虚拟滚动优化
  - Monaco Editor 配置 `scrollBeyondLastLine: false`
  - 测试 10 万行文件的滚动性能
  - 确保 60fps 滚动
- [ ] 性能优化
  - Diff 计算结果缓存（文件内容不变时不重复计算）
  - 增量 diff（文件局部变更时只重算变更部分）

### Week 13：打包发布 + 国际化

- [ ] 多格式打包
  - AppImage（通用）
  - .deb（Ubuntu/Debian）
  - .rpm（Fedora/CentOS）
  - .tar.gz（通用）
- [ ] 国际化（i18n）
  - 提取所有中文字符串到 locale 文件
  - 支持中文（zh-CN）和英文（en-US）
  - 使用 React Context 或 zustand 管理语言切换
- [ ] 应用菜单配置（Electron Menu API，适配 Linux 桌面）
- [ ] 应用图标设计
- [ ] 编写完整用户手册

### Week 14：E2E 测试 + Bug 修复 + 发布

- [ ] Playwright E2E 测试
  - 文件打开 → Diff 显示 → 导航 → 切换视图
  - 拖拽文件
  - 粘贴文本对比
  - 主题切换
  - 快捷键
  - 会话保存/恢复
- [ ] Wayland 兼容性测试
- [ ] 性能基准测试
  - 10 万行文件 diff < 2s
  - 重新 diff < 500ms
  - 滚动 ≥ 60fps
  - 内存 < 200MB
- [ ] Bug 修复（预留缓冲时间）
- [ ] 发布 v1.0.0

**交付物**：
- 三路合并功能完整可用
- 目录对比功能完整可用
- Linux 多格式安装包
- 中英文界面
- 完整测试覆盖
- 用户手册

---

## 4. 任务依赖图

```
Week 1 ─┬─ 工程初始化                          ✅
         ├─ shared 类型定义                      ✅
         └─ App Shell 布局                       ✅
            │
Week 2 ─┬─ DiffEngine (Myers + Inline + Chunks + Stats)  ✅
         └─ IPC 通信层 (preload + handlers)               ✅
            │
Week 3 ─┬─ FileSystem (reader + encoding + language)     ✅
         └─ DiffView 核心 (SplitDiffView + DiffLine + InlineDiff + Store)  ✅
            │
Week 4 ─┬─ Monaco Editor 集成                   ✅
         ├─ 同步滚动                             ✅
         ├─ Diff 导航                            ✅
         └─ 折叠相同区域                         ✅
            │
Week 5 ─┬─ Toolbar 完善                         ✅
         ├─ IgnoreRuleEngine + IgnorePanel        ✅
         └─ UnifiedDiffView                      ✅
            │
Week 6 ─┬─ 拖拽 + 粘贴 + 文件监听              ✅
         ├─ TabStore + TabBar                    ✅
         └─ WelcomeView                          ✅
            │
Week 7 ─┬─ SessionManager (SQLite)              ✅
         ├─ SettingsDialog                       ✅
         ├─ ShortcutProvider                     ✅
         └─ Minimap                              ✅
            │
Week 8 ─┬─ CLI 模块                             ✅
         ├─ Worker Pool                          ✅
         ├─ 集成测试                             ✅
         └─ 打包 (electron-builder)              ✅ (文档遗留 → Week 9 补齐)
            │
         ═══ MVP 交付 ═══
            │
Week 9 ──── 三路合并视图（前端 UI）+ 遗留文档    ✅
            │  后端已完成：three-way.ts / IPC / CLI
            │
Week 10 ─── 目录对比（组件拆分 + hook 独立 + 过滤）
            │  基础实现已完成：directory.ts / IPC / DirectoryView
            │
Week 11 ─── Session 历史增强 + 文件过滤 + 行为测试补充
            │
Week 12 ─── 搜索增强 + 虚拟滚动优化
            │
Week 13 ─── 打包发布 + 国际化
            │
Week 14 ─── E2E 测试 + Bug 修复 + 发布
```

### 关键依赖路径

1. **shared 类型** → DiffEngine → DiffView（所有 UI 依赖类型定义）
2. **IPC 通信层** → 渲染进程任何 IPC 调用（Week 2 必须打通）
3. **DiffEngine** → DiffView → Monaco 集成（核心功能链）
4. **FileSystem** → 文件操作（拖拽、打开文件都依赖）
5. **SessionManager** → 依赖 SQLite 初始化（Week 7 集成）

### 可并行的任务

- Week 1：shared 类型 + App Shell 布局可并行
- Week 2：DiffEngine + IPC 通信可并行
- Week 3：FileSystem（主进程）+ DiffView 组件（渲染进程）可并行
- Week 5：IgnoreRuleEngine（主进程）+ IgnorePanel + UnifiedView（渲染进程）可并行

---

## 5. 测试策略

### 5.1 测试分层

| 层级 | 工具 | 覆盖目标 | 负责周期 |
|------|------|---------|---------|
| 单元测试 | Vitest | 业务逻辑 ≥ 80%，工具函数 ≥ 90% | 每周随功能编写 |
| 集成测试 | Vitest | IPC 通信、数据库操作 | Week 8 |
| E2E 测试 | Playwright | 核心用户流程 | Week 14 |
| 性能测试 | 手动 + Benchmark | diff 性能、滚动帧率、内存占用 | Week 8, 12, 14 |

### 5.2 关键测试用例

**DiffEngine 单元测试**：
- 空文件 vs 空文件
- 空文件 vs 有内容
- 完全相同文件
- 纯新增、纯删除
- 混合修改（新增+删除+修改）
- 忽略空白符（leading-trailing / all）
- 忽略大小写
- 忽略行尾符
- 大文件（10 万行）

**IPC 集成测试**：
- computeDiff 正常调用 → 返回 DiffResult
- openFile 返回 FileInfo
- session CRUD 完整流程

**E2E 测试**：
- 打开应用 → 拖入两个文件 → 查看 diff → 导航差异 → 切换视图
- 粘贴文本 → 对比 → 修改忽略规则 → 重新对比
- 保存会话 → 关闭 → 重新打开 → 恢复会话

---

## 6. 验收标准

### Phase 1 MVP 验收标准

| 功能 | 验收条件 |
|------|---------|
| F1.1 双栏对比 | 两个文件并排显示，同步滚动正常 |
| F1.2 行级差异高亮 | 新增绿色、删除红色、修改橙色 |
| F1.3 字符级差异 | replace 行内字符级高亮正确 |
| F1.4 差异导航 | 上/下一处差异跳转准确，计数正确 |
| F1.5 行号显示 | 行号正确，可点击跳转 |
| F1.6 折叠相同区域 | 连续相同行可折叠，点击可展开 |
| F1.7 统一视图 | unified diff 格式显示正确 |
| F2.1 文件选择 | 通过对话框打开文件 |
| F2.2 拖拽文件 | 拖入文件可正常对比 |
| F2.3 粘贴对比 | 粘贴文本后立即对比 |
| F3.1 忽略空白符 | 三种模式均生效 |
| F3.2 忽略大小写 | 生效 |
| F3.3 忽略行尾符 | CRLF/LF 差异被忽略 |
| F5.1 语法高亮 | 按扩展名自动选择语言 |
| F5.2 编码检测 | UTF-8/GBK 正确检测和显示 |
| F6.1 CLI GUI | `textdiff f1 f2` 启动 GUI |
| F6.2 CLI diff | `textdiff diff f1 f2` 输出到 stdout |
| 性能 | 10 万行文件 < 2s，滚动 ≥ 60fps |

### Phase 2 验收标准

| 功能 | 验收条件 |
|------|---------|
| F4.1 三路合并 | Base/Left/Right 三栏显示 |
| F4.2 冲突解决 | 可逐块选择采用哪侧 |
| F4.3 合并输出 | 结果可保存到文件 |
| F2.4 目录对比 | 递归对比，树形展示 |
| F2.6 会话管理 | 保存/恢复/删除/列表 |
| 国际化 | 中英文切换正常 |
| 打包 | AppImage/deb/rpm 可安装运行 |

---

## 附录

### A. 风险与缓解

| 风险 | 缓解措施 |
|------|---------|
| Monaco Editor 大文件性能差 | Week 4 尽早集成验证；备选方案：自定义虚拟滚动渲染 |
| Wayland 兼容性问题 | 使用 Electron 30+（原生 Wayland 支持），Week 13 专门测试 |
| 打包体积过大 | electron-builder 配置精简，考虑 asar 压缩 |
| diff-match-patch 超大文件内存溢出 | 5MB 阈值触发 Worker Thread；提供文件大小警告 |
| 编码检测误判 | 默认 UTF-8，提供手动切换 UI |

### B. 原型到实现的映射

| 原型文件 | 映射到 |
|---------|--------|
| `prototype/index.html` | 各 React 组件的 JSX 结构参考 |
| `prototype/styles.css` | Tailwind CSS 自定义变量 + 组件样式参考 |
| `prototype/main.js` → `computeDiff` | `packages/main/src/diff/myers.ts` |
| `prototype/main.js` → `computeInlineDiff` | `packages/main/src/diff/inline.ts` |
| `prototype/main.js` → `renderMinimap` | `packages/renderer/src/features/diff-view/components/Minimap.tsx` |
| `prototype/main.js` → `setupDragDrop` | `packages/renderer/src/components/layout/FileDropZone.tsx` |
| `prototype/main.js` → `setupKeyboardShortcuts` | `packages/renderer/src/features/shortcuts/ShortcutProvider.tsx` |
| `prototype/data.js` → `MOCK_FILES` | 测试用例参考数据 |
| `prototype/data.js` → `DIRECTORY_DATA` | 目录对比测试数据 |

---

*文档维护：技术团队 | 如有疑问请提 Issue*
