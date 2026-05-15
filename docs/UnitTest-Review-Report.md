# TextDiff 单元测试检查报告

> 基于 `docs/UnitTest-Design.md` 检查当前测试情况
> 检查日期：2026-05-13

---

## 总体评估

| 项目 | 状态 |
|------|------|
| 已有测试文件数 | 27 个 |
| 设计文档要求文件数 | 约 45 个 |
| 覆盖率估计 | 约 60% |

---

## 当前测试结果统计

**运行命令**: `npm run test -- --run`

| 指标 | 数值 |
|------|------|
| 测试文件总数 | 27 个 |
| 通过的测试文件 | 10 个 |
| **失败的测试文件** | **17 个** |
| 总测试数 | 618 个 |
| 通过的测试 | 529 个 |
| **失败的测试** | **89 个** |
| **未处理的错误** | **2 个** |

### 通过的测试文件 (10个)

1. `packages/main/src/diff/__tests__/myers.test.ts` ✅
2. `packages/main/src/diff/__tests__/patience.test.ts` ✅
3. `packages/main/src/diff/__tests__/histogram.test.ts` ✅
4. `packages/main/src/diff/__tests__/diff-engine.unit.test.ts` ✅
5. `packages/main/src/diff/__tests__/inline.test.ts` ✅
6. `packages/main/src/diff/__tests__/chunk-builder.test.ts` ✅
7. `packages/main/src/diff/__tests__/stats-calculator.test.ts` ✅
8. `packages/main/src/diff/__tests__/three-way.test.ts` ✅
9. `packages/main/src/diff/__tests__/cache.test.ts` ✅
10. `packages/main/src/diff/__tests__/incremental.test.ts` ✅

---

## 测试失败问题分类

### 1. React 并发渲染问题 ⚠️ [ HIGH PRIORITY ]

**影响文件**: 
- `packages/renderer/src/hooks/__tests__/useDiff.test.ts`

**错误信息**:
```
Error: Should not already be working.
  at performConcurrentWorkOnRoot (react-dom.development.js:25742:11)
```

**原因分析**:
- React 18 的并发模式 (`createRoot`) 与 `@testing-library/react` 的 `renderHook` 在测试环境中存在兼容性问题
- 多个 `renderHook` 调用在单个测试文件中时，React 的并发调度器状态没有正确重置

**解决方案**:
1. 在 `setup.ts` 中添加React测试环境的特殊配置：
```typescript
// packages/renderer/src/__tests__/setup.ts
import { cleanup } from '@testing-library/react'

// 每个测试后强制清理 React 树
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
```

2. 或者将 `useDiff.test.ts` 重构为使用 `act()` 包装的状态更新

---

### 2. Immer MapSet 插件未启用 ⚠️ [ HIGH PRIORITY ]

**影响文件**:
- `packages/renderer/src/stores/__tests__/directory.store.test.ts`

**错误信息**:
```
Error: [Immer] The plugin for 'MapSet' has not been loaded into Immer. 
To enable the plugin, import and call `enableMapSet()` when initializing your application.
```

**原因分析**:
- `directory.store.ts` 使用了 `Set` (如 `selectedPaths`, `expandedPaths`)
- Immer 默认不处理 Set/Map，需要显式启用 `enableMapSet()` 插件
- 应用在运行时通过 `main.tsx` 启用了插件，但测试环境没有

**解决方案**:
在 `setup.ts` 中添加：
```typescript
import { enableMapSet } from 'immer'
enableMapSet()
```

---

### 3. Settings Store 依赖问题 ⚠️ [ HIGH PRIORITY ]

**影响文件**:
- `packages/renderer/src/stores/__tests__/tab.store.test.ts`
- `packages/renderer/src/stores/__tests__/diff.store.test.ts`

**错误信息**:
```
TypeError: Cannot read properties of undefined (reading 'diff')
  at getOptionsFromSettings (diff.store.ts:42:32)
```

**原因分析**:
- `diff.store.ts` 的 `reset()` 和 `getOptionsFromSettings()` 直接依赖 `useSettingsStore.getState()`
- `settings.store.ts` 在测试环境中没有正确初始化（`settings` 为 `undefined`）
- `tab.store.ts` 调用 `addTab` 时会触发 `useDiffStore.getState().reset()`，进而触发依赖

**解决方案**:
1. 在 `setup.ts` 中初始化 settings store：
```typescript
import { useSettingsStore } from '../stores/settings.store'
import { DEFAULT_SETTINGS } from '@shared/types/settings.types'

// 在测试开始前初始化 settings
useSettingsStore.setState({
  settings: DEFAULT_SETTINGS,
  isLoading: false,
  error: null
})
```

2. 或者修改 store 实现，在依赖不存在时使用默认值回退

---

### 4. Filter Store 断言失败 ⚠️ [ MEDIUM PRIORITY ]

**影响文件**:
- `packages/renderer/src/stores/__tests__/filter.store.test.ts`

**失败测试**:
```typescript
describe('createFilterFunction', () => {
  it('glob 过滤', () => {
    // 期望: glob '*.md' 应该匹配 'file.md' (true)
    // 实际: 返回 false
    expect(filterFn({ name: 'file.md', type: 'file', status: 'equal', ... })).toBe(true)
    // 期望: glob '*.md' 不应该匹配 'file.js' (false)
    // 实际: 返回 true
    expect(filterFn({ name: 'file.js', type: 'file', status: 'equal', ... })).toBe(false)
  })
})
```

**原因分析**:
- glob 过滤逻辑可能与测试期望不符
- 可能是 glob 匹配算法实现有问题（如大小写敏感、通配符解析等）
- 或者测试期望与实际设计不符

**解决方案**:
需要检查 `filter.store.ts` 中的 `createFilterFunction` 实现，确认：
1. `micromatch` 或自定义 glob 匹配是否正确使用
2. 测试期望是否需要调整

---

### 5. Directory Store 展开深度问题 ⚠️ [ MEDIUM PRIORITY ]

**影响文件**:
- `packages/renderer/src/stores/__tests__/directory.store.test.ts`

**失败测试**:
```typescript
it('expandToDepth 展开到指定深度', () => {
  // ... 展开深度为 1
  // 期望: 'src/components' 应该被展开
  expect(useDirectoryCompareStore.getState().expandedPaths.has('src/components')).toBe(true)
  // 实际: 返回 false
})
```

**原因分析**:
- `expandToDepth` 的实现可能存在边界条件问题
- 路径格式或深度计算可能不正确

---

### 6. Sync 测试失败 ⚠️ [ MEDIUM PRIORITY ]

**影响文件**:
- `packages/main/src/diff/__tests__/sync.test.ts`
- `packages/main/src/directory/__tests__/sync.test.ts`

需要在详细日志中查看具体失败原因。

---

## 1. 已完成测试（27个）

### 1.1 Diff 引擎（Main）- 8个 ✅

| 文件 | 状态 | 说明 |
|------|------|------|
| `myers.test.ts` | ✅ | 核心算法测试完整，覆盖边界、性能、可逆性 |
| `patience.test.ts` | ✅ | 替代算法测试 |
| `histogram.test.ts` | ✅ | 替代算法测试 |
| `diff-engine.unit.test.ts` | ✅ | 管道测试 |
| `inline.test.ts` | ✅ | 内联diff测试 |
| `chunk-builder.test.ts` | ✅ | Chunk构建测试 |
| `stats-calculator.test.ts` | ✅ | 统计计算测试 |
| `three-way.test.ts` | ✅ | 三路合并测试 |

### 1.2 Diff 引擎扩展（Main）- 3个 ✅

| 文件 | 状态 | 说明 |
|------|------|------|
| `cache.test.ts` | ✅ | Diff缓存测试 |
| `incremental.test.ts` | ✅ | 增量Diff测试 |
| `sync.test.ts` | ⚠️ | Diff同步测试（部分通过） |

### 1.3 目录对比引擎（Main）- 5个 ⚠️

| 文件 | 状态 | 说明 |
|------|------|------|
| `scanner.test.ts` | ✅ | 目录扫描测试 |
| `comparator.test.ts` | ✅ | 目录比较测试 |
| `filter.test.ts` | ✅ | 过滤测试 |
| `sync.test.ts` | ⚠️ | 同步测试（部分通过） |
| `integration.test.ts` | ✅ | 集成测试 |

### 1.4 Ignore 规则引擎（Main）- 2个 ✅

| 文件 | 状态 | 说明 |
|------|------|------|
| `index.test.ts` | ✅ | 预处理器集成测试 |
| `rules.test.ts` | ✅ | 规则引擎测试 |

### 1.5 文件系统（Main）- 1个 ✅

| 文件 | 状态 | 说明 |
|------|------|------|
| `encoding.test.ts` | ✅ | 编码检测测试（含Mock） |

### 1.6 Zustand Stores（Renderer）- 4个 ⚠️

| 文件 | 状态 | 说明 |
|------|------|------|
| `diff.store.test.ts` | ⚠️ | 部分内容测试失败（settings依赖） |
| `tab.store.test.ts` | ⚠️ | 部分内容测试失败（settings依赖） |
| `directory.store.test.ts` | ⚠️ | MapSet插件问题导致部分失败 |
| `filter.store.test.ts` | ⚠️ | glob过滤断言失败 |

### 1.7 React Hooks（Renderer）- 1个 ⚠️

| 文件 | 状态 | 说明 |
|------|------|------|
| `useDiff.test.ts` | ❌ | React并发渲染问题，全部失败 |

### 1.8 共享工具（Shared）- 3个 ✅

| 文件 | 状态 | 说明 |
|------|------|------|
| `id.test.ts` | ✅ | ID生成测试 |
| `escape.test.ts` | ✅ | HTML转义测试 |
| `format.test.ts` | ✅ | 格式化工具测试 |

---

## 2. ❌ 缺失测试（约18个）

### 2.1 目录对比引擎（Main）- 4个 ❌

| 设计文档要求 | 当前状态 | 优先级 |
|-------------|---------|--------|
| `stats.test.ts` | ❌ 不存在 | P2 |
| `sync-plan.test.ts` | ❌ 不存在 | P2 |
| `cache.test.ts` (directory) | ❌ 不存在 | P2 |
| `report.test.ts` | ❌ 不存在 | P2 |

**对应源码**: `directory/stats.ts`, `sync-plan.ts`, `cache.ts`, `report.ts`

### 2.2 文件系统模块（Main）- 3个 ❌

| 设计文档要求 | 当前状态 | 优先级 |
|-------------|---------|--------|
| `reader.test.ts` | ❌ 不存在 | P2 |
| `writer.test.ts` | ❌ 不存在 | P2 |
| `index.test.ts` (fs) | ❌ 不存在 | P2 |

**对应源码**: `fs/reader.ts`, `fs/writer.ts`, `fs/index.ts`

**注意**: `encoding.test.ts` 已存在且质量良好

### 2.3 IPC 处理层（Main）- 3个 ❌

| 设计文档要求 | 当前状态 | 优先级 |
|-------------|---------|--------|
| `diff.handler.test.ts` | ❌ 不存在 | P3 |
| `file.handler.test.ts` | ❌ 不存在 | P3 |
| `directory.handler.test.ts` | ❌ 不存在 | P3 |

**对应源码**: `ipc/diff.handler.ts`, `file.handler.ts`, `directory.handler.ts`

### 2.4 会话与数据库（Main）- 2个 ❌

| 设计文档要求 | 当前状态 | 优先级 |
|-------------|---------|--------|
| `database.test.ts` | ❌ 不存在 | P2 |
| `session.repository.test.ts` | ❌ 不存在 | P2 |

**对应源码**: `session/database.ts`, `session.repository.ts`

### 2.5 Zustand Stores（Renderer）- 6个 ❌

| 设计文档要求 | 当前状态 | 优先级 |
|-------------|---------|--------|
| `session.store.test.ts` | ❌ 不存在 | P1 |
| `settings.store.test.ts` | ❌ 不存在 | P1 |
| `theme.store.test.ts` | ❌ 不存在 | P2 |
| `search.store.test.ts` | ❌ 不存在 | P2 |
| `history.store.test.ts` | ❌ 不存在 | P2 |
| `language.store.test.ts` | ❌ 不存在 | P2 |

**对应源码**: `stores/session.store.ts`, `settings.store.ts`, `theme.store.ts`, `search.store.ts`, `history.store.ts`, `language.store.ts`

### 2.6 React Hooks（Renderer）- 多个 ❌

| 设计文档要求 | 当前状态 | 优先级 |
|-------------|---------|--------|
| `useDirectoryCompare.test.ts` | ❌ 不存在 | P1 |
| `useVirtualScroll.test.ts` | ❌ 不存在 | P2 |
| `useTreeExpand.test.ts` | ❌ 不存在 | P2 |
| `useDiffNavigation.test.ts` | ❌ 存在性问题 | P2 |
| `useFolding.test.ts` | ❌ 存在性问题 | P2 |
| `useSyncScroll.test.ts` | ❌ 存在性问题 | P2 |
| `useFileWatcher.test.ts` | ❌ 不存在 | P2 |
| `useSession.test.ts` | ❌ 不存在 | P2 |
| `useSettings.test.ts` | ❌ 不存在 | P2 |
| `useI18n.test.ts` | ❌ 不存在 | P3 |
| `useUndoRedo.test.ts` | ❌ 不存在 | P2 |
| `useSyncDiff.test.ts` | ❌ 不存在 | P2 |

### 2.7 React 组件（Renderer）- 全部 ❌

根据设计文档，以下组件测试缺失：

| 组件类别 | 缺失测试 |
|---------|---------|
| Diff View | `DiffNavigator.test.tsx`, `DiffLine.test.tsx`, `SplitDiffView.test.tsx` |
| Directory View | `TreeNode.test.tsx`, `DirectoryStats.test.tsx`, `DirectoryTreePanel.test.tsx` |
| Dialogs | `SettingsDialog.test.tsx`, `SearchDialog.test.tsx`, `SessionListDialog.test.tsx` |

**注意**: 设计文档建议组件测试覆盖率为60%，目前为0%

---

## 3. ⚠️ 存在但需完善的测试

### 3.1 `tab.store.test.ts` - 部分方法未测试

**当前已测试**: 基础状态、文件操作、diff结果、选项、视图、chunk导航、重置

**缺失测试的方法**:
- `addTabWithFiles()` - 添加带文件的标签
- `addDirectoryTab()` - 添加目录对比标签（复杂逻辑）
- `addMergeTab()` - 添加合并标签
- `closeTab()` - 关闭标签（边界条件测试不足）
- `selectTab()` - 切换标签（状态恢复逻辑）
- `swapActiveTabFiles()` - 交换文件
- `getDirtyTabs()` - 获取脏标签
- `saveCurrentDirectoryState()` - 保存目录状态
- `restoreDirectoryStateForTab()` - 恢复目录状态
- `saveCurrentMergeState()` - 保存合并状态
- `restoreMergeStateForTab()` - 恢复合并状态

**建议**: tab.store 是核心store，建议补充这些测试，特别是目录和合并相关的状态管理。

### 3.2 `useDiff.test.ts` - 可进一步增强

**当前状态**: 基础测试完整，但缺少：
- 节流/防抖测试（代码中注释提到但实际测试不充分）
- 复杂选项组合测试

---

## 4. 🔧 配置问题

### 4.1 ✅ `vitest.config.ts` 已正确配置

**当前配置**:
```typescript
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
    ['packages/renderer/**', 'jsdom']
  ],
  setupFiles: ['./packages/renderer/src/__tests__/setup.ts']
}
```

**状态**: ✅ 配置正确，没有发现文档中提到的问题

### 4.2 ⚠️ `setup.ts` 需要增强

**当前配置缺少**:
1. `enableMapSet()` 调用 - 修复 directory.store 测试
2. Settings store 初始化 - 修复 tab.store 和 diff.store 测试
3. `cleanup()` 调用 - 修复 React 并发渲染问题

**建议修改**:
```typescript
import { enableMapSet } from 'immer'
import { cleanup } from '@testing-library/react'
import { useSettingsStore } from '../stores/settings.store'
import { DEFAULT_SETTINGS } from '@shared/types/settings.types'

// 启用 Immer MapSet 插件
enableMapSet()

// 初始化 Settings Store
useSettingsStore.setState({
  settings: DEFAULT_SETTINGS,
  isLoading: false,
  error: null
})

// 每个测试后清理
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
```

### 4.3 ✅ 依赖已正确安装

```bash
# 已安装的测试依赖
@testing-library/jest-dom: ^6.9.1 ✅
@testing-library/react: ^16.3.2 ✅
@testing-library/user-event: ^14.6.1 ✅
jsdom: ^29.1.1 ✅
@vitejs/plugin-react: ^4.3.4 ✅
```

---

## 5. 📊 优先级汇总

### P0 (必须) - 当前状态

| 模块 | 目标覆盖率 | 当前状态 | 差距 |
|------|-----------|---------|------|
| `diff/myers.ts` | 90%+ | ✅ 已测试 | 达标 |
| `diff/index.ts` | 85%+ | ✅ 已测试 | 达标 |
| `ignore/*.ts` | 90%+ | ✅ 已测试 | 达标 |
| `stores/*.ts` | 85%+ | ⚠️ 部分测试，存在失败 | 需修复问题 |

### P1 (重要) - 缺失

| 模块 | 目标覆盖率 | 当前状态 | 建议 |
|------|-----------|---------|------|
| `diff/patience.ts` | 80%+ | ✅ 已测试 | 达标 |
| `diff/three-way.ts` | 80%+ | ✅ 已测试 | 达标 |
| `directory/filter.ts` | 85%+ | ✅ 已测试 | 达标 |
| `directory/comparator.ts` | 80%+ | ✅ 已测试 | 达标 |
| `stores/session.store.ts` | 85%+ | ❌ 未测试 | 需要补充 |
| `stores/settings.store.ts` | 85%+ | ❌ 未测试 | 需要补充 |
| `hooks/useDirectoryCompare.ts` | 70%+ | ❌ 未测试 | 需要补充 |

### P2 (一般) - 部分缺失

| 模块 | 目标覆盖率 | 当前状态 | 建议 |
|------|-----------|---------|------|
| `directory/stats.ts` | 70%+ | ❌ 未测试 | 需要补充 |
| `directory/report.ts` | 70%+ | ❌ 未测试 | 需要补充 |
| `fs/*.ts` | 70%+ | ⚠️ 部分测试 | 需要补充reader/writer |
| `hooks/*.ts` | 70%+ | ⚠️ 部分测试 | 缺少多个hook |

---

## 6. 🎯 行动建议

### 立即行动 (高优先级) - 修复测试失败

1. **修复 setup.ts**
   ```typescript
   // 添加缺失的初始化
   import { enableMapSet } from 'immer'
   import { cleanup } from '@testing-library/react'
   import { useSettingsStore } from '../stores/settings.store'
   import { DEFAULT_SETTINGS } from '@shared/types/settings.types'
   
   enableMapSet()
   
   useSettingsStore.setState({
     settings: DEFAULT_SETTINGS,
     isLoading: false,
     error: null
   })
   
   afterEach(() => {
     cleanup()
     vi.clearAllMocks()
   })
   ```

2. **修复 filter.store.test.ts** 中的 glob 断言
   - 检查实现与测试期望是否一致
   - 可能需要在 `setup.ts` 中配置 micromatch

### 短期行动 (中优先级) - 补充缺失测试

3. **补充核心 Store 测试**
   - `session.store.test.ts`
   - `settings.store.test.ts`
   - `theme.store.test.ts` (可选)

4. **补充关键 Hooks 测试**
   - `useDirectoryCompare.test.ts`
   - `useVirtualScroll.test.ts`

5. **补充 FS 模块测试**
   - `reader.test.ts`
   - `writer.test.ts`

6. **完成 tab.store 测试**
   - 补充目录和合并相关方法测试

### 长期行动 (低优先级)

7. **IPC Handler 测试**
   - 使用 Electron Mock 策略

8. **数据库测试**
   - 使用内存/临时数据库

9. **组件测试**
   - 核心交互组件

---

## 7. 📁 推荐的测试文件结构

```
packages/
├── main/src/
│   ├── diff/__tests__/          ✅ 8个 - 完整
│   ├── directory/__tests__/      ✅ 5个 - 基本完整
│   │   └── stats.test.ts         ❌ 需要补充
│   │   └── sync-plan.test.ts     ❌ 需要补充
│   │   └── cache.test.ts         ❌ 需要补充
│   │   └── report.test.ts        ❌ 需要补充
│   ├── fs/__tests__/             ⚠️ 1个
│   │   └── encoding.test.ts      ✅ 已存在
│   │   └── reader.test.ts        ❌ 需要补充
│   │   └── writer.test.ts        ❌ 需要补充
│   ├── ignore/__tests__/         ✅ 2个 - 完整
│   ├── ipc/__tests__/            ❌ 0个
│   │   └── file.handler.test.ts  ❌ 需要补充
│   │   └── diff.handler.test.ts  ❌ 需要补充
│   │   └── directory.handler.test.ts ❌ 需要补充
│   └── session/__tests__/        ❌ 0个
│       └── database.test.ts      ❌ 需要补充
│       └── session.repository.test.ts ❌ 需要补充
├── renderer/src/
│   ├── stores/__tests__/         ⚠️ 4个 (17个测试失败)
│   │   └── diff.store.test.ts    ⚠️ 需修复settings依赖
│   │   └── tab.store.test.ts     ⚠️ 需修复settings依赖，需完善
│   │   └── directory.store.test.ts ⚠️ 需启用MapSet
│   │   └── filter.store.test.ts  ⚠️ 需修复glob断言
│   │   └── session.store.test.ts ❌ 需要补充
│   │   └── settings.store.test.ts ❌ 需要补充
│   │   └── theme.store.test.ts   ❌ 需要补充
│   │   └── search.store.test.ts  ❌ 需要补充
│   │   └── history.store.test.ts ❌ 需要补充
│   │   └── language.store.test.ts ❌ 需要补充
│   ├── hooks/__tests__/          ⚠️ 1个 (全部失败)
│   │   └── useDiff.test.ts       ❌ 需修复React并发问题
│   │   └── useDirectoryCompare.test.ts ❌ 需要补充
│   │   └── ...其他hooks          ❌ 需要补充
│   └── features/
│       └── **/__tests__/*.test.tsx ❌ 全部需要补充
└── shared/src/
    └── utils/__tests__/          ✅ 3个 - 完整
```

---

## 总结

### 优势
- ✅ Diff引擎核心算法测试完整且质量高
- ✅ 目录对比引擎基础测试覆盖良好
- ✅ Store测试框架建立正确，使用Zustand最佳实践
- ✅ 共享工具测试完整
- ✅ vitest配置正确，测试依赖已安装

### 主要问题

#### 关键问题 (需要立即修复)
1. ⚠️ **17个测试文件中有89个测试失败**
2. ⚠️ **Settings Store 依赖链问题**: diff.store → settings.store 在测试环境未初始化
3. ⚠️ **Immer MapSet 插件未启用**: 导致 directory.store 测试失败
4. ⚠️ **React并发渲染问题**: useDiff hook 测试全部失败
5. ⚠️ **测试断言不一致**: filter.store 的 glob 过滤测试

#### 缺失测试 (按优先级补充)
1. ⚠️ **6个核心Store缺少测试** (session/settings/theme/search/history/language)
2. ⚠️ **大部分Hooks缺少测试**
3. ⚠️ **所有IPC Handler缺少测试**
4. ⚠️ **所有React组件缺少测试**
5. ⚠️ **FS模块 reader/writer 缺少测试**
6. ⚠️ **目录模块 stats/sync-plan/cache/report 缺少测试**
7. ⚠️ **数据库模块完全缺少测试**

### 建议修复优先级
1. **修复 setup.ts** (启用MapSet + 初始化Settings + cleanup)
2. **重新运行测试**，验证失败是否解决
3. **补充 settings.store.test.ts** 和 **session.store.test.ts** (P1)
4. **补充 useDirectoryCompare.test.ts** (P1)
5. **修复 filter.store.test.ts** 断言问题
6. 其他测试按优先级逐步补充

---

*报告结束*
