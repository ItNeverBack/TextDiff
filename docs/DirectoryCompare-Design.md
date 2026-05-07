# 文件目录对比功能模块设计文档

## 1. 功能概述

### 1.1 目标
实现可视化的文件目录层级对比功能，支持用户选择两个文件夹进行递归对比，直观展示文件差异、新增、删除和修改状态。

### 1.2 功能特性

| 特性 | 优先级 | 说明 |
|------|--------|------|
| 递归目录对比 | P0 | 支持无限层级深度对比 |
| 多种对比模式 | P0 | 仅名称 / 名称+大小 / 名称+内容 |
| 智能过滤系统 | P0 | 扩展名、Glob、正则、排除规则 |
| 树形可视化 | P0 | 可展开/折叠的目录树 |
| 文件内容预览 | P1 | 点击文件显示差异对比 |
| 目录同步操作 | P1 | 复制、删除、合并目录 |
| 差异统计报告 | P1 | 统计各类差异数量 |
| 导出对比结果 | P2 | 导出为HTML/JSON报告 |

---

## 2. 架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                         渲染进程 (Renderer)                          │
├─────────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    DirectoryCompareView                       │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────────────────┐  │  │
│  │  │ DirHeader   │  │ FilterBar   │  │ ActionToolbar         │  │  │
│  │  │ (路径显示)   │  │ (过滤器)     │  │ (操作按钮)             │  │  │
│  │  └─────────────┘  └─────────────┘  └───────────────────────┘  │  │
│  │  ┌──────────────────────────────────────────────────────────┐ │  │
│  │  │                  SplitDirectoryView                       │ │  │
│  │  │  ┌────────────────────┐  ┌────────────────────┐          │ │  │
│  │  │  │   LeftTreePanel    │  │   RightTreePanel   │          │ │  │
│  │  │  │  ┌──────────────┐  │  │  ┌──────────────┐  │          │ │  │
│  │  │  │  │ TreeNode     │  │  │  │ TreeNode     │  │          │ │  │
│  │  │  │  │ ┌──────────┐ │  │  │  │ ┌──────────┐ │  │          │ │  │
│  │  │  │  │ │Children  │ │  │  │  │ │Children  │ │  │          │ │  │
│  │  │  │  │ │(递归)    │ │  │  │  │ │(递归)    │ │  │          │ │  │
│  │  │  │  │ └──────────┘ │  │  │  │ └──────────┘ │  │          │ │  │
│  │  │  │  └──────────────┘  │  │  └──────────────┘  │          │ │  │
│  │  │  └────────────────────┘  └────────────────────┘          │ │  │
│  │  └──────────────────────────────────────────────────────────┘ │  │
│  │  ┌──────────────────────────────────────────────────────────┐ │  │
│  │  │                 DiffPreviewPanel                          │ │  │
│  │  │            (选中文件的差异预览)                             │ │  │
│  │  └──────────────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│  Stores:                    Hooks:                                  │
│  • useDirectoryCompareStore • useDirectoryCompare                   │
│  • useFilterStore           • useTreeExpand                         │
│  • useSelectionStore        • useDirSync                            │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ IPC Channels
┌───────────────────────────┼─────────────────────────────────────────┐
│                      主进程 (Main)                                   │
├───────────────────────────┼─────────────────────────────────────────┤
│                           ▼                                         │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                  DirectoryManager                             │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────────────────┐  │  │
│  │  │ Scanner     │  │ Comparator  │  │ SyncEngine            │  │  │
│  │  │ (目录扫描)   │  │ (差异对比)   │  │ (同步引擎)             │  │  │
│  │  └─────────────┘  └─────────────┘  └───────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                  WorkerPool (大目录处理)                       │  │
│  │     • 目录扫描Worker  • 文件哈希Worker  • 内容对比Worker         │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 模块职责

| 模块 | 职责 | 所在位置 |
|------|------|----------|
| **DirectoryScanner** | 递归扫描目录，收集文件元数据 | `main/src/directory/scanner.ts` |
| **DirectoryComparator** | 对比两个目录树，计算差异 | `main/src/directory/comparator.ts` |
| **FilterEngine** | 应用各种过滤规则 | `main/src/directory/filter.ts` |
| **SyncEngine** | 执行目录同步操作 | `main/src/directory/sync.ts` |
| **DirectoryStore** | 管理目录对比状态 | `renderer/src/stores/directory-store.ts` |
| **DirectoryTree** | 渲染目录树UI | `renderer/src/components/DirectoryTree/` |

---

## 3. 数据模型

### 3.1 核心类型定义

```typescript
// ============================================
// 目录对比结果
// ============================================
interface DirectoryComparison {
  id: string;                          // 对比会话ID
  leftRoot: DirectoryInfo;             // 左侧目录信息
  rightRoot: DirectoryInfo;            // 右侧目录信息
  entries: DirectoryDiffEntry[];       // 差异条目列表
  statistics: DirDiffStatistics;       // 统计信息
  completedAt: Date;                   // 完成时间
  options: DirCompareOptions;          // 对比选项
}

// ============================================
// 目录信息
// ============================================
interface DirectoryInfo {
  path: string;                        // 绝对路径
  name: string;                        // 目录名
  totalFiles: number;                  // 总文件数
  totalSize: number;                   // 总大小(字节)
  lastModified: Date;                  // 最后修改时间
}

// ============================================
// 目录差异条目 (基于现有类型扩展)
// ============================================
interface DirectoryDiffEntry {
  id: string;                          // 唯一标识
  relativePath: string;                // 相对路径
  name: string;                        // 文件名
  type: 'file' | 'directory';          // 类型
  
  // 状态扩展
  status: DiffStatus;
  statusDetail?: StatusDetail;         // 详细状态说明
  
  // 路径信息
  leftPath: string | null;
  rightPath: string | null;
  
  // 文件元数据
  leftMetadata?: FileMetadata;
  rightMetadata?: FileMetadata;
  
  // 树形结构
  children?: DirectoryDiffEntry[];
  parentId?: string;
  depth: number;                       // 层级深度
  
  // UI状态 (客户端)
  isExpanded?: boolean;
  isSelected?: boolean;
  isVisible?: boolean;                 // 过滤后可见性
}

// ============================================
// 文件元数据
// ============================================
interface FileMetadata {
  size: number;
  modifiedTime: Date;
  createdTime: Date;
  hash?: string;                       // 文件内容哈希
  permissions: string;                 // 权限模式
}

// ============================================
// 差异状态枚举
// ============================================
type DiffStatus = 
  | 'equal'           // 完全相同
  | 'modified'        // 内容修改
  | 'left-only'       // 仅左侧存在
  | 'right-only'      // 仅右侧存在
  | 'type-changed'    // 类型变更(文件↔目录)
  | 'permission-changed'; // 仅权限变更

interface StatusDetail {
  code: DiffStatus;
  label: string;
  description: string;
  severity: 'info' | 'warning' | 'error';
}

// ============================================
// 对比选项
// ============================================
interface DirCompareOptions {
  // 对比模式
  compareMode: 'name' | 'size' | 'content' | 'full';
  
  // 内容对比选项 (当compareMode为content/full时)
  contentOptions?: {
    algorithm: 'myers' | 'patience' | 'histogram';
    ignoreWhitespace: boolean;
    ignoreCase: boolean;
    ignoreLineEndings: boolean;
    maxFileSize: number;              // 超过此大小跳过内容对比
  };
  
  // 过滤器
  filters: DirectoryFilter[];
  
  // 递归选项
  recursive: boolean;
  maxDepth?: number;                   // 最大递归深度
  
  // 性能选项
  useHash: boolean;                    // 使用哈希加速对比
  parallel: boolean;                   // 并行处理
  workerCount: number;                 // Worker线程数
}

// ============================================
// 过滤器定义
// ============================================
type DirectoryFilter = 
  | ExtensionFilter 
  | GlobFilter 
  | RegexFilter 
  | SizeFilter
  | DateFilter;

interface BaseFilter {
  id: string;
  type: string;
  enabled: boolean;
  invert: boolean;                     // 反转匹配
}

interface ExtensionFilter extends BaseFilter {
  type: 'extension';
  extensions: string[];                // ['.ts', '.js']
  caseSensitive: boolean;
}

interface GlobFilter extends BaseFilter {
  type: 'glob';
  patterns: string[];                  // ['*.test.ts', 'node_modules/**']
}

interface RegexFilter extends BaseFilter {
  type: 'regex';
  pattern: string;
  flags: string;
}

interface SizeFilter extends BaseFilter {
  type: 'size';
  minSize?: number;
  maxSize?: number;
}

interface DateFilter extends BaseFilter {
  type: 'date';
  modifiedAfter?: Date;
  modifiedBefore?: Date;
}

// ============================================
// 统计信息
// ============================================
interface DirDiffStatistics {
  totalFiles: number;                  // 总文件数
  totalDirectories: number;            // 总目录数
  leftOnly: number;                    // 仅左侧数量
  rightOnly: number;                   // 仅右侧数量
  modified: number;                    // 修改数量
  equal: number;                       // 相同数量
  totalSizeLeft: number;               // 左侧总大小
  totalSizeRight: number;              // 右侧总大小
  scannedAt: Date;                     // 扫描时间
  duration: number;                    // 耗时(ms)
}
```

### 3.2 状态流转图

```
┌──────────────┐     扫描完成      ┌──────────────┐
│   pending    │ ───────────────▶ │  comparing   │
└──────────────┘                  └──────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
            ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
            │  completed   │    │   failed     │    │  cancelled   │
            └──────────────┘    └──────────────┘    └──────────────┘
                    │
                    ▼
            ┌──────────────┐
            │   syncing    │ ◀── 执行同步操作
            └──────────────┘
```

---

## 4. 核心算法设计

### 4.1 目录对比算法

```typescript
/**
 * 目录对比主流程
 */
async function compareDirectories(
  leftPath: string,
  rightPath: string,
  options: DirCompareOptions
): Promise<DirectoryComparison> {
  // 1. 并行扫描两个目录
  const [leftTree, rightTree] = await Promise.all([
    scanDirectory(leftPath, options),
    scanDirectory(rightPath, options)
  ]);
  
  // 2. 构建路径索引
  const leftIndex = buildPathIndex(leftTree);
  const rightIndex = buildPathIndex(rightTree);
  
  // 3. 对比并生成差异树
  const diffTree = await computeDirectoryDiff(
    leftTree, 
    rightTree, 
    leftIndex, 
    rightIndex, 
    options
  );
  
  // 4. 计算统计信息
  const stats = computeStatistics(diffTree);
  
  // 5. 应用过滤器
  const filteredTree = applyFilters(diffTree, options.filters);
  
  return {
    id: generateId(),
    leftRoot: extractDirInfo(leftTree),
    rightRoot: extractDirInfo(rightTree),
    entries: filteredTree,
    statistics: stats,
    completedAt: new Date(),
    options
  };
}

/**
 * 递归扫描目录
 */
async function scanDirectory(
  rootPath: string,
  options: DirCompareOptions
): Promise<DirTreeNode> {
  const node: DirTreeNode = {
    path: rootPath,
    name: basename(rootPath),
    type: 'directory',
    children: [],
    metadata: await getDirMetadata(rootPath)
  };
  
  const entries = await readdir(rootPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = join(rootPath, entry.name);
    const relativePath = relative(rootPath, fullPath);
    
    // 应用排除规则
    if (shouldExclude(relativePath, entry, options.filters)) {
      continue;
    }
    
    if (entry.isDirectory() && options.recursive) {
      // 递归扫描子目录
      const childNode = await scanDirectory(fullPath, options);
      node.children!.push(childNode);
    } else if (entry.isFile()) {
      // 收集文件元数据
      const fileNode: DirTreeNode = {
        path: fullPath,
        name: entry.name,
        type: 'file',
        metadata: await getFileMetadata(fullPath, options.useHash)
      };
      node.children!.push(fileNode);
    }
  }
  
  return node;
}

/**
 * 计算目录差异
 */
async function computeDirectoryDiff(
  left: DirTreeNode,
  right: DirTreeNode,
  leftIndex: Map<string, DirTreeNode>,
  rightIndex: Map<string, DirTreeNode>,
  options: DirCompareOptions
): Promise<DirectoryDiffEntry[]> {
  const result: DirectoryDiffEntry[] = [];
  const allPaths = new Set([
    ...leftIndex.keys(),
    ...rightIndex.keys()
  ]);
  
  for (const relativePath of allPaths) {
    const leftNode = leftIndex.get(relativePath);
    const rightNode = rightIndex.get(relativePath);
    
    const entry = await compareNodes(
      relativePath,
      leftNode,
      rightNode,
      options
    );
    
    result.push(entry);
  }
  
  // 构建树形结构
  return buildTreeStructure(result);
}

/**
 * 对比单个节点
 */
async function compareNodes(
  relativePath: string,
  left: DirTreeNode | undefined,
  right: DirTreeNode | undefined,
  options: DirCompareOptions
): Promise<DirectoryDiffEntry> {
  const entry: DirectoryDiffEntry = {
    id: generateId(),
    relativePath,
    name: basename(relativePath),
    type: left?.type || right?.type || 'file',
    leftPath: left?.path || null,
    rightPath: right?.path || null,
    leftMetadata: left?.metadata,
    rightMetadata: right?.metadata,
    depth: relativePath.split(sep).length - 1
  };
  
  // 确定状态
  if (!left) {
    entry.status = 'right-only';
  } else if (!right) {
    entry.status = 'left-only';
  } else if (left.type !== right.type) {
    entry.status = 'type-changed';
  } else {
    entry.status = await compareContent(left, right, options);
  }
  
  // 递归处理子目录
  if (entry.type === 'directory' && left?.children && right?.children) {
    entry.children = await computeDirectoryDiff(
      left, right,
      buildPathIndex(left),
      buildPathIndex(right),
      options
    );
  }
  
  return entry;
}

/**
 * 内容对比
 */
async function compareContent(
  left: DirTreeNode,
  right: DirTreeNode,
  options: DirCompareOptions
): Promise<DiffStatus> {
  switch (options.compareMode) {
    case 'name':
      return 'equal';
      
    case 'size':
      return left.metadata!.size === right.metadata!.size 
        ? 'equal' 
        : 'modified';
      
    case 'content':
    case 'full':
      // 快速检查：大小不同则内容一定不同
      if (left.metadata!.size !== right.metadata!.size) {
        return 'modified';
      }
      
      // 哈希对比
      if (options.useHash) {
        const leftHash = await computeHash(left.path);
        const rightHash = await computeHash(right.path);
        return leftHash === rightHash ? 'equal' : 'modified';
      }
      
      // 完整内容对比
      return await compareFileContent(left.path, right.path, options);
  }
}
```

### 4.2 性能优化策略

```typescript
// ============================================
// 1. 多线程 Worker 池
// ============================================
class DirectoryWorkerPool {
  private workers: Worker[] = [];
  private queue: Task[] = [];
  
  async scanInParallel(
    paths: string[], 
    options: DirCompareOptions
  ): Promise<DirTreeNode[]> {
    const chunks = this.chunkPaths(paths, this.workerCount);
    const promises = chunks.map(chunk => 
      this.executeOnWorker('scan', { paths: chunk, options })
    );
    return (await Promise.all(promises)).flat();
  }
}

// ============================================
// 2. 增量对比缓存
// ============================================
interface DirectoryCache {
  path: string;
  entries: Map<string, CacheEntry>;
  lastScan: Date;
}

interface CacheEntry {
  relativePath: string;
  metadata: FileMetadata;
  hash: string;
  mtime: Date;
}

/**
 * 增量扫描 - 只处理变更的文件
 */
async function incrementalScan(
  previousCache: DirectoryCache,
  rootPath: string
): Promise<{ changes: DirTreeNode[]; cache: DirectoryCache }> {
  const changes: DirTreeNode[] = [];
  const newCache: DirectoryCache = {
    path: rootPath,
    entries: new Map(),
    lastScan: new Date()
  };
  
  const currentEntries = await listAllFiles(rootPath);
  
  for (const entry of currentEntries) {
    const cached = previousCache.entries.get(entry.relativePath);
    
    // 文件新增或修改
    if (!cached || cached.mtime < entry.metadata.modifiedTime) {
      changes.push(entry);
    }
    
    newCache.entries.set(entry.relativePath, {
      relativePath: entry.relativePath,
      metadata: entry.metadata,
      hash: entry.metadata.hash || '',
      mtime: entry.metadata.modifiedTime
    });
  }
  
  // 检测删除的文件
  for (const [path, cached] of previousCache.entries) {
    if (!currentEntries.find(e => e.relativePath === path)) {
      changes.push({
        relativePath: path,
        type: 'deleted',
        metadata: cached.metadata
      } as any);
    }
  }
  
  return { changes, cache: newCache };
}

// ============================================
// 3. 虚拟滚动 (渲染大量文件)
// ============================================
interface VirtualScrollConfig {
  itemHeight: number;           // 每项高度
  overscan: number;             // 额外渲染数量
  containerHeight: number;      // 容器高度
}

function useVirtualScroll(
  items: DirectoryDiffEntry[],
  config: VirtualScrollConfig
) {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / config.itemHeight);
    const visibleCount = Math.ceil(config.containerHeight / config.itemHeight);
    const end = Math.min(start + visibleCount + config.overscan, items.length);
    return { start: Math.max(0, start - config.overscan), end };
  }, [scrollTop, items.length]);
  
  const visibleItems = useMemo(() => 
    items.slice(visibleRange.start, visibleRange.end).map((item, idx) => ({
      ...item,
      index: visibleRange.start + idx,
      style: {
        position: 'absolute',
        top: (visibleRange.start + idx) * config.itemHeight,
        height: config.itemHeight
      }
    })),
    [items, visibleRange]
  );
  
  const totalHeight = items.length * config.itemHeight;
  
  return { visibleItems, totalHeight, setScrollTop };
}
```

---

## 5. 用户界面设计

### 5.1 界面布局

```
┌─────────────────────────────────────────────────────────────────────┐
│  🔙 返回  │  📁 dir-a  vs  📁 dir-b                    [设置] [?]  │
├─────────────────────────────────────────────────────────────────────┤
│  [全部 ▼] [🔍 搜索...] [📄 *.ts ▼] [🚫 node_modules ▼] [🔄 刷新]   │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  📊 统计: 共 1,234 个文件 │ 相同: 900 │ 不同: 200 │ 仅左: 84 │   ││
│  │       仅右: 50 │ 过滤隐藏: 120                                  ││
│  └─────────────────────────────────────────────────────────────────┘│
├──────────────────────────┬──────────────────────────────────────────┤
│  📁 dir-a/               │  📁 dir-b/                               │
│  ▼ 📂 src/               │  ▼ 📂 src/                               │
│    ▶ 📂 components/      │    ▶ 📂 components/                      │
│    ▼ 📂 utils/           │    ▼ 📂 utils/                           │
│      📄 helper.ts  ✓     │      📄 helper.ts  ✓                     │
│      📄 parser.ts  ✏️    │      📄 parser.ts  ✏️                     │
│    📄 index.ts  ✓        │    📄 index.ts  ✓                        │
│  ▶ 📂 tests/             │  ▶ 📂 tests/                             │
│  📄 package.json  ✓      │  📄 package.json  ✓                      │
│  📄 README.md  ➕        │                                         │
│                         │  📄 LICENSE  ➖                          │
├──────────────────────────┴──────────────────────────────────────────┤
│  📋 差异预览                                          [展开 ▼]      │
│  ─────────────────────────────────────────────────────────────────  │
│  📄 src/utils/parser.ts                                             │
│  ┌─────────────────────────┬───────────────────────────────────────┐│
│  │  1  │ function parse() {│  1  │ function parse() {              ││
│  │  2  │   return a + b;   │  2  │   return a - b;    ← 修改       ││
│  │  3  │ }                 │  3  │ }                               ││
│  └─────────────────────────┴───────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 组件层次结构

```typescript
// ============================================
// 主容器组件
// ============================================
function DirectoryCompareView() {
  const { comparison, isLoading } = useDirectoryCompareStore();
  
  return (
    <div className="directory-compare-view">
      <DirCompareHeader />
      <DirCompareToolbar />
      <DirCompareStats />
      <SplitPane split="vertical">
        <DirTreePanel 
          side="left"
          root={comparison?.leftRoot}
          entries={comparison?.entries}
        />
        <DirTreePanel 
          side="right"
          root={comparison?.rightRoot}
          entries={comparison?.entries}
        />
      </SplitPane>
      <DiffPreviewDrawer />
    </div>
  );
}

// ============================================
// 目录树面板
// ============================================
function DirTreePanel({ side, root, entries }: DirTreePanelProps) {
  const { expandedPaths, toggleExpand } = useTreeExpand();
  const { selectedEntry, setSelectedEntry } = useSelectionStore();
  
  const visibleEntries = useMemo(() => 
    flattenTree(entries, expandedPaths),
    [entries, expandedPaths]
  );
  
  return (
    <div className="dir-tree-panel">
      <DirPanelHeader path={root?.path} />
      <VirtualList
        items={visibleEntries}
        renderItem={(entry) => (
          <TreeNode
            key={entry.id}
            entry={entry}
            side={side}
            isExpanded={expandedPaths.has(entry.relativePath)}
            isSelected={selectedEntry?.id === entry.id}
            onToggle={() => toggleExpand(entry.relativePath)}
            onSelect={() => setSelectedEntry(entry)}
          />
        )}
      />
    </div>
  );
}

// ============================================
// 树节点组件
// ============================================
function TreeNode({ 
  entry, 
  side, 
  isExpanded, 
  isSelected,
  onToggle, 
  onSelect 
}: TreeNodeProps) {
  const Icon = getFileIcon(entry.type, entry.name);
  const StatusIcon = getStatusIcon(entry.status);
  
  return (
    <div 
      className={cn('tree-node', {
        'selected': isSelected,
        [`status-${entry.status}`]: true
      })}
      style={{ paddingLeft: entry.depth * 20 }}
      onClick={onSelect}
    >
      {entry.type === 'directory' && (
        <button onClick={(e) => { e.stopPropagation(); onToggle(); }}>
          {isExpanded ? '▼' : '▶'}
        </button>
      )}
      <Icon className="file-icon" />
      <span className="file-name">{entry.name}</span>
      <StatusIcon className="status-icon" title={getStatusLabel(entry.status)} />
      
      {/* 操作按钮 */}
      {entry.status !== 'equal' && (
        <ActionButtons entry={entry} side={side} />
      )}
    </div>
  );
}
```

### 5.3 视觉设计规范

```css
/* ============================================
   状态颜色系统
   ============================================ */
:root {
  /* 差异状态 */
  --diff-equal: #22c55e;
  --diff-modified: #f59e0b;
  --diff-left-only: #3b82f6;
  --diff-right-only: #ef4444;
  --diff-type-changed: #8b5cf6;
  
  /* 背景色 */
  --bg-equal: rgba(34, 197, 94, 0.1);
  --bg-modified: rgba(245, 158, 11, 0.1);
  --bg-left-only: rgba(59, 130, 246, 0.1);
  --bg-right-only: rgba(239, 68, 68, 0.1);
  
  /* 文本颜色 */
  --text-primary: #1f2937;
  --text-secondary: #6b7280;
  --text-status: #ffffff;
}

/* ============================================
   树节点样式
   ============================================ */
.tree-node {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.15s;
}

.tree-node:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.tree-node.selected {
  background-color: rgba(59, 130, 246, 0.2);
}

/* 状态指示条 */
.tree-node::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
}

.tree-node.status-equal::before { background-color: var(--diff-equal); }
.tree-node.status-modified::before { background-color: var(--diff-modified); }
.tree-node.status-left-only::before { background-color: var(--diff-left-only); }
.tree-node.status-right-only::before { background-color: var(--diff-right-only); }

/* 文件图标 */
.file-icon {
  width: 16px;
  height: 16px;
  margin: 0 8px;
  color: var(--text-secondary);
}

/* 状态标签 */
.status-badge {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  color: var(--text-status);
}

.status-badge.equal { background-color: var(--diff-equal); }
.status-badge.modified { background-color: var(--diff-modified); }
.status-badge.left-only { background-color: var(--diff-left-only); }
.status-badge.right-only { background-color: var(--diff-right-only); }
```

---

## 6. 交互设计

### 6.1 用户操作流程

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   启动      │───▶│  选择目录   │───▶│  对比设置   │───▶│  执行对比   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
                                                               │
                                                               ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  导出报告   │◀───│  同步操作   │◀───│  查看差异   │◀───│  查看结果   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

### 6.2 快捷键设计

| 快捷键 | 功能 | 说明 |
|--------|------|------|
| `Ctrl/Cmd + Shift + D` | 打开目录对比 | 全局快捷键 |
| `↑/↓` | 导航条目 | 上下选择 |
| `←/→` | 展开/折叠 | 目录节点 |
| `Enter` | 查看差异 | 选中文件 |
| `Space` | 快速预览 | 差异弹窗 |
| `Ctrl/Cmd + F` | 搜索文件 | 文件名过滤 |
| `Ctrl/Cmd + 1/2/3` | 切换视图 | 全部/仅差异/仅冲突 |
| `F5` | 刷新对比 | 重新扫描 |
| `Del` | 删除文件 | 需要确认 |
| `Ctrl/Cmd + C` | 复制路径 | 选中条目 |

### 6.3 右键菜单

```typescript
interface ContextMenuItem {
  label: string;
  icon?: string;
  shortcut?: string;
  action: () => void;
  disabled?: boolean;
  divider?: boolean;
}

const fileContextMenu: ContextMenuItem[] = [
  { label: '查看差异', icon: 'diff', shortcut: 'Enter', action: viewDiff },
  { label: '编辑文件', icon: 'edit', action: editFile },
  { divider: true },
  { label: '复制到另一侧', icon: 'copy', action: copyToOtherSide },
  { label: '删除', icon: 'delete', shortcut: 'Del', action: deleteFile },
  { divider: true },
  { label: '复制路径', icon: 'link', shortcut: 'Ctrl+C', action: copyPath },
  { label: '在资源管理器中显示', icon: 'folder', action: showInExplorer },
  { label: '忽略此文件', icon: 'ignore', action: ignoreFile }
];

const directoryContextMenu: ContextMenuItem[] = [
  { label: '展开全部', icon: 'expand', action: expandAll },
  { label: '折叠全部', icon: 'collapse', action: collapseAll },
  { divider: true },
  { label: '同步此目录', icon: 'sync', action: syncDirectory },
  { label: '复制目录结构', icon: 'structure', action: copyStructure }
];
```

---

## 7. 目录同步功能

### 7.1 同步策略

```typescript
type SyncAction = 
  | 'copy-left-to-right'
  | 'copy-right-to-left'
  | 'delete-left'
  | 'delete-right'
  | 'merge'
  | 'ignore';

interface SyncOperation {
  id: string;
  entry: DirectoryDiffEntry;
  action: SyncAction;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  error?: string;
}

interface SyncPlan {
  operations: SyncOperation[];
  stats: {
    copyOperations: number;
    deleteOperations: number;
    totalBytes: number;
  };
  warnings: string[];
}

/**
 * 生成同步计划
 */
async function generateSyncPlan(
  entries: DirectoryDiffEntry[],
  strategy: SyncStrategy
): Promise<SyncPlan> {
  const plan: SyncPlan = {
    operations: [],
    stats: { copyOperations: 0, deleteOperations: 0, totalBytes: 0 },
    warnings: []
  };
  
  for (const entry of entries) {
    if (entry.status === 'equal') continue;
    
    const operation = determineSyncAction(entry, strategy);
    if (operation) {
      plan.operations.push(operation);
      updateStats(plan.stats, operation);
    }
    
    // 递归处理子目录
    if (entry.children) {
      const childPlan = await generateSyncPlan(entry.children, strategy);
      plan.operations.push(...childPlan.operations);
    }
  }
  
  return plan;
}

/**
 * 执行同步操作
 */
async function executeSync(
  plan: SyncPlan,
  onProgress: (progress: SyncProgress) => void
): Promise<SyncResult> {
  const results: SyncOperation[] = [];
  
  for (let i = 0; i < plan.operations.length; i++) {
    const operation = plan.operations[i];
    
    try {
      operation.status = 'in-progress';
      await executeOperation(operation);
      operation.status = 'completed';
    } catch (error) {
      operation.status = 'failed';
      operation.error = error.message;
    }
    
    results.push(operation);
    
    onProgress({
      completed: i + 1,
      total: plan.operations.length,
      current: operation,
      percentage: Math.round((i + 1) / plan.operations.length * 100)
    });
  }
  
  return { operations: results, success: results.every(r => r.status === 'completed') };
}
```

### 7.2 同步确认对话框

```
┌─────────────────────────────────────────────────────────────────────┐
│  ⚠️  即将执行同步操作                                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  目标: 将左侧目录同步到右侧                                          │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  📊 操作统计                                                    │  │
│  │  • 复制文件: 45 个   (12.5 MB)                                  │  │
│  │  • 删除文件: 12 个                                              │  │
│  │  • 覆盖文件: 8 个    (警告: 右侧较新)                            │  │
│  │  • 创建目录: 3 个                                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  ⚠️ 警告                                                        │  │
│  │  • 右侧目录有 8 个文件比左侧新，将被覆盖                          │  │
│  │  • 12 个文件将在右侧被永久删除                                   │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  [☑️] 创建备份 (.backup)                                            │
│  [☑️] 确认覆盖较新文件                                              │
│                                                                     │
│              [ 取消 ]    [ 预览详细列表 ]    [ 确认同步 ▶ ]          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 8. 导出报告功能

### 8.1 报告格式

```typescript
type ReportFormat = 'html' | 'json' | 'csv' | 'xml';

interface ReportOptions {
  format: ReportFormat;
  includeEqual: boolean;           // 包含相同文件
  includeContent: boolean;         // 包含内容差异
  maxContentLength?: number;       // 内容最大长度
  template?: string;               // HTML模板
}

/**
 * 生成对比报告
 */
async function generateReport(
  comparison: DirectoryComparison,
  options: ReportOptions
): Promise<string> {
  switch (options.format) {
    case 'html':
      return generateHtmlReport(comparison, options);
    case 'json':
      return generateJsonReport(comparison, options);
    case 'csv':
      return generateCsvReport(comparison, options);
    case 'xml':
      return generateXmlReport(comparison, options);
    default:
      throw new Error(`Unsupported format: ${options.format}`);
  }
}

// HTML报告示例结构
interface HtmlReport {
  title: string;
  summary: {
    leftPath: string;
    rightPath: string;
    totalFiles: number;
    statistics: DirDiffStatistics;
  };
  filters: DirectoryFilter[];
  entries: HtmlEntry[];
  generatedAt: Date;
}

interface HtmlEntry {
  relativePath: string;
  status: DiffStatus;
  leftInfo?: FileInfo;
  rightInfo?: FileInfo;
  diffHtml?: string;  // 格式化后的差异HTML
}
```

### 8.2 HTML报告预览

报告包含以下部分：
1. **概览页** - 统计信息和饼图
2. **差异列表** - 可搜索过滤的表格
3. **详情页** - 单个文件的详细对比
4. **树形视图** - 交互式目录树

---

## 9. 集成到现有系统

### 9.1 IPC接口扩展

```typescript
// packages/shared/src/types/ipc.types.ts

interface TextDiffAPI {
  // 现有接口...
  
  // 目录对比
  directory: {
    compare: (left: string, right: string, options: DirCompareOptions) 
      => Promise<DirectoryComparison>;
    cancel: (comparisonId: string) => Promise<void>;
    getProgress: (comparisonId: string) => Promise<ComparisonProgress>;
  };
  
  // 目录同步
  directorySync: {
    generatePlan: (entries: DirectoryDiffEntry[], strategy: SyncStrategy) 
      => Promise<SyncPlan>;
    execute: (plan: SyncPlan) => Promise<SyncResult>;
    validate: (plan: SyncPlan) => Promise<ValidationResult>;
  };
  
  // 报告导出
  report: {
    generate: (comparison: DirectoryComparison, options: ReportOptions) 
      => Promise<string>;
    save: (content: string, format: ReportFormat) => Promise<void>;
  };
}
```

### 9.2 路由集成

```typescript
// packages/renderer/src/App.tsx

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<WelcomeView />} />
        <Route path="/file-diff" element={<FileDiffView />} />
        <Route path="/directory-diff" element={<DirectoryCompareView />} />
        <Route path="/merge" element={<MergeView />} />
        <Route path="/settings" element={<SettingsView />} />
      </Routes>
    </Router>
  );
}
```

### 9.3 菜单集成

```typescript
// packages/main/src/menu/index.ts

const menuTemplate: MenuItemConstructorOptions[] = [
  {
    label: '文件',
    submenu: [
      {
        label: '打开文件对比',
        accelerator: 'CmdOrCtrl+O',
        click: () => openFileDiff()
      },
      {
        label: '打开目录对比',
        accelerator: 'CmdOrCtrl+Shift+O',
        click: () => openDirectoryDiff()
      },
      { type: 'separator' },
      {
        label: '最近的目录对比',
        submenu: recentDirectories.map(dir => ({
          label: `${dir.left} vs ${dir.right}`,
          click: () => openRecentDirectoryComparison(dir)
        }))
      }
    ]
  }
];
```

---

## 10. 性能与优化

### 10.1 大目录处理

| 策略 | 实现 | 阈值 |
|------|------|------|
| Worker线程 | 目录扫描Worker池 | > 1000 文件 |
| 增量扫描 | 缓存 + mtime检查 | 任意目录 |
| 虚拟滚动 | 只渲染可见条目 | > 100 条目 |
| 延迟加载 | 按需加载子目录 | 深层嵌套 |
| 流式处理 | 生成器 + 流 | > 10,000 文件 |

### 10.2 内存优化

```typescript
// 使用对象池减少GC
class NodePool {
  private pool: DirectoryDiffEntry[] = [];
  private maxSize = 1000;
  
  acquire(): DirectoryDiffEntry {
    return this.pool.pop() || this.createNew();
  }
  
  release(node: DirectoryDiffEntry) {
    if (this.pool.length < this.maxSize) {
      this.reset(node);
      this.pool.push(node);
    }
  }
}

// 使用WeakMap缓存哈希
const hashCache = new WeakMap<FileMetadata, string>();

// 大数据集分页
interface PagedResult<T> {
  data: T[];
  hasMore: boolean;
  nextCursor?: string;
}
```

---

## 11. 测试策略

### 11.1 测试覆盖

| 模块 | 单元测试 | 集成测试 | E2E测试 |
|------|----------|----------|---------|
| Scanner | ✅ | ✅ | - |
| Comparator | ✅ | ✅ | - |
| FilterEngine | ✅ | ✅ | - |
| SyncEngine | ✅ | ✅ | - |
| DirectoryStore | ✅ | - | - |
| Tree组件 | ✅ | ✅ | ✅ |
| 完整流程 | - | ✅ | ✅ |

### 11.2 性能测试场景

```typescript
// 测试数据集
const testScenarios = [
  { name: '小型项目', files: 100, depth: 3 },
  { name: '中型项目', files: 1000, depth: 5 },
  { name: '大型项目', files: 10000, depth: 8 },
  { name: '巨型项目', files: 100000, depth: 10 }
];

// 性能指标
const benchmarks = {
  scanTime: '< 1s (小型), < 5s (中型), < 30s (大型)',
  compareTime: '< 500ms (小型), < 3s (中型), < 15s (大型)',
  renderTime: '< 100ms (首屏)',
  memoryUsage: '< 100MB (小型), < 500MB (中型), < 2GB (大型)'
};
```

---

## 12. 总结

### 12.1 功能实现清单

| 阶段 | 功能 | 工作量 | 依赖 |
|------|------|--------|------|
| P0 | 目录扫描与对比 | 3天 | 无 |
| P0 | 树形可视化 | 2天 | P0-1 |
| P0 | 过滤系统 | 2天 | P0-1 |
| P1 | 内容预览 | 2天 | P0 |
| P1 | 目录同步 | 3天 | P0 |
| P1 | 统计报告 | 2天 | P0 |
| P2 | 导出功能 | 1天 | P1 |
| P2 | 增量对比 | 2天 | P0 |

### 12.2 架构优势

1. **模块化设计** - 扫描、对比、同步独立模块
2. **高性能** - Worker池 + 增量更新 + 虚拟滚动
3. **可扩展** - 插件化过滤器系统
4. **类型安全** - 完整的TypeScript类型定义
5. **测试友好** - 各层可独立测试

### 12.3 与现有系统的兼容性

✅ **完全兼容**现有文件对比功能  
✅ **复用**现有的Diff引擎和UI组件  
✅ **统一**的IPC通信机制  
✅ **一致**的设计语言和交互模式  

---

这份设计文档基于软件现有架构进行设计，充分利用了已实现的目录对比基础功能，同时扩展了同步、报告、性能优化等高级功能。建议按优先级分阶段实施，确保每个阶段都有可用的功能交付。
