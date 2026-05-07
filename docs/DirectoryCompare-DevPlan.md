# 目录对比功能开发计划

## 项目概述

基于《文件目录对比功能模块设计文档》，实现可视化的文件目录层级对比功能，支持递归目录对比、多种对比模式、智能过滤系统、树形可视化等核心特性。

**总工作量**: 约 17 个工作日（不含测试和优化）  
**开发周期**: 4 周（按每周 5 个工作日计算）  
**优先级**: P0 功能必须完成，P1 功能建议完成，P2 功能视情况完成

---

## 第一阶段：核心基础功能（Week 1）

**目标**: 实现目录扫描、对比引擎和基础 IPC 接口

### Day 1-2: 目录扫描器 (DirectoryScanner)

| 任务 | 描述 | 输出文件 |
|------|------|----------|
| 1.1 | 实现递归目录扫描功能 | `packages/main/src/directory/scanner.ts` |
| 1.2 | 实现文件元数据收集（大小、修改时间、哈希） | `packages/main/src/directory/scanner.ts` |
| 1.3 | 实现基础过滤功能（排除规则） | `packages/main/src/directory/filter.ts` |
| 1.4 | 编写扫描器单元测试 | `packages/main/src/directory/__tests__/scanner.test.ts` |

**验收标准**:
- [ ] 能够递归扫描目录并收集文件信息
- [ ] 支持通过过滤器排除文件/目录
- [ ] 单元测试覆盖率 > 80%

### Day 3-4: 目录对比器 (DirectoryComparator)

| 任务 | 描述 | 输出文件 |
|------|------|----------|
| 2.1 | 实现路径索引构建 | `packages/main/src/directory/comparator.ts` |
| 2.2 | 实现节点对比逻辑（名称/大小/内容） | `packages/main/src/directory/comparator.ts` |
| 2.3 | 实现差异树构建 | `packages/main/src/directory/comparator.ts` |
| 2.4 | 实现统计信息计算 | `packages/main/src/directory/stats.ts` |
| 2.5 | 编写对比器单元测试 | `packages/main/src/directory/__tests__/comparator.test.ts` |

**验收标准**:
- [ ] 支持四种对比模式：name/size/content/full
- [ ] 正确识别 equal/modified/left-only/right-only/type-changed 状态
- [ ] 性能：1000个文件对比 < 3秒

### Day 5: IPC 接口与主进程集成

| 任务 | 描述 | 输出文件 |
|------|------|----------|
| 3.1 | 扩展 IPC 类型定义 | `packages/shared/src/types/ipc.types.ts` |
| 3.2 | 扩展 IPC Handler | `packages/main/src/ipc/directory.handler.ts` |
| 3.3 | 更新 Preload 脚本 | `packages/main/src/ipc/preload.ts` |
| 3.4 | 集成到主进程 | `packages/main/src/index.ts` |
| 3.5 | 编写 IPC 集成测试 | `packages/main/src/__tests__/ipc-directory.test.ts` |

**验收标准**:
- [ ] IPC 接口类型完整定义
- [ ] 渲染进程可调用 directory:compare 接口
- [ ] 返回结果包含完整的差异条目和统计信息

---

## 第二阶段：前端界面开发（Week 2）

**目标**: 实现目录树可视化、过滤工具栏和基础交互

### Day 1-2: 数据模型与状态管理

| 任务 | 描述 | 输出文件 |
|------|------|----------|
| 4.1 | 定义目录对比相关类型 | `packages/shared/src/types/directory.types.ts` |
| 4.2 | 实现 DirectoryCompareStore | `packages/renderer/src/stores/directory.store.ts` |
| 4.3 | 实现 FilterStore | `packages/renderer/src/stores/filter.store.ts` |
| 4.4 | 实现 useDirectoryCompare Hook | `packages/renderer/src/hooks/useDirectoryCompare.ts` |
| 4.5 | 实现 useTreeExpand Hook | `packages/renderer/src/hooks/useTreeExpand.ts` |

**验收标准**:
- [ ] 类型定义覆盖所有数据结构
- [ ] Store 支持目录对比状态的增删改查
- [ ] Hook 封装完整的对比逻辑

### Day 3: 目录树组件

| 任务 | 描述 | 输出文件 |
|------|------|----------|
| 5.1 | 实现 TreeNode 组件 | `packages/renderer/src/features/directory/components/TreeNode.tsx` |
| 5.2 | 实现 DirectoryTreePanel 组件 | `packages/renderer/src/features/directory/components/DirectoryTreePanel.tsx` |
| 5.3 | 实现文件图标和状态图标 | `packages/renderer/src/features/directory/components/FileIcon.tsx` |
| 5.4 | 实现状态颜色系统 | `packages/renderer/src/features/directory/styles/directory.css` |

**验收标准**:
- [ ] 正确显示文件/目录层级结构
- [ ] 不同状态显示不同颜色和图标
- [ ] 支持展开/折叠交互

### Day 4-5: 主视图与工具栏

| 任务 | 描述 | 输出文件 |
|------|------|----------|
| 6.1 | 实现 DirectoryHeader 组件 | `packages/renderer/src/features/directory/components/DirectoryHeader.tsx` |
| 6.2 | 实现 FilterBar 组件 | `packages/renderer/src/features/directory/components/FilterBar.tsx` |
| 6.3 | 实现 ActionToolbar 组件 | `packages/renderer/src/features/directory/components/ActionToolbar.tsx` |
| 6.4 | 实现 DirectoryStats 统计面板 | `packages/renderer/src/features/directory/components/DirectoryStats.tsx` |
| 6.5 | 整合 DirectoryView 主组件 | `packages/renderer/src/features/directory/DirectoryView.tsx` |
| 6.6 | 编写组件单元测试 | `packages/renderer/src/features/directory/__tests__/*.test.tsx` |

**验收标准**:
- [ ] 界面布局与设计文档一致
- [ ] 工具栏支持过滤、搜索、刷新操作
- [ ] 统计面板实时更新

---

## 第三阶段：高级功能与优化（Week 3）

**目标**: 实现文件预览、虚拟滚动、Worker 池和大目录优化

### Day 1: 文件差异预览

| 任务 | 描述 | 输出文件 |
|------|------|----------|
| 7.1 | 实现 DiffPreviewPanel 组件 | `packages/renderer/src/features/directory/components/DiffPreviewPanel.tsx` |
| 7.2 | 实现点击文件加载差异内容 | `packages/renderer/src/features/directory/hooks/useFileDiff.ts` |
| 7.3 | 复用现有的 SplitDiffView 组件 | 复用已有组件 |
| 7.4 | 实现预览抽屉展开/折叠动画 | `packages/renderer/src/features/directory/components/DiffPreviewDrawer.tsx` |

**验收标准**:
- [ ] 点击文件显示差异预览
- [ ] 预览面板可展开/折叠
- [ ] 复用现有差异对比组件

### Day 2: 虚拟滚动优化

| 任务 | 描述 | 输出文件 |
|------|------|----------|
| 8.1 | 实现 useVirtualScroll Hook | `packages/renderer/src/hooks/useVirtualScroll.ts` |
| 8.2 | 集成虚拟滚动到 DirectoryTreePanel | 修改 `DirectoryTreePanel.tsx` |
| 8.3 | 性能测试：10,000 个文件流畅滚动 | 测试报告 |

**验收标准**:
- [ ] 支持 10,000+ 文件流畅渲染
- [ ] 滚动帧率 > 30fps

### Day 3-4: Worker 池实现

| 任务 | 描述 | 输出文件 |
|------|------|----------|
| 9.1 | 实现目录扫描 Worker | `packages/main/src/directory/worker/scan-worker.ts` |
| 9.2 | 实现文件哈希计算 Worker | `packages/main/src/directory/worker/hash-worker.ts` |
| 9.3 | 实现 WorkerPool 管理器 | `packages/main/src/directory/worker/pool.ts` |
| 9.4 | 集成 Worker 到 Scanner | 修改 `scanner.ts` |
| 9.5 | 编写 Worker 集成测试 | `packages/main/src/directory/worker/__tests__/pool.test.ts` |

**验收标准**:
- [ ] Worker 池自动管理多线程
- [ ] 大目录（>1000文件）自动启用 Worker
- [ ] 处理完成后正确销毁 Worker

### Day 5: 缓存与增量对比

| 任务 | 描述 | 输出文件 |
|------|------|----------|
| 10.1 | 实现目录扫描缓存 | `packages/main/src/directory/cache.ts` |
| 10.2 | 实现增量扫描逻辑 | `packages/main/src/directory/incremental.ts` |
| 10.3 | 集成缓存到 Scanner | 修改 `scanner.ts` |
| 10.4 | 实现缓存清理策略 | `packages/main/src/directory/cache-manager.ts` |

**验收标准**:
- [ ] 二次扫描使用缓存加速
- [ ] 只扫描变更的文件
- [ ] 缓存有 TTL 过期机制

---

## 第四阶段：同步与导出功能（Week 4）

**目标**: 实现目录同步、报告导出和系统集成

### Day 1-2: 目录同步功能

| 任务 | 描述 | 输出文件 |
|------|------|----------|
| 11.1 | 实现 SyncEngine | `packages/main/src/directory/sync.ts` |
| 11.2 | 实现同步计划生成器 | `packages/main/src/directory/sync-plan.ts` |
| 11.3 | 实现同步 IPC Handler | `packages/main/src/ipc/sync.handler.ts` |
| 11.4 | 实现 SyncConfirmDialog 组件 | `packages/renderer/src/features/directory/components/SyncConfirmDialog.tsx` |
| 11.5 | 实现同步进度显示 | `packages/renderer/src/features/directory/components/SyncProgress.tsx` |
| 11.6 | 编写同步功能测试 | `packages/main/src/directory/__tests__/sync.test.ts` |

**验收标准**:
- [ ] 支持双向复制、删除、合并操作
- [ ] 同步前显示确认对话框
- [ ] 同步过程显示进度
- [ ] 操作可撤销

### Day 3: 报告导出功能

| 任务 | 描述 | 输出文件 |
|------|------|----------|
| 12.1 | 实现 ReportGenerator | `packages/main/src/directory/report.ts` |
| 12.2 | 实现 HTML 报告模板 | `packages/main/src/directory/templates/html-report.hbs` |
| 12.3 | 实现 JSON/CSV 导出 | `packages/main/src/directory/report.ts` |
| 12.4 | 实现报告导出对话框 | `packages/renderer/src/features/directory/components/ExportDialog.tsx` |
| 12.5 | 添加导出 IPC 接口 | `packages/main/src/ipc/report.handler.ts` |

**验收标准**:
- [ ] 支持 HTML/JSON/CSV 三种格式
- [ ] HTML 报告包含统计图表
- [ ] 导出文件可直接在浏览器打开

### Day 4: 系统集成与菜单

| 任务 | 描述 | 输出文件 |
|------|------|----------|
| 13.1 | 集成到应用菜单 | `packages/main/src/menu/index.ts` |
| 13.2 | 添加路由配置 | `packages/renderer/src/App.tsx` |
| 13.3 | 实现快捷键支持 | `packages/renderer/src/features/shortcuts/directory-shortcuts.ts` |
| 13.4 | 实现右键菜单 | `packages/renderer/src/features/directory/components/ContextMenu.tsx` |
| 13.5 | 添加快捷键帮助 | `packages/renderer/src/components/dialogs/ShortcutsHelp.tsx` |

**验收标准**:
- [ ] 菜单可打开目录对比
- [ ] 快捷键 Ctrl+Shift+D 可用
- [ ] 右键菜单功能完整

### Day 5: 性能优化与测试

| 任务 | 描述 | 输出文件 |
|------|------|----------|
| 14.1 | 性能测试与优化 | 性能报告 |
| 14.2 | 内存使用优化 | 代码优化 |
| 14.3 | 编写集成测试 | `packages/main/src/__tests__/directory-integration.test.ts` |
| 14.4 | 编写 E2E 测试 | `e2e/directory-compare.spec.ts` |
| 14.5 | 修复 Bug 和边界情况 | Bug 修复 |

**验收标准**:
- [ ] 10000 文件对比 < 10秒
- [ ] 内存使用 < 500MB（中型项目）
- [ ] 所有测试通过

---

## 开发任务总览

### 文件结构规划

```
packages/
├── main/src/
│   └── directory/
│       ├── scanner.ts              # 目录扫描器
│       ├── comparator.ts           # 目录对比器
│       ├── filter.ts               # 过滤器
│       ├── stats.ts                # 统计计算
│       ├── sync.ts                 # 同步引擎
│       ├── sync-plan.ts            # 同步计划
│       ├── cache.ts                # 缓存系统
│       ├── incremental.ts          # 增量对比
│       ├── report.ts               # 报告生成
│       ├── index.ts                # 模块导出
│       ├── worker/
│       │   ├── scan-worker.ts      # 扫描 Worker
│       │   ├── hash-worker.ts      # 哈希 Worker
│       │   ├── pool.ts             # Worker 池
│       │   └── types.ts            # Worker 类型
│       └── __tests__/
│           ├── scanner.test.ts
│           ├── comparator.test.ts
│           ├── filter.test.ts
│           ├── sync.test.ts
│           └── integration.test.ts
├── renderer/src/
│   └── features/directory/
│       ├── DirectoryView.tsx       # 主视图
│       ├── components/
│       │   ├── DirectoryHeader.tsx
│       │   ├── FilterBar.tsx
│       │   ├── ActionToolbar.tsx
│       │   ├── DirectoryStats.tsx
│       │   ├── DirectoryTreePanel.tsx
│       │   ├── TreeNode.tsx
│       │   ├── FileIcon.tsx
│       │   ├── DiffPreviewPanel.tsx
│       │   ├── DiffPreviewDrawer.tsx
│       │   ├── SyncConfirmDialog.tsx
│       │   ├── SyncProgress.tsx
│       │   ├── ExportDialog.tsx
│       │   └── ContextMenu.tsx
│       ├── hooks/
│       │   ├── useDirectoryCompare.ts
│       │   ├── useTreeExpand.ts
│       │   ├── useFileDiff.ts
│       │   └── useVirtualScroll.ts
│       └── styles/
│           └── directory.css
└── shared/src/types/
    └── directory.types.ts          # 目录对比类型定义
```

### 依赖关系图

```
Week 1: 核心基础功能
├── scanner.ts ──► comparator.ts ──► IPC Handler
└── filter.ts ────►

Week 2: 前端界面
├── directory.types.ts ──► stores ──► components
└── hooks ──► DirectoryView.tsx

Week 3: 高级功能
├── Worker Pool ──► cache.ts ──► incremental.ts
└── virtual scroll ──► preview panel

Week 4: 同步与导出
├── sync.ts ──► sync-plan.ts ──► dialogs
└── report.ts ──► export dialog
```

---

## 测试计划

### 单元测试

| 模块 | 测试文件 | 覆盖率目标 |
|------|----------|------------|
| Scanner | `scanner.test.ts` | 85% |
| Comparator | `comparator.test.ts` | 90% |
| Filter | `filter.test.ts` | 85% |
| SyncEngine | `sync.test.ts` | 80% |
| Stores | `directory.store.test.ts` | 75% |
| Hooks | `useDirectoryCompare.test.ts` | 70% |

### 集成测试

| 场景 | 测试文件 |
|------|----------|
| 完整对比流程 | `directory-integration.test.ts` |
| IPC 通信 | `ipc-directory.test.ts` |
| Worker 池 | `worker-integration.test.ts` |
| 缓存系统 | `cache-integration.test.ts` |

### 性能测试

| 场景 | 指标 | 目标 |
|------|------|------|
| 小型项目 (100文件) | 扫描+对比时间 | < 1s |
| 中型项目 (1000文件) | 扫描+对比时间 | < 5s |
| 大型项目 (10000文件) | 扫描+对比时间 | < 30s |
| 巨型项目 (100000文件) | 扫描+对比时间 | < 120s |
| 虚拟滚动 | 帧率 | > 30fps |
| 内存使用 | 中型项目 | < 500MB |

---

## 风险评估与应对

| 风险 | 概率 | 影响 | 应对措施 |
|------|------|------|----------|
| Worker 线程兼容性 | 中 | 高 | 准备主线程降级方案 |
| 大目录性能问题 | 高 | 高 | 优先实现虚拟滚动和流式处理 |
| 同步操作数据丢失 | 低 | 极高 | 强制备份和确认对话框 |
| 类型定义冲突 | 中 | 中 | 与现有类型统一审查 |
| 内存泄漏 | 中 | 高 | 使用 WeakMap，定期内存分析 |

---

## 交付物清单

### 代码交付

- [ ] 完整的目录对比功能代码
- [ ] 单元测试和集成测试
- [ ] TypeScript 类型定义
- [ ] IPC 接口文档

### 文档交付

- [ ] API 使用文档
- [ ] 性能优化报告
- [ ] 测试报告
- [ ] 用户操作手册

### 功能验收

- [ ] P0 功能全部完成并通过测试
- [ ] P1 功能完成度 ≥ 80%
- [ ] 性能指标达到预期
- [ ] 无 blocker 级别 Bug

---

## 后续优化建议（Backlog）

| 优先级 | 功能 | 说明 |
|--------|------|------|
| P2 | 增量对比持久化 | 将缓存持久化到 SQLite |
| P2 | 目录对比会话保存 | 支持保存/恢复对比会话 |
| P3 | 文件内容搜索 | 在目录内搜索文件内容 |
| P3 | 三路目录合并 | 支持 base/left/right 三路对比 |
| P3 | 云存储对比 | 支持对比本地与云存储目录 |
| P3 | 自动同步计划 | 定时自动执行同步任务 |

---

**计划制定**: 2026-04-29  
**版本**: v1.0  
**作者**: Claude Code
