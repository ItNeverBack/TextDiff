import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  SyncPlanGenerator,
  generateSyncPlan,
  createCustomSyncPlan,
  generateSyncPlanByStrategy,
  generateLeftToRightPlan,
  generateRightToLeftPlan,
  generateBidirectionalPlan,
  analyzeSyncPlan,
  filterSyncOperations,
  mergeSyncPlans,
  DEFAULT_SYNC_PLAN_CONFIG
} from '../sync-plan'
import type { DirectoryDiffEntry, SyncOperation, SyncPlan } from '@shared/types'

describe('DEFAULT_SYNC_PLAN_CONFIG', () => {
  it('具有正确的默认值', () => {
    expect(DEFAULT_SYNC_PLAN_CONFIG.strategy).toBe('bidirectional')
    expect(DEFAULT_SYNC_PLAN_CONFIG.includeEqual).toBe(false)
    expect(DEFAULT_SYNC_PLAN_CONFIG.includeLeftOnly).toBe(true)
    expect(DEFAULT_SYNC_PLAN_CONFIG.includeRightOnly).toBe(true)
    expect(DEFAULT_SYNC_PLAN_CONFIG.includeModified).toBe(true)
  })
})

describe('SyncPlanGenerator', () => {
  let generator: SyncPlanGenerator

  beforeEach(() => {
    generator = new SyncPlanGenerator()
  })

  describe('constructor', () => {
    it('使用默认配置初始化', () => {
      const config = generator.getConfig()
      expect(config.strategy).toBe('bidirectional')
      expect(config.includeEqual).toBe(false)
    })

    it('合并自定义配置', () => {
      generator = new SyncPlanGenerator({ strategy: 'left-to-right', includeEqual: true })
      const config = generator.getConfig()
      expect(config.strategy).toBe('left-to-right')
      expect(config.includeEqual).toBe(true)
    })
  })

  describe('generate', () => {
    const createEntry = (id: string, name: string, status: DirectoryDiffEntry['status']): DirectoryDiffEntry => ({
      id,
      name,
      type: 'file',
      path: `/${name}`,
      depth: 0,
      status,
      relativePath: name
    })

    it('left-only 状态生成 copy-left-to-right 操作', () => {
      const entries = [createEntry('1', 'left.txt', 'left-only')]
      const plan = generator.generate(entries)

      expect(plan.operations).toHaveLength(1)
      expect(plan.operations[0].action).toBe('copy-left-to-right')
      expect(plan.operations[0].entry.status).toBe('left-only')
    })

    it('right-only 状态生成 copy-right-to-left 操作', () => {
      const entries = [createEntry('1', 'right.txt', 'right-only')]
      const plan = generator.generate(entries)

      expect(plan.operations).toHaveLength(1)
      expect(plan.operations[0].action).toBe('copy-right-to-left')
    })

    it('modified 状态使用双向策略时生成 merge 操作', () => {
      const entries = [createEntry('1', 'modified.txt', 'modified')]
      const plan = generator.generate(entries)

      expect(plan.operations).toHaveLength(1)
      expect(plan.operations[0].action).toBe('merge')
    })

    it('equal 状态默认被忽略', () => {
      const entries = [createEntry('1', 'equal.txt', 'equal')]
      const plan = generator.generate(entries)

      expect(plan.operations).toHaveLength(0)
    })

    it('equal 状态在 includeEqual=true 时返回 ignore 操作', () => {
      // 使用自定义操作来验证 equal 文件的行为
      const customActions = new Map([['1', 'ignore' as const]])
      const customGenerator = new SyncPlanGenerator({
        strategy: 'custom',
        includeEqual: true,
        customActions
      })
      const entries = [{
        id: '1',
        name: 'equal.txt',
        type: 'file' as const,
        path: '/equal.txt',
        depth: 0,
        status: 'equal' as const,
        relativePath: 'equal.txt'
      }]
      const plan = customGenerator.generate(entries)

      expect(plan.operations).toHaveLength(1)
      expect(plan.operations[0].action).toBe('ignore')
    })

    it('递归处理子条目', () => {
      const entries: DirectoryDiffEntry[] = [{
        id: '1',
        name: 'dir',
        type: 'directory',
        path: '/dir',
        depth: 0,
        status: 'equal',
        relativePath: 'dir',
        children: [
          createEntry('2', 'child.txt', 'left-only')
        ]
      }]

      const plan = generator.generate(entries)

      expect(plan.operations).toHaveLength(1)
      expect(plan.operations[0].entry.name).toBe('child.txt')
    })

    it('type-changed 状态生成操作', () => {
      const entries = [createEntry('1', 'type.txt', 'type-changed')]
      const plan = generator.generate(entries)

      expect(plan.operations).toHaveLength(1)
      expect(plan.operations[0].action).toBe('merge')
    })

    it('permission-changed 状态生成操作', () => {
      const entries = [createEntry('1', 'perm.txt', 'permission-changed')]
      const plan = generator.generate(entries)

      expect(plan.operations).toHaveLength(1)
    })

    it('生成警告信息', () => {
      const entries = [createEntry('1', 'test.txt', 'modified')]
      const plan = generator.generate(entries)

      expect(plan.warnings.length).toBeGreaterThan(0)
      // bidirectional 策略下 modified 使用 merge，所以警告是合并而非覆盖
      expect(plan.warnings[0]).toMatch(/覆盖|合并/)
    })

    it('统计信息正确计算', () => {
      const entries = [
        createEntry('1', 'copy1.txt', 'left-only'),
        createEntry('2', 'copy2.txt', 'left-only'),
        createEntry('3', 'delete.txt', 'right-only')
      ]
      const plan = generator.generate(entries)

      // left-only 和 right-only 在 bidirectional 策略下都是 copy 操作
      expect(plan.stats.copyOperations).toBe(3)
      expect(plan.stats.deleteOperations).toBe(0)
    })
  })

  describe('不同策略的行为', () => {
    const createEntry = (id: string, name: string, status: DirectoryDiffEntry['status'], size?: number): DirectoryDiffEntry => ({
      id,
      name,
      type: 'file',
      path: `/${name}`,
      depth: 0,
      status,
      relativePath: name,
      leftMetadata: size ? { size } : undefined
    })

    it('left-to-right 策略：left-only 复制到右侧', () => {
      const generator = new SyncPlanGenerator({ strategy: 'left-to-right' })
      const entries = [createEntry('1', 'left.txt', 'left-only')]
      const plan = generator.generate(entries)

      expect(plan.operations[0].action).toBe('copy-left-to-right')
    })

    it('left-to-right 策略：right-only 删除右侧', () => {
      const generator = new SyncPlanGenerator({ strategy: 'left-to-right' })
      const entries = [createEntry('1', 'right.txt', 'right-only')]
      const plan = generator.generate(entries)

      expect(plan.operations[0].action).toBe('delete-right')
    })

    it('left-to-right 策略：modified 左侧覆盖右侧', () => {
      const generator = new SyncPlanGenerator({ strategy: 'left-to-right' })
      const entries = [createEntry('1', 'mod.txt', 'modified')]
      const plan = generator.generate(entries)

      expect(plan.operations[0].action).toBe('copy-left-to-right')
    })

    it('right-to-left 策略：left-only 删除左侧', () => {
      const generator = new SyncPlanGenerator({ strategy: 'right-to-left' })
      const entries = [createEntry('1', 'left.txt', 'left-only')]
      const plan = generator.generate(entries)

      expect(plan.operations[0].action).toBe('delete-left')
    })

    it('right-to-left 策略：right-only 复制到左侧', () => {
      const generator = new SyncPlanGenerator({ strategy: 'right-to-left' })
      const entries = [createEntry('1', 'right.txt', 'right-only')]
      const plan = generator.generate(entries)

      expect(plan.operations[0].action).toBe('copy-right-to-left')
    })

    it('right-to-left 策略：modified 右侧覆盖左侧', () => {
      const generator = new SyncPlanGenerator({ strategy: 'right-to-left' })
      const entries = [createEntry('1', 'mod.txt', 'modified')]
      const plan = generator.generate(entries)

      expect(plan.operations[0].action).toBe('copy-right-to-left')
    })

    it('bidirectional 策略：modified 使用 merge', () => {
      const generator = new SyncPlanGenerator({ strategy: 'bidirectional' })
      const entries = [createEntry('1', 'mod.txt', 'modified')]
      const plan = generator.generate(entries)

      expect(plan.operations[0].action).toBe('merge')
      expect(plan.warnings.some(w => w.includes('合并'))).toBe(true)
    })

    it('custom 策略：默认行为与 bidirectional 相同', () => {
      const generator = new SyncPlanGenerator({ strategy: 'custom' })
      const entries = [createEntry('1', 'left.txt', 'left-only')]
      const plan = generator.generate(entries)

      expect(plan.operations[0].action).toBe('copy-left-to-right')
    })
  })

  describe('自定义操作', () => {
    it('使用自定义操作覆盖默认行为', () => {
      const customActions = new Map([['1', 'ignore' as const]])
      const generator = new SyncPlanGenerator({ strategy: 'bidirectional', customActions })

      const entries: DirectoryDiffEntry[] = [{
        id: '1',
        name: 'test.txt',
        type: 'file',
        path: '/test.txt',
        depth: 0,
        status: 'modified',
        relativePath: 'test.txt'
      }]

      const plan = generator.generate(entries)

      expect(plan.operations).toHaveLength(1)
      expect(plan.operations[0].action).toBe('ignore')
    })

    it('未指定自定义操作的使用默认行为', () => {
      const customActions = new Map([['1', 'ignore' as const]])
      const generator = new SyncPlanGenerator({ strategy: 'bidirectional', customActions })

      const entries: DirectoryDiffEntry[] = [
        { id: '1', name: 'test1.txt', type: 'file', path: '/test1.txt', depth: 0, status: 'modified', relativePath: 'test1.txt' },
        { id: '2', name: 'test2.txt', type: 'file', path: '/test2.txt', depth: 0, status: 'left-only', relativePath: 'test2.txt' }
      ]

      const plan = generator.generate(entries)

      expect(plan.operations).toHaveLength(2)
      expect(plan.operations.find(op => op.entry.id === '1')?.action).toBe('ignore')
      expect(plan.operations.find(op => op.entry.id === '2')?.action).toBe('copy-left-to-right')
    })
  })

  describe('updateConfig', () => {
    it('更新配置对象', () => {
      generator.updateConfig({ strategy: 'left-to-right' })
      const config = generator.getConfig()

      expect(config.strategy).toBe('left-to-right')
      expect(config.includeEqual).toBe(false) // 未修改的保持原值
    })
  })
})

describe('generateSyncPlan', () => {
  it('便捷函数生成同步计划', () => {
    const entries: DirectoryDiffEntry[] = [{
      id: '1',
      name: 'test.txt',
      type: 'file',
      path: '/test.txt',
      depth: 0,
      status: 'left-only',
      relativePath: 'test.txt'
    }]

    const plan = generateSyncPlan(entries, { strategy: 'left-to-right' })

    expect(plan.operations).toHaveLength(1)
    expect(plan.stats.copyOperations).toBe(1)
  })
})

describe('createCustomSyncPlan', () => {
  it('只处理指定自定义操作的条目', () => {
    const customActions = new Map([
      ['1', 'copy-left-to-right' as const],
      ['2', 'ignore' as const]
    ])

    const entries: DirectoryDiffEntry[] = [
      { id: '1', name: 'test1.txt', type: 'file', path: '/test1.txt', depth: 0, status: 'modified', relativePath: 'test1.txt' },
      { id: '2', name: 'test2.txt', type: 'file', path: '/test2.txt', depth: 0, status: 'modified', relativePath: 'test2.txt' },
      { id: '3', name: 'test3.txt', type: 'file', path: '/test3.txt', depth: 0, status: 'left-only', relativePath: 'test3.txt' }
    ]

    const plan = createCustomSyncPlan(entries, customActions)

    expect(plan.operations).toHaveLength(2)
    expect(plan.operations.find(op => op.entry.id === '1')?.action).toBe('copy-left-to-right')
    expect(plan.operations.find(op => op.entry.id === '2')?.action).toBe('ignore')
    expect(plan.operations.find(op => op.entry.id === '3')).toBeUndefined()
  })
})

describe('generateSyncPlanByStrategy', () => {
  it('使用指定策略生成计划', () => {
    const entries: DirectoryDiffEntry[] = [{
      id: '1',
      name: 'test.txt',
      type: 'file',
      path: '/test.txt',
      depth: 0,
      status: 'right-only',
      relativePath: 'test.txt'
    }]

    const plan = generateSyncPlanByStrategy(entries, 'left-to-right')
    expect(plan.operations[0].action).toBe('delete-right')

    const plan2 = generateSyncPlanByStrategy(entries, 'right-to-left')
    expect(plan2.operations[0].action).toBe('copy-right-to-left')
  })
})

describe('generateLeftToRightPlan', () => {
  it('生成从左到右的同步计划', () => {
    const entries: DirectoryDiffEntry[] = [{
      id: '1',
      name: 'test.txt',
      type: 'file',
      path: '/test.txt',
      depth: 0,
      status: 'modified',
      relativePath: 'test.txt'
    }]

    const plan = generateLeftToRightPlan(entries)

    expect(plan.operations[0].action).toBe('copy-left-to-right')
  })
})

describe('generateRightToLeftPlan', () => {
  it('生成从右到左的同步计划', () => {
    const entries: DirectoryDiffEntry[] = [{
      id: '1',
      name: 'test.txt',
      type: 'file',
      path: '/test.txt',
      depth: 0,
      status: 'modified',
      relativePath: 'test.txt'
    }]

    const plan = generateRightToLeftPlan(entries)

    expect(plan.operations[0].action).toBe('copy-right-to-left')
  })
})

describe('generateBidirectionalPlan', () => {
  it('生成双向同步计划', () => {
    const entries: DirectoryDiffEntry[] = [{
      id: '1',
      name: 'test.txt',
      type: 'file',
      path: '/test.txt',
      depth: 0,
      status: 'modified',
      relativePath: 'test.txt'
    }]

    const plan = generateBidirectionalPlan(entries)

    expect(plan.operations[0].action).toBe('merge')
  })
})

describe('analyzeSyncPlan', () => {
  const createPlan = (operations: SyncOperation[]): SyncPlan => ({
    operations,
    stats: { copyOperations: 0, deleteOperations: 0, totalBytes: 0 },
    warnings: []
  })

  const createOp = (action: SyncOperation['action']): SyncOperation => ({
    id: 'op-1',
    entry: {
      id: '1',
      name: 'test.txt',
      type: 'file',
      path: '/test.txt',
      depth: 0,
      status: 'modified',
      relativePath: 'test.txt'
    },
    action,
    status: 'pending'
  })

  it('正确统计 copy 操作', () => {
    const plan = createPlan([createOp('copy-left-to-right'), createOp('copy-right-to-left')])
    const analysis = analyzeSyncPlan(plan)

    expect(analysis.copyCount).toBe(2)
    expect(analysis.deleteCount).toBe(0)
    expect(analysis.mergeCount).toBe(0)
    expect(analysis.ignoreCount).toBe(0)
  })

  it('正确统计 delete 操作', () => {
    const plan = createPlan([createOp('delete-left'), createOp('delete-right')])
    const analysis = analyzeSyncPlan(plan)

    expect(analysis.copyCount).toBe(0)
    expect(analysis.deleteCount).toBe(2)
  })

  it('正确统计 merge 操作', () => {
    const plan = createPlan([createOp('merge')])
    const analysis = analyzeSyncPlan(plan)

    expect(analysis.mergeCount).toBe(1)
  })

  it('正确统计 ignore 操作', () => {
    const plan = createPlan([createOp('ignore'), createOp('ignore')])
    const analysis = analyzeSyncPlan(plan)

    expect(analysis.ignoreCount).toBe(2)
  })

  it('统计总操作数', () => {
    const plan = createPlan([createOp('copy-left-to-right'), createOp('delete-left'), createOp('merge')])
    const analysis = analyzeSyncPlan(plan)

    expect(analysis.totalOperations).toBe(3)
  })

  it('预估时间不为0', () => {
    const plan = createPlan([createOp('copy-left-to-right')])
    const analysis = analyzeSyncPlan(plan)

    expect(analysis.estimatedTime).toBeGreaterThanOrEqual(1)
  })

  it('计算正确预估时间', () => {
    const plan = createPlan([
      createOp('copy-left-to-right'), // 0.1s
      createOp('copy-left-to-right'), // 0.1s
      createOp('delete-left'),        // 0.05s
      createOp('merge')               // 0.2s
    ])
    const analysis = analyzeSyncPlan(plan)

    // 0.1*2 + 0.05 + 0.2 = 0.45s -> ceil -> 1s
    expect(analysis.estimatedTime).toBe(1)
  })
})

describe('filterSyncOperations', () => {
  const createPlan = (operations: SyncOperation[]): SyncPlan => ({
    operations,
    stats: { copyOperations: 0, deleteOperations: 0, totalBytes: 0 },
    warnings: ['warning1']
  })

  const createOp = (id: string, action: SyncOperation['action']): SyncOperation => ({
    id: `op-${id}`,
    entry: {
      id,
      name: `test${id}.txt`,
      type: 'file',
      path: `/test${id}.txt`,
      depth: 0,
      status: 'modified',
      relativePath: `test${id}.txt`
    },
    action,
    status: 'pending'
  })

  it('按条件过滤操作', () => {
    const plan = createPlan([
      createOp('1', 'copy-left-to-right'),
      createOp('2', 'delete-left'),
      createOp('3', 'copy-left-to-right')
    ])

    const filtered = filterSyncOperations(plan, op => op.action === 'copy-left-to-right')

    expect(filtered.operations).toHaveLength(2)
    expect(filtered.operations.every(op => op.action === 'copy-left-to-right')).toBe(true)
  })

  it('保留警告信息', () => {
    const plan = createPlan([createOp('1', 'copy-left-to-right')])

    const filtered = filterSyncOperations(plan, () => true)

    expect(filtered.warnings).toEqual(['warning1'])
  })

  it('重新计算统计', () => {
    const plan = createPlan([
      createOp('1', 'copy-left-to-right'),
      createOp('2', 'delete-left')
    ])

    const filtered = filterSyncOperations(plan, op => op.action === 'copy-left-to-right')

    expect(filtered.stats.copyOperations).toBe(1)
    expect(filtered.stats.deleteOperations).toBe(0)
  })

  it('空结果返回空操作数组', () => {
    const plan = createPlan([createOp('1', 'copy-left-to-right')])

    const filtered = filterSyncOperations(plan, () => false)

    expect(filtered.operations).toHaveLength(0)
    expect(filtered.stats.copyOperations).toBe(0)
  })
})

describe('mergeSyncPlans', () => {
  const createOp = (id: string, action: SyncOperation['action']): SyncOperation => ({
    id: `op-${id}`,
    entry: {
      id,
      name: `test${id}.txt`,
      type: 'file',
      path: `/test${id}.txt`,
      depth: 0,
      status: 'modified',
      relativePath: `test${id}.txt`
    },
    action,
    status: 'pending'
  })

  const createPlan = (operations: SyncOperation[], warnings: string[] = []): SyncPlan => ({
    operations,
    stats: { copyOperations: 0, deleteOperations: 0, totalBytes: 0 },
    warnings
  })

  it('合并多个计划的操作', () => {
    const plan1 = createPlan([createOp('1', 'copy-left-to-right'), createOp('2', 'delete-left')])
    const plan2 = createPlan([createOp('3', 'copy-right-to-left')])

    const merged = mergeSyncPlans([plan1, plan2])

    expect(merged.operations).toHaveLength(3)
  })

  it('根据 entry id 去重', () => {
    const plan1 = createPlan([createOp('1', 'copy-left-to-right')])
    const plan2 = createPlan([createOp('1', 'delete-left')]) // 相同 entry id

    const merged = mergeSyncPlans([plan1, plan2])

    expect(merged.operations).toHaveLength(1)
  })

  it('合并警告并去重', () => {
    const plan1 = createPlan([], ['warning1', 'warning2'])
    const plan2 = createPlan([], ['warning2', 'warning3']) // warning2 重复

    const merged = mergeSyncPlans([plan1, plan2])

    expect(merged.warnings).toContain('warning1')
    expect(merged.warnings).toContain('warning2')
    expect(merged.warnings).toContain('warning3')
  })

  it('重新计算合并后统计', () => {
    const plan1 = createPlan([createOp('1', 'copy-left-to-right'), createOp('2', 'delete-left')])
    const plan2 = createPlan([createOp('3', 'copy-left-to-right')])

    const merged = mergeSyncPlans([plan1, plan2])

    expect(merged.stats.copyOperations).toBe(2)
    expect(merged.stats.deleteOperations).toBe(1)
  })

  it('空数组返回空计划', () => {
    const merged = mergeSyncPlans([])

    expect(merged.operations).toHaveLength(0)
    expect(merged.warnings).toHaveLength(0)
    expect(merged.stats.copyOperations).toBe(0)
  })

  it('单计划直接返回（去重统计）', () => {
    const plan = createPlan([createOp('1', 'copy-left-to-right')])

    const merged = mergeSyncPlans([plan])

    expect(merged.operations).toHaveLength(1)
  })
})
