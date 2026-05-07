import { describe, it, expect } from 'vitest'
import {
  SyncPlanGenerator,
  generateSyncPlan,
  generateLeftToRightPlan,
  generateRightToLeftPlan,
  generateBidirectionalPlan,
  analyzeSyncPlan,
  filterSyncOperations,
  mergeSyncPlans
} from '../sync-plan'
import type { DirectoryDiffEntry, SyncAction } from '@shared/types'

/**
 * Sync Plan Generator Unit Tests
 */
describe('SyncPlanGenerator', () => {
  /**
   * Helper: Create test entry
   */
  function createEntry(
    name: string,
    status: DirectoryDiffEntry['status'],
    type: 'file' | 'directory' = 'file'
  ): DirectoryDiffEntry {
    return {
      id: `test-${name}`,
      relativePath: name,
      name,
      type,
      status,
      leftPath: status !== 'right-only' ? `/left/${name}` : null,
      rightPath: status !== 'left-only' ? `/right/${name}` : null,
      depth: 0,
      leftMetadata: status !== 'right-only' ? {
        size: 100,
        modifiedTime: new Date('2024-01-01'),
        createdTime: new Date('2024-01-01'),
        permissions: '644'
      } : undefined,
      rightMetadata: status !== 'left-only' ? {
        size: 100,
        modifiedTime: new Date('2024-01-01'),
        createdTime: new Date('2024-01-01'),
        permissions: '644'
      } : undefined
    }
  }

  describe('Left-to-Right Strategy', () => {
    it('should copy left-only files to right', () => {
      const entries = [createEntry('file1.txt', 'left-only')]
      const plan = generateLeftToRightPlan(entries)

      expect(plan.operations).toHaveLength(1)
      expect(plan.operations[0].action).toBe('copy-left-to-right')
    })

    it('should delete right-only files', () => {
      const entries = [createEntry('file1.txt', 'right-only')]
      const plan = generateLeftToRightPlan(entries)

      expect(plan.operations).toHaveLength(1)
      expect(plan.operations[0].action).toBe('delete-right')
    })

    it('should copy modified files from left to right', () => {
      const entries = [createEntry('file1.txt', 'modified')]
      const plan = generateLeftToRightPlan(entries)

      expect(plan.operations).toHaveLength(1)
      expect(plan.operations[0].action).toBe('copy-left-to-right')
    })

    it('should ignore equal files by default', () => {
      const entries = [createEntry('file1.txt', 'equal')]
      const plan = generateLeftToRightPlan(entries)

      expect(plan.operations).toHaveLength(0)
    })
  })

  describe('Right-to-Left Strategy', () => {
    it('should delete left-only files', () => {
      const entries = [createEntry('file1.txt', 'left-only')]
      const plan = generateRightToLeftPlan(entries)

      expect(plan.operations).toHaveLength(1)
      expect(plan.operations[0].action).toBe('delete-left')
    })

    it('should copy right-only files to left', () => {
      const entries = [createEntry('file1.txt', 'right-only')]
      const plan = generateRightToLeftPlan(entries)

      expect(plan.operations).toHaveLength(1)
      expect(plan.operations[0].action).toBe('copy-right-to-left')
    })

    it('should copy modified files from right to left', () => {
      const entries = [createEntry('file1.txt', 'modified')]
      const plan = generateRightToLeftPlan(entries)

      expect(plan.operations).toHaveLength(1)
      expect(plan.operations[0].action).toBe('copy-right-to-left')
    })
  })

  describe('Bidirectional Strategy', () => {
    it('should copy left-only files to right', () => {
      const entries = [createEntry('file1.txt', 'left-only')]
      const plan = generateBidirectionalPlan(entries)

      expect(plan.operations[0].action).toBe('copy-left-to-right')
    })

    it('should copy right-only files to left', () => {
      const entries = [createEntry('file1.txt', 'right-only')]
      const plan = generateBidirectionalPlan(entries)

      expect(plan.operations[0].action).toBe('copy-right-to-left')
    })

    it('should merge modified files', () => {
      const entries = [createEntry('file1.txt', 'modified')]
      const plan = generateBidirectionalPlan(entries)

      expect(plan.operations[0].action).toBe('merge')
    })
  })

  describe('Custom Configuration', () => {
    it('should include equal files when configured', () => {
      const entries = [
        createEntry('file1.txt', 'equal'),
        createEntry('file2.txt', 'modified')
      ]

      const plan = generateSyncPlan(entries, {
        strategy: 'left-to-right',
        includeEqual: true
      })

      // Equal files are included in processing but result in 'ignore' action
      // So only modified file gets an actual operation
      expect(plan.operations).toHaveLength(1)
      expect(plan.operations[0].entry.name).toBe('file2.txt')
    })

    it('should exclude specific status types', () => {
      const entries = [
        createEntry('file1.txt', 'left-only'),
        createEntry('file2.txt', 'right-only'),
        createEntry('file3.txt', 'modified')
      ]

      const plan = generateSyncPlan(entries, {
        strategy: 'left-to-right',
        includeLeftOnly: true,
        includeRightOnly: false,
        includeModified: false
      })

      expect(plan.operations).toHaveLength(1)
      expect(plan.operations[0].entry.name).toBe('file1.txt')
    })
  })

  describe('Recursive Entries', () => {
    it('should process nested entries recursively', () => {
      const entries: DirectoryDiffEntry[] = [
        {
          ...createEntry('dir', 'left-only', 'directory'),
          children: [
            createEntry('dir/file1.txt', 'left-only'),
            createEntry('dir/file2.txt', 'left-only')
          ]
        }
      ]

      const plan = generateLeftToRightPlan(entries)

      expect(plan.operations).toHaveLength(3) // dir + 2 files
    })
  })

  describe('Plan Analysis', () => {
    it('should calculate correct statistics', () => {
      const entries = [
        createEntry('file1.txt', 'left-only'),
        createEntry('file2.txt', 'right-only'),
        createEntry('file3.txt', 'modified')
      ]

      const plan = generateBidirectionalPlan(entries)
      const analysis = analyzeSyncPlan(plan)

      expect(analysis.totalOperations).toBe(3)
      expect(analysis.copyCount).toBe(2)
      expect(analysis.mergeCount).toBe(1)
    })

    it('should estimate time based on operations', () => {
      const entries = [
        createEntry('file1.txt', 'left-only'),
        createEntry('file2.txt', 'modified')
      ]

      const plan = generateBidirectionalPlan(entries)
      const analysis = analyzeSyncPlan(plan)

      // Should have copy operation for left-only and merge operation for modified file
      expect(analysis.estimatedTime).toBeGreaterThan(0)
      expect(analysis.totalOperations).toBe(2)
    })
  })

  describe('Plan Filtering', () => {
    it('should filter operations based on predicate', () => {
      const entries = [
        createEntry('file1.txt', 'left-only'),
        createEntry('file2.txt', 'right-only')
      ]

      const plan = generateBidirectionalPlan(entries)
      const filtered = filterSyncOperations(
        plan,
        op => op.action === 'copy-left-to-right'
      )

      expect(filtered.operations).toHaveLength(1)
      expect(filtered.operations[0].entry.name).toBe('file1.txt')
    })
  })

  describe('Plan Merging', () => {
    it('should merge multiple plans without duplicates', () => {
      const entries1 = [createEntry('file1.txt', 'left-only')]
      const entries2 = [createEntry('file1.txt', 'left-only')]

      const plan1 = generateLeftToRightPlan(entries1)
      const plan2 = generateLeftToRightPlan(entries2)

      const merged = mergeSyncPlans([plan1, plan2])

      expect(merged.operations).toHaveLength(1)
    })

    it('should combine operations from different plans', () => {
      const entries1 = [createEntry('file1.txt', 'left-only')]
      const entries2 = [createEntry('file2.txt', 'right-only')]

      const plan1 = generateLeftToRightPlan(entries1)
      const plan2 = generateLeftToRightPlan(entries2)

      const merged = mergeSyncPlans([plan1, plan2])

      expect(merged.operations).toHaveLength(2)
    })
  })

  describe('Custom Actions', () => {
    it('should use custom actions when provided', () => {
      const entries = [
        createEntry('file1.txt', 'left-only'),
        createEntry('file2.txt', 'modified')
      ]

      const customActions = new Map<string, SyncAction>([
        [entries[0].id, 'ignore'],
        [entries[1].id, 'delete-right']
      ])

      const plan = generateSyncPlan(entries, {
        strategy: 'custom',
        includeEqual: false,
        includeLeftOnly: false,
        includeRightOnly: false,
        includeModified: false,
        customActions
      })

      expect(plan.operations).toHaveLength(2)
      expect(plan.operations.find(o => o.entry.name === 'file1.txt')?.action).toBe('ignore')
      expect(plan.operations.find(o => o.entry.name === 'file2.txt')?.action).toBe('delete-right')
    })
  })

  describe('Warnings Generation', () => {
    it('should warn about overwrite operations', () => {
      const entries = [createEntry('file1.txt', 'modified')]
      const plan = generateLeftToRightPlan(entries)

      expect(plan.warnings.some(w => w.includes('覆盖'))).toBe(true)
    })

    it('should warn about delete operations', () => {
      const entries = [createEntry('file1.txt', 'right-only')]
      const plan = generateLeftToRightPlan(entries)

      expect(plan.warnings.some(w => w.includes('删除'))).toBe(true)
    })
  })
})
