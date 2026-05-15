# TextDiff 单元测试设计文档

> 版本：1.0  
> 日期：2026-05-12  
> 状态：设计阶段

---

## 目录

1. [概述](#1-概述)
2. [模块架构梳理](#2-模块架构梳理)
3. [测试策略](#3-测试策略)
4. [测试环境配置](#4-测试环境配置)
5. [各模块测试设计](#5-各模块测试设计)
   - 5.1 [Diff 引擎（Main）](#51-diff-引擎main)
   - 5.2 [目录对比引擎（Main）](#52-目录对比引擎main)
   - 5.3 [文件系统模块（Main）](#53-文件系统模块main)
   - 5.4 [Ignore 规则引擎（Main）](#54-ignore-规则引擎main)
   - 5.5 [IPC 处理层（Main）](#55-ipc-处理层main)
   - 5.6 [会话与数据库（Main）](#56-会话与数据库main)
   - 5.7 [Zustand Stores（Renderer）](#57-zustand-storesrenderer)
   - 5.8 [React Hooks（Renderer）](#58-react-hooksrenderer)
   - 5.9 [React 组件（Renderer）](#59-react-组件renderer)
   - 5.10 [共享工具与类型（Shared）](#510-共享工具与类型shared)
6. [测试优先级与覆盖率目标](#6-测试优先级与覆盖率目标)
7. [Mock 策略](#7-mock-策略)
8. [测试文件组织规范](#8-测试文件组织规范)
9. [CI 集成建议](#9-ci-集成建议)

---

## 1. 概述

### 1.1 项目背景

TextDiff 是一个基于 Electron + React 的桌面文本对比工具，采用单根 monorepo 结构，包含三个包：

| 包 | 职责 |
|---|---|
| `packages/main` | Electron 主进程：Diff 引擎、文件 I/O、SQLite、IPC 处理、CLI |
| `packages/renderer` | React 渲染进程：全部 UI、Zustand 状态管理 |
| `packages/shared` | 共享类型、常量、工具函数（无运行时依赖） |

### 1.2 当前测试现状

**所有测试文件均未创建**。AGENTS.md 中列出的测试条目仅为规划占位，`__tests__` 目录在代码库中不存在。本文档从零开始设计完整的单元测试体系。

### 1.3 测试框架

- **测试运行器**：Vitest 1.x（配置文件：`vitest.config.ts`）
- **断言库**：Vitest 内置（兼容 Jest API）
- **组件测试**：`@testing-library/react` + `@testing-library/user-event`
- **Mock**：Vitest 内置 `vi.mock` / `vi.fn` / `vi.spyOn`

---

## 2. 模块架构梳理

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────┐
│                    Renderer Process                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │diff-view │  │directory │  │  merge   │  │dialogs │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───┬────┘  │
│       │              │              │             │       │
│  ┌────▼──────────────▼──────────────▼─────────────▼───┐  │
│  │              Zustand Stores (10个)                  │  │
│  │  diff / tab / session / settings / theme /          │  │
│  │  search / history / language / directory / filter   │  │
│  └────────────────────────┬────────────────────────────┘  │
│                           │ window.api (contextBridge)    │
└───────────────────────────┼───────────────────────────────┘
                            │ IPC (ipcRenderer.invoke)
┌───────────────────────────┼───────────────────────────────┐
│                    Main Process                           │
│  ┌────────────────────────▼────────────────────────────┐  │
│  │              IPC Handlers (8个)                      │  │
│  │  file / diff / directory / session / settings /     │  │
│  │  dialog / sync / report                             │  │
│  └──┬──────────┬──────────┬──────────┬─────────────────┘  │
│     │          │          │          │                     │
│  ┌──▼──┐  ┌───▼───┐  ┌───▼───┐  ┌───▼────┐               │
│  │ fs/ │  │ diff/ │  │ dir/  │  │session/│               │
│  │     │  │engine │  │engine │  │  + DB  │               │
│  └─────┘  └───────┘  └───────┘  └────────┘               │
└───────────────────────────────────────────────────────────┘
                            │
┌───────────────────────────┼───────────────────────────────┐
│                  Shared Package                           │
│         types / constants / utils / locales              │
└───────────────────────────────────────────────────────────┘
```

### 2.2 核心数据流

**文件 Diff 流程：**
```
用户选择文件
  → useTabStore.addTabWithFiles()
  → useDiff hook → window.api.computeDiff()
  → IPC: diff:compute
  → diff/index.ts: computeDiff()
    → preprocessContent() [ignore/]
    → myersDiff() / patienceDiff() / histogramDiff()
    → mergeReplaceOperations()
    → buildDiffLines()
    → computeInlineDiff()
    → buildChunks()
    → calculateStats()
  → DiffResult → useDiffStore.setDiffResult()
  → SplitDiffView / UnifiedDiffView 渲染
```

**目录对比流程：**
```
用户选择目录
  → useDirectoryCompareStore.startComparison()
  → window.api.directory.compare()
  → IPC: directory:compare
  → directory/scanner.ts: scanDirectory() × 2
  → directory/comparator.ts: compareDirectories()
  → directory/filter.ts: applyFilters()
  → directory/stats.ts: computeStatistics()
  → DirectoryComparison → DirectoryView 渲染
```

---

## 3. 测试策略

### 3.1 测试分层

```
         ┌─────────────────────┐
         │    E2E Tests        │  ← Playwright（不在本文档范围）
         │  (少量，高价值场景)  │
         └──────────┬──────────┘
         ┌──────────▼──────────┐
         │ Integration Tests   │  ← IPC 处理、数据库、文件 I/O
         │  (中等数量)          │
         └──────────┬──────────┘
         ┌──────────▼──────────┐
         │   Unit Tests        │  ← 算法、工具函数、Store、Hook
         │  (大量，快速)        │
         └─────────────────────┘
```

### 3.2 测试原则

1. **纯函数优先**：Diff 算法、过滤器、统计函数等纯函数必须 100% 覆盖核心路径。
2. **边界条件**：空输入、超大输入、特殊字符、Unicode、CRLF/LF 混合等边界必须覆盖。
3. **隔离 Electron**：主进程测试不依赖 Electron API，通过 Mock 隔离 `ipcMain`、`dialog`、`app` 等。
4. **隔离文件系统**：文件 I/O 测试使用临时目录（`os.tmpdir()`），测试后清理。
5. **Store 独立测试**：Zustand store 在 Node 环境中直接测试，不依赖 React 渲染。
6. **组件浅测试**：React 组件测试聚焦行为（用户交互、状态变化），不测试样式细节。

### 3.3 不测试的内容

- Monaco Editor 内部行为（第三方库）
- Electron 原生 API（`BrowserWindow`、`Menu` 等）
- CSS 样式和视觉回归（由 E2E 覆盖）
- Worker 线程内部（通过集成测试覆盖）

---

## 4. 测试环境配置

### 4.1 当前 vitest.config.ts 问题

当前配置存在两个问题需要修复：

```typescript
// vitest.config.ts 当前配置
test: {
  environment: 'node',
  include: ['packages/**/__tests__/**/*.test.ts', 'packages/**/*.test.ts'],
  // 问题1：缺少 .test.tsx，React 组件测试无法被发现
  // 问题2：所有测试共用 node 环境，组件测试需要 jsdom
}
```

**建议修改：**

```typescript
// vitest.config.ts 建议配置
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import react from '@vitejs/plugin-react'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: [
      'packages/**/__tests__/**/*.test.ts',
      'packages/**/__tests__/**/*.test.tsx',
      'packages/**/*.test.ts',
      'packages/**/*.test.tsx'
    ],
    exclude: ['node_modules', 'dist', 'out'],
    testTimeout: 10000,
    environmentMatchGlobs: [
      // renderer 包下的测试使用 jsdom
      ['packages/renderer/**', 'jsdom']
    ]
  },
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'packages/shared/src'),
      '@renderer': resolve(__dirname, 'packages/renderer/src'),
      '@': resolve(__dirname, 'packages/renderer/src')
    }
  }
})
```

**需要安装的额外依赖：**

```bash
npm install -D @vitejs/plugin-react @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

### 4.2 全局 Mock 文件

创建 `packages/renderer/src/__tests__/setup.ts`，在 vitest.config.ts 中通过 `setupFiles` 引入：

```typescript
// packages/renderer/src/__tests__/setup.ts
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock window.api（contextBridge 在测试环境不可用）
vi.stubGlobal('api', {
  openFile: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  computeDiff: vi.fn(),
  computeThreeWayDiff: vi.fn(),
  directory: {
    compare: vi.fn(),
    open: vi.fn(),
    cancel: vi.fn(),
  },
  sync: {
    generatePlan: vi.fn(),
    execute: vi.fn(),
    cancel: vi.fn(),
  },
  report: {
    generate: vi.fn(),
    save: vi.fn(),
  },
  saveSession: vi.fn(),
  loadSession: vi.fn(),
  listSessions: vi.fn(),
  deleteSession: vi.fn(),
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
  onDiffProgress: vi.fn(),
  onDiffComplete: vi.fn(),
  onDiffError: vi.fn(),
})
```

---

## 5. 各模块测试设计

### 5.1 Diff 引擎（Main）

#### 5.1.1 Myers 算法（`diff/myers.ts`）

**测试文件**：`packages/main/src/diff/__tests__/myers.test.ts`

| 测试用例 | 输入 | 期望输出 |
|---|---|---|
| 空数组对比 | `([], [])` | `[]` |
| 完全相同 | `(['a','b'], ['a','b'])` | 全为 `equal` |
| 纯插入 | `(['a'], ['a','b'])` | `[equal, insert]` |
| 纯删除 | `(['a','b'], ['a'])` | `[equal, delete]` |
| 替换 | `(['a'], ['b'])` | `[delete, insert]` 或 `[replace]` |
| 多行混合 | 5行→7行（中间修改） | 正确的 op 序列 |
| 大量相同行 | 1000行相同 | 全 equal，性能 < 100ms |
| 特殊字符 | 含 Unicode、Tab、空行 | 正确处理 |
| 单字符差异 | `['abc']` vs `['abd']` | 检测到 replace |

**关键断言**：
- 输出 ops 的 `delete` 数量 + `equal` 数量 = 左侧行数
- 输出 ops 的 `insert` 数量 + `equal` 数量 = 右侧行数
- 应用 ops 到左侧内容后应得到右侧内容（可逆性验证）

#### 5.1.2 Patience 算法（`diff/patience.ts`）

**测试文件**：`packages/main/src/diff/__tests__/patience.test.ts`

在 Myers 测试基础上，额外测试：

| 测试用例 | 说明 |
|---|---|
| 代码块移动 | 函数从文件顶部移到底部，Patience 应识别为移动而非删除+插入 |
| 重复行处理 | 多个相同行（如空行、`}`）不应导致错误匹配 |
| 与 Myers 结果对比 | 相同输入，两者 equal 行数应相同 |

#### 5.1.3 Histogram 算法（`diff/histogram.ts`）

**测试文件**：`packages/main/src/diff/__tests__/histogram.test.ts`

与 Patience 测试类似，额外验证低频行优先匹配的特性。

#### 5.1.4 Diff 管道（`diff/index.ts`）

**测试文件**：`packages/main/src/diff/__tests__/diff-engine.unit.test.ts`

```typescript
describe('computeDiff', () => {
  it('使用默认选项计算差异')
  it('ignoreWhitespace=all 时忽略空白差异')
  it('ignoreCase=true 时大小写不敏感')
  it('ignoreLineEndings=true 时 CRLF/LF 等价')
  it('指定 algorithm=patience 时使用 Patience 算法')
  it('指定 algorithm=histogram 时使用 Histogram 算法')
  it('contextLines=0 时 chunk 不包含上下文')
  it('contextLines=5 时 chunk 包含5行上下文')
  it('返回正确的 DiffStats（insertedLines, deletedLines, modifiedLines）')
  it('返回正确的 DiffChunk 列表')
  it('replace 行包含 inlineDiff 字段')
  it('空文件对比返回空结果')
  it('相同内容返回 stats.equalLines = 总行数')
})
```

#### 5.1.5 内联 Diff（`diff/inline.ts`）

**测试文件**：`packages/main/src/diff/__tests__/inline.test.ts`

| 测试用例 | 输入 | 期望 |
|---|---|---|
| 完全不同 | `'abc'` vs `'xyz'` | 整行标记为 delete/insert |
| 单字符变化 | `'hello'` vs `'helo'` | 只有 `l` 标记为 delete |
| 前缀相同 | `'foo bar'` vs `'foo baz'` | `bar`/`baz` 部分标记 |
| 空字符串 | `''` vs `'abc'` | 整个 `abc` 为 insert |
| Unicode | `'你好世界'` vs `'你好地球'` | `世界`/`地球` 标记 |

#### 5.1.6 Chunk Builder（`diff/chunk-builder.ts`）

**测试文件**：`packages/main/src/diff/__tests__/chunk-builder.test.ts`

```typescript
describe('buildChunks', () => {
  it('相邻变更行合并为同一 chunk')
  it('间距超过 contextLines*2 的变更分为不同 chunk')
  it('chunk 的 leftLineRange 和 rightLineRange 正确')
  it('chunk.type 为 changed 当包含 insert/delete/replace')
  it('contextLines=0 时 chunk 只包含变更行')
  it('文件开头的变更 chunk 不越界（startIndex >= 0）')
  it('文件末尾的变更 chunk 不越界（endIndex < lines.length）')
})
```

#### 5.1.7 Diff 缓存（`diff/cache.ts`）

**测试文件**：`packages/main/src/diff/__tests__/cache.test.ts`

```typescript
describe('DiffCache', () => {
  it('相同内容第二次调用命中缓存')
  it('不同内容不命中缓存')
  it('超过 maxSize 时淘汰最久未使用的条目')
  it('超过 TTL 后缓存失效')
  it('clearCache() 后缓存为空')
  it('getDiffCacheStats() 返回正确的 size 和 maxSize')
  it('ignoreWhitespace 不同时缓存 key 不同')
})
```

#### 5.1.8 增量 Diff（`diff/incremental.ts`）

**测试文件**：`packages/main/src/diff/__tests__/incremental.test.ts`

```typescript
describe('computeIncrementalDiff', () => {
  it('小改动时复用前次结果（不重新计算全量）')
  it('大改动时回退到全量计算')
  it('增量结果与全量结果一致')
  it('prevResult 为 null 时执行全量计算')
})
```

#### 5.1.9 三路合并（`diff/three-way.ts`）

**测试文件**：`packages/main/src/diff/__tests__/three-way.test.ts`

```typescript
describe('computeThreeWayDiff', () => {
  it('无冲突时 hasConflicts=false')
  it('左右同时修改同一行时检测为冲突')
  it('只有左侧修改时无冲突，左侧变更被采纳')
  it('只有右侧修改时无冲突，右侧变更被采纳')
  it('冲突区域包含正确的 baseContent/leftContent/rightContent')
  it('conflicts 数组长度与实际冲突数一致')
})
```

---

### 5.2 目录对比引擎（Main）

#### 5.2.1 目录扫描器（`directory/scanner.ts`）

**测试文件**：`packages/main/src/directory/__tests__/scanner.test.ts`

```typescript
describe('scanDirectory', () => {
  it('扫描空目录返回空数组')
  it('正确识别文件和子目录')
  it('recursive=false 时不递归子目录')
  it('recursive=true 时递归所有子目录')
  it('maxDepth 限制递归深度')
  it('正确计算文件哈希（useHash=true）')
  it('软链接处理策略正确')
  it('无权限目录返回空数组不报错')
  it('progress 回调被正确调用')
})

describe('computeFileHash', () => {
  it('空文件返回空字符串')
  it('相同内容返回相同哈希')
  it('不同内容返回不同哈希')
  it('大文件也能快速计算')
})
```

#### 5.2.2 目录比较器（`directory/comparator.ts`）

**测试文件**：`packages/main/src/directory/__tests__/comparator.test.ts`

```typescript
describe('compareDirectories', () => {
  it('相同目录返回全 equal 状态')
  it('左独有文件状态为 left-only')
  it('右独有文件状态为 right-only')
  it('同名不同大小文件状态为 modified')
  it('同名不同修改时间状态为 modified')
  it('同名不同哈希状态为 modified')
  it('compareMode=name 时只比较名称')
  it('compareMode=size 时比较大小')
  it('compareMode=content 时比较哈希')
})

describe('mergeStatus', () => {
  it('equal + equal = equal')
  it('equal + modified = modified')
  it('left-only + equal = left-only')
  it('modified + right-only = modified')
  // ... 状态组合矩阵
})
```

#### 5.2.3 过滤器（`directory/filter.ts`）

**测试文件**：`packages/main/src/directory/__tests__/filter.test.ts`

```typescript
describe('applyFilters', () => {
  it('空过滤器返回全部条目')
  it('glob 过滤器正确匹配文件路径')
  it('extension 过滤器只保留指定扩展名')
  it('regex 过滤器支持正则匹配')
  it('多个过滤器按 AND 逻辑组合')
  it('被过滤的目录的 children 也被排除')
  it('hiddenFiles 过滤器排除隐藏文件')
})

describe('matchGlob', () => {
  it('简单匹配 *.js 正确')
  it('双星 ** 匹配多级目录')
  it('问号 ? 匹配单个字符')
  it('方括号 [] 匹配字符集')
  it('反斜杠转义特殊字符')
})
```

#### 5.2.4 统计计算（`directory/stats.ts`）

**测试文件**：`packages/main/src/directory/__tests__/stats.test.ts`

```typescript
describe('computeStatistics', () => {
  it('空条目返回全零统计')
  it('正确统计各类状态数量')
  it('正确计算总文件数')
  it('正确计算总大小')
  it('正确计算修改文件数')
  it('正确计算差异行数（如果有 diff 结果）')
})

describe('formatFileSize', () => {
  it('0 bytes 显示 "0 B"')
  it('1024 bytes 显示 "1 KB"')
  it('1048576 bytes 显示 "1 MB"')
  it('1024 MB 显示 "1 GB"')
  it('保留两位小数')
})

describe('formatDuration', () => {
  it('0ms 显示 "< 1ms"')
  it('1000ms 显示 "1.0s"')
  it('60000ms 显示 "1m 0.0s"')
})
```

#### 5.2.5 同步计划（`directory/sync-plan.ts`）

**测试文件**：`packages/main/src/directory/__tests__/sync-plan.test.ts`

```typescript
describe('generateSyncPlan', () => {
  it('left-only 文件生成 copy-left-to-right 操作')
  it('right-only 文件生成 copy-right-to-left 操作')
  it('modified 文件根据策略决定方向')
  it('equal 文件无操作')
  it('generateLeftToRightPlan 所有操作方向为 L->R')
  it('generateRightToLeftPlan 所有操作方向为 R->L')
  it('bidirectional 策略保留较新文件')
})

describe('analyzeSyncPlan', () => {
  it('统计正确数量的 copy/delete 操作')
  it('计算预估耗时')
  it('检测潜在冲突（双向修改同一文件）')
  it('检测空间不足风险')
})
```

#### 5.2.6 同步引擎（`directory/sync.ts`）

**测试文件**：`packages/main/src/directory/__tests__/sync.test.ts`

```typescript
describe('SyncEngine', () => {
  it('copy 操作成功复制文件')
  it('copy 操作保留原始文件')
  it('delete 操作成功删除文件')
  it('createBackup=true 时执行前创建备份')
  it('dryRun=true 时只记录不执行')
  it('验证阶段失败时提前中止')
  it('进度回调报告正确百分比')
  it('出错时返回已执行操作和错误信息')
})

describe('validateSyncPlan', () => {
  it('源文件不存在时报错')
  it('目标目录不可写时报错')
  it('磁盘空间不足时报警告')
  it('大量覆盖操作时提示确认')
})
```

#### 5.2.7 缓存管理（`directory/cache.ts`, `cache-manager.ts`）

**测试文件**：`packages/main/src/directory/__tests__/cache.test.ts`

```typescript
describe('DirectoryCacheManager', () => {
  it('相同目录路径命中缓存')
  it('mtime 变化时缓存失效')
  it('size 变化时缓存失效')
  it('超过最大条目数时淘汰旧条目')
  it('clear() 清空所有缓存')
})

describe('CacheManager', () => {
  it('getGlobalCacheManager 返回单例')
  it('registerCache 添加缓存实例')
  it('autoCleanup 定时清理过期条目')
  it('getCacheHealthReport 返回内存使用情况')
})
```

#### 5.2.8 报告生成（`directory/report.ts`）

**测试文件**：`packages/main/src/directory/__tests__/report.test.ts`

```typescript
describe('generateReport', () => {
  it('format=html 生成有效 HTML')
  it('format=json 生成有效 JSON')
  it('format=csv 生成有效 CSV')
  it('format=xml 生成有效 XML')
  it('包含所有条目信息')
  it('包含统计摘要')
  it('HTML 包含样式和交互元素')
})
```

---

### 5.3 文件系统模块（Main）

#### 5.3.1 文件读取（`fs/reader.ts`）

**测试文件**：`packages/main/src/fs/__tests__/reader.test.ts`

```typescript
describe('readFile', () => {
  it('读取 UTF-8 文件')
  it('自动检测 GBK 编码')
  it('自动检测 UTF-16')
  it('读取大文件时流式处理')
  it('文件不存在时抛出 FILE_NOT_FOUND')
  it('无权限时抛出 FILE_READ_ERROR')
  it('返回正确的 lineEnding 类型')
})
```

#### 5.3.2 文件写入（`fs/writer.ts`）

**测试文件**：`packages/main/src/fs/__tests__/writer.test.ts`

```typescript
describe('writeFile', () => {
  it('写入内容到文件')
  it('保留原文件 encoding')
  it('保留原文件 lineEnding')
  it('目录不存在时自动创建')
  it('无权限时抛出 FILE_WRITE_ERROR')
})
```

#### 5.3.3 编码检测（`fs/encoding.ts`）

**测试文件**：`packages/main/src/fs/__tests__/encoding.test.ts`

```typescript
describe('detectEncoding', () => {
  it('UTF-8 BOM 识别为 UTF-8')
  it('UTF-16 LE 正确识别')
  it('UTF-16 BE 正确识别')
  it('GBK 文件正确识别')
  it('纯 ASCII 默认为 UTF-8')
  it('空文件默认为 UTF-8')
})

describe('convertLineEnding', () => {
  it('CRLF 转换为 LF')
  it('CR 转换为 LF')
  it('已经是 LF 保持不变')
})
```

---

### 5.4 Ignore 规则引擎（Main）

#### 5.4.1 预处理器（`ignore/preprocessor.ts`）

**测试文件**：`packages/main/src/ignore/__tests__/preprocessor.test.ts`

```typescript
describe('preprocessContent', () => {
  it('ignoreWhitespace=all 时移除所有空白')
  it('ignoreWhitespace=leading-trailing 时只移除首尾空白')
  it('ignoreCase=true 时转换为小写')
  it('ignoreLineEndings=true 时统一为 LF')
  it('ignorePatterns 时排除匹配行')
  it('ignoreComments 时移除注释行')
  it('多种规则组合正确应用')
})
```

#### 5.4.2 各单项规则

**测试文件**：`packages/main/src/ignore/__tests__/whitespace.test.ts`

```typescript
describe('normalizeWhitespace', () => {
  it('移除行首空格')
  it('移除行尾空格')
  it('移除所有空格（mode=all）')
})
```

**测试文件**：`packages/main/src/ignore/__tests__/case.test.ts`

```typescript
describe('normalizeCase', () => {
  it('大写转小写')
  it('小写保持不变')
  it('Unicode 字符正确处理')
})
```

**测试文件**：`packages/main/src/ignore/__tests__/pattern.test.ts`

```typescript
describe('filterByPatterns', () => {
  it('正则匹配行被移除')
  it('不匹配的保留')
  it('多个模式按 OR 逻辑')
})
```

---

### 5.5 IPC 处理层（Main）

#### 5.5.1 Diff Handler

**测试文件**：`packages/main/src/ipc/__tests__/diff.handler.test.ts`

```typescript
describe('diff:compute handler', () => {
  it('接收文件路径，返回 DiffResult')
  it('大文件自动使用 Worker Pool')
  it('无效路径返回错误响应')
  it('计算中发送进度事件')
})
```

#### 5.5.2 Directory Handler

**测试文件**：`packages/main/src/ipc/__tests__/directory.handler.test.ts`

```typescript
describe('directory:compare handler', () => {
  it('接收两个目录路径返回比较结果')
  it('支持递归和非递归模式')
  it('返回进度信息')
  it('cancel 可中止比较')
})
```

---

### 5.6 会话与数据库（Main）

#### 5.6.1 数据库操作

**测试文件**：`packages/main/src/session/__tests__/database.test.ts`

```typescript
describe('getDatabase', () => {
  it('首次调用创建数据库文件')
  it('后续调用返回同一实例')
  it('自动执行 migrations')
})

describe('Session Repository', () => {
  it('saveSession 创建新会话')
  it('saveSession 更新现有会话')
  it('loadSession 返回完整会话数据')
  it('deleteSession 软删除会话')
  it('listSessions 支持分页和排序')
})
```

---

### 5.7 Zustand Stores（Renderer）

**测试策略**：Zustand 支持在 Node 环境直接测试，无需 jsdom。

#### 5.7.1 Diff Store

**测试文件**：`packages/renderer/src/stores/__tests__/diff.store.test.ts`

```typescript
import { act } from '@testing-library/react'
import { useDiffStore } from '../diff.store'

const store = useDiffStore.getState()

describe('useDiffStore', () => {
  beforeEach(() => {
    useDiffStore.setState(useDiffStore.getInitialState())
  })

  it('初始状态正确')
  it('setLeftFile 更新左侧文件')
  it('setRightFile 更新右侧文件')
  it('setDiffResult 更新差异结果')
  it('setOptions 合并选项对象')
  it('nextChunk 增加 activeChunkIndex')
  it('nextChunk 在最后时不越界')
  it('prevChunk 减少 activeChunkIndex')
  it('toggleCollapse 切换折叠状态')
  it('swapFiles 交换左右文件')
  it('reset 清空所有状态')
})
```

#### 5.7.2 Tab Store

**测试文件**：`packages/renderer/src/stores/__tests__/tab.store.test.ts`

```typescript
describe('useTabStore', () => {
  it('初始有一个空白 tab')
  it('addTab 增加新 tab')
  it('addTabWithFiles 创建带文件的 tab')
  it('closeTab 移除指定 tab')
  it('closeTab 后自动选择相邻 tab')
  it('selectTab 切换 activeIndex')
  it('updateTab 更新指定 tab 数据')
  it('getDirtyTabs 返回有未保存更改的 tab')
})
```

#### 5.7.3 Directory Compare Store

**测试文件**：`packages/renderer/src/stores/__tests__/directory.store.test.ts`

```typescript
describe('useDirectoryCompareStore', () => {
  it('初始 comparison 为 null')
  it('setComparison 设置比较结果')
  it('toggleExpand 切换路径展开状态')
  it('expandAll 展开所有目录')
  it('collapseAll 折叠所有目录')
  it('selectEntry 设置选中条目')
  it('applyFilters 过滤条目列表')
  it('setViewMode 改变视图模式')
})
```

#### 5.7.4 Filter Store

**测试文件**：`packages/renderer/src/stores/__tests__/filter.store.test.ts`

```typescript
describe('useFilterStore', () => {
  it('addFilter 添加过滤器')
  it('removeFilter 移除指定过滤器')
  it('toggleFilter 切换过滤器启用状态')
  it('applyPreset 应用预设过滤器')
  it('setSearchQuery 更新搜索关键词')
  it('toggleRegexSearch 切换正则模式')
  it('setSizeRange 设置文件大小范围')
})
```

#### 5.7.5 Settings Store

**测试文件**：`packages/renderer/src/stores/__tests__/settings.store.test.ts`

```typescript
describe('useSettingsStore', () => {
  it('初始加载后端设置')
  it('updateSettings 乐观更新本地状态')
  it('updateSettings 调用 api.updateSettings')
  it('API 失败时回滚本地状态')
  it('resetSettings 恢复默认值')
})
```

---

### 5.8 React Hooks（Renderer）

**测试策略**：使用 `@testing-library/react` 的 `renderHook`。

#### 5.8.1 useDiff Hook

**测试文件**：`packages/renderer/src/hooks/__tests__/useDiff.test.ts`

```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { useDiff } from '../useDiff'

// Mock window.api.computeDiff
vi.mocked(window.api.computeDiff).mockResolvedValue({
  lines: [],
  chunks: [],
  stats: { equalLines: 0, insertedLines: 0, deletedLines: 0, modifiedLines: 0, totalLines: 0, chunkCount: 0 },
  computedAt: Date.now()
})

describe('useDiff', () => {
  it('初始 isLoading=false, error=null')
  it('computeDiff 时设置 isLoading=true')
  it('computeDiff 完成后更新 diffResult')
  it('computeDiff 失败时设置 error')
  it('computeDiff 完成后设置 isLoading=false')
  it('返回的 compute 函数可手动触发')
})
```

#### 5.8.2 useDirectoryCompare Hook

**测试文件**：`packages/renderer/src/hooks/__tests__/useDirectoryCompare.test.ts`

```typescript
describe('useDirectoryCompare', () => {
  it('compare 调用 api.directory.compare')
  it('compare 过程中 isLoading=true')
  it('compare 完成后更新 comparison')
  it('compare 失败时设置 error')
  it('cancel 调用 api.directory.cancel')
})
```

#### 5.8.3 useVirtualScroll Hook

**测试文件**：`packages/renderer/src/hooks/__tests__/useVirtualScroll.test.ts`

```typescript
describe('useVirtualScroll', () => {
  it('计算正确的 visibleRange')
  it('计算正确的 totalHeight')
  it('scroll 时更新 scrollTop')
  it('itemHeight 变化时重新计算')
  it('overscan 参数控制额外渲染行数')
})
```

#### 5.8.4 useTreeExpand Hook

**测试文件**：`packages/renderer/src/hooks/__tests__/useTreeExpand.test.ts`

```typescript
describe('useTreeExpand', () => {
  it('toggle 切换展开状态')
  it('expandAll 展开所有可展开节点')
  it('collapseAll 折叠所有节点')
  it('expandToDepth 展开到指定深度')
  it('isExpanded 判断节点是否展开')
})
```

---

### 5.9 React 组件（Renderer）

**测试策略**：使用 `@testing-library/react` 渲染组件，测试用户可见行为和交互。

#### 5.9.1 Diff View 组件

**测试文件**：`packages/renderer/src/features/diff-view/__tests__/DiffNavigator.test.tsx`

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { DiffNavigator } from '../components/DiffNavigator'

describe('DiffNavigator', () => {
  it('显示当前 chunk 位置（如 "2 / 5"）')
  it('点击上箭头触发 onPrev')
  it('点击下箭头触发 onNext')
  it('在第一 chunk 时上箭头禁用')
  it('在最后 chunk 时下箭头禁用')
})
```

**测试文件**：`packages/renderer/src/features/diff-view/__tests__/DiffLine.test.tsx`

```typescript
describe('DiffLine', () => {
  it('equal 类型显示无高亮')
  it('insert 类型显示绿色背景')
  it('delete 类型显示红色背景')
  it('显示行号')
  it('inline diff 显示字符级高亮')
})
```

#### 5.9.2 Directory View 组件

**测试文件**：`packages/renderer/src/features/directory/__tests__/TreeNode.test.tsx`

```typescript
describe('TreeNode', () => {
  it('文件类型显示文件图标')
  it('目录类型显示文件夹图标')
  it('点击展开按钮触发 onToggle')
  it('选中状态显示高亮')
  it('不同状态显示对应颜色')
})
```

**测试文件**：`packages/renderer/src/features/directory/__tests__/DirectoryStats.test.tsx`

```typescript
describe('DirectoryStats', () => {
  it('显示总文件数')
  it('显示差异文件数')
  it('显示左侧独有文件数')
  it('显示右侧独有文件数')
  it('百分比进度条正确显示')
})
```

#### 5.9.3 Dialog 组件

**测试文件**：`packages/renderer/src/components/dialogs/__tests__/SettingsDialog.test.tsx`

```typescript
describe('SettingsDialog', () => {
  it('打开时显示当前设置')
  it('修改算法后触发 onUpdate')
  it('修改 ignore 选项后触发 onUpdate')
  it('点击取消不保存更改')
  it('点击确定关闭对话框')
})
```

---

### 5.10 共享工具与类型（Shared）

#### 5.10.1 ID 生成

**测试文件**：`packages/shared/src/utils/__tests__/id.test.ts`

```typescript
describe('generateId', () => {
  it('生成唯一 ID')
  it('生成指定长度')
  it('只包含安全字符')
})
```

#### 5.10.2 HTML 转义

**测试文件**：`packages/shared/src/utils/__tests__/escape.test.ts`

```typescript
describe('escapeHtml', () => {
  it('转义 < 为 &lt;')
  it('转义 > 为 &gt;')
  it('转义 & 为 &amp;')
  it('转义 " 为 &quot;')
  it('不修改普通文本')
})
```

#### 5.10.3 格式化工具

**测试文件**：`packages/shared/src/utils/__tests__/format.test.ts`

```typescript
describe('formatNumber', () => {
  it('千分位格式化')
  it('保留指定小数位')
})

describe('formatDate', () => {
  it('ISO 格式日期')
  it('本地格式日期')
})
```

---

## 6. 测试优先级与覆盖率目标

### 6.1 优先级 P0（必须）

| 模块 | 目标覆盖率 | 理由 |
|---|---|---|
| `diff/myers.ts` | 90%+ | 核心算法 |
| `diff/index.ts` | 85%+ | 主管道 |
| `ignore/*.ts` | 90%+ | 规则引擎 |
| `stores/*.ts` | 85%+ | 状态管理 |

### 6.2 优先级 P1（重要）

| 模块 | 目标覆盖率 | 理由 |
|---|---|---|
| `diff/patience.ts` | 80%+ | 替代算法 |
| `diff/three-way.ts` | 80%+ | 合并功能 |
| `directory/filter.ts` | 85%+ | 目录对比核心 |
| `directory/comparator.ts` | 80%+ | 目录对比核心 |

### 6.3 优先级 P2（一般）

| 模块 | 目标覆盖率 | 理由 |
|---|---|---|
| `directory/stats.ts` | 70%+ | 统计功能 |
| `directory/report.ts` | 70%+ | 导出功能 |
| `fs/*.ts` | 70%+ | 文件 I/O |
| `hooks/*.ts` | 70%+ | 业务逻辑 |

### 6.4 优先级 P3（可选）

| 模块 | 目标覆盖率 | 理由 |
|---|---|---|
| `features/*/components/*.tsx` | 60%+ | UI 组件 |
| `ipc/*.ts` | 60%+ | 集成测试为主 |

---

## 7. Mock 策略

### 7.1 Electron API Mock

```typescript
// __mocks__/electron.ts
export const ipcMain = {
  handle: vi.fn(),
  on: vi.fn(),
  removeHandler: vi.fn(),
}

export const ipcRenderer = {
  invoke: vi.fn(),
  on: vi.fn(),
  removeAllListeners: vi.fn(),
}

export const dialog = {
  showOpenDialog: vi.fn(),
  showSaveDialog: vi.fn(),
}

export const app = {
  getPath: vi.fn(() => '/tmp'),
}
```

### 7.2 window.api Mock

```typescript
// packages/renderer/src/__tests__/setup.ts
Object.defineProperty(global, 'window', {
  value: {
    api: {
      computeDiff: vi.fn(),
      // ... 其他方法
    }
  },
  writable: true,
})
```

### 7.3 文件系统 Mock

```typescript
import { vi } from 'vitest'
import * as fs from 'fs'

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs')
  return {
    ...actual,
    promises: {
      ...actual.promises,
      readFile: vi.fn(),
      writeFile: vi.fn(),
      stat: vi.fn(),
    }
  }
})
```

---

## 8. 测试文件组织规范

### 8.1 目录结构

```
packages/
├── main/src/
│   ├── diff/
│   │   ├── index.ts
│   │   └── __tests__/
│   │       ├── diff-engine.unit.test.ts
│   │       ├── myers.test.ts
│   │       ├── cache.test.ts
│   │       └── ...
│   └── ...
├── renderer/src/
│   ├── stores/
│   │   ├── diff.store.ts
│   │   └── __tests__/
│   │       └── diff.store.test.ts
│   ├── features/diff-view/
│   │   └── __tests__/
│   │       └── DiffNavigator.test.tsx
│   └── ...
└── shared/src/
    └── utils/__tests__/
```

### 8.2 命名规范

| 类型 | 命名示例 |
|---|---|
| 单元测试 | `*.unit.test.ts` |
| 集成测试 | `*.integration.test.ts` |
| 组件测试 | `*.test.tsx` |
| Hook 测试 | `use*.test.ts` |

### 8.3 测试代码规范

1. **Arrange-Act-Assert** 结构清晰
2. **描述性命名**：`it('should throw when file not found')` 而非 `it('handles error')`
3. **避免嵌套 describe**：最多 3 层
4. **每个测试独立**：不依赖执行顺序
5. **清理副作用**：`afterEach` 中重置 store / mock

---

## 9. CI 集成建议

### 9.1 GitHub Actions 工作流

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run type check
        run: npm run typecheck
      
      - name: Run linter
        run: npm run lint
      
      - name: Run tests
        run: npm run test -- --run --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

### 9.2 覆盖率报告

```bash
# 查看详细覆盖率报告
npm run test -- --run --coverage --reporter=verbose

# 查看 HTML 报告
npm run test -- --run --coverage && npx serve coverage
```

### 9.3 预提交钩子

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "vitest related --run"
    ]
  }
}
```

---

## 附录 A：测试速查表

### A.1 常用命令

```bash
# 运行所有测试
npm run test -- --run

# 运行特定文件
npm run test -- --run packages/main/src/diff/__tests__/myers.test.ts

# 运行匹配关键词的测试
npm run test -- --run --reporter=verbose myers

# 只运行失败测试
npm run test -- --run --bail

# 调试模式
npm run test -- --reporter=verbose
```

### A.2 常用匹配器

```typescript
expect(value).toBe(expected)           // 严格相等
expect(value).toEqual(expected)        // 深度相等
expect(value).toBeDefined()            // 非 undefined
expect(value).toBeNull()               // null
expect(value).toBeTruthy()             // 真值
expect(array).toContain(item)          // 包含
expect(array).toHaveLength(n)          // 长度
expect(fn).toHaveBeenCalled()          // 被调用
expect(fn).toHaveBeenCalledWith(arg)   // 带参数调用
```

### A.3 React Testing Library 常用 API

```typescript
// 查询
screen.getByText('text')              // 精确文本
screen.getByRole('button')            // ARIA 角色
screen.getByTestId('data-testid')     // test ID
screen.queryByText('text')            // 可能不存在
screen.findByText('text')             // 异步

// 事件
fireEvent.click(element)
fireEvent.change(input, { target: { value: 'new' } })
userEvent.type(input, 'hello')        // 模拟用户输入

// 异步等待
await waitFor(() => expect(fn).toHaveBeenCalled())
await screen.findByText('loaded')     // 等待元素出现
```

---

*文档结束*

