import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UndoManager, createUndoOperation, getUndoManager, resetUndoManager } from '../undo'
import type { SyncOperation, DirectoryDiffEntry } from '@shared/types'
import * as fs from 'fs'

// Mock fs
vi.mock('fs', () => ({
  promises: {
    rm: vi.fn(),
    mkdir: vi.fn(),
    copyFile: vi.fn(),
    stat: vi.fn(),
    readdir: vi.fn(),
  },
}))

describe('UndoManager', () => {
  let undoManager: UndoManager

  beforeEach(() => {
    undoManager = new UndoManager()
    vi.clearAllMocks()
  })

  describe('basic operations', () => {
    it('should add undo operation', () => {
      const operation = {
        id: 'undo-1',
        timestamp: Date.now(),
        originalOperation: {} as SyncOperation,
        undoAction: vi.fn().mockResolvedValue(undefined),
        description: 'Test operation',
      }

      undoManager.add(operation)

      expect(undoManager.canUndo()).toBe(true)
      expect(undoManager.getHistorySize()).toBe(1)
    })

    it('should undo last operation', async () => {
      const undoAction = vi.fn().mockResolvedValue(undefined)
      const operation = {
        id: 'undo-1',
        timestamp: Date.now(),
        originalOperation: {} as SyncOperation,
        undoAction,
        description: 'Test operation',
      }

      undoManager.add(operation)
      const result = await undoManager.undo()

      expect(result.success).toBe(true)
      expect(result.operation).toEqual(operation)
      expect(undoAction).toHaveBeenCalled()
      expect(undoManager.canUndo()).toBe(false)
    })

    it('should return error when no operations to undo', async () => {
      const result = await undoManager.undo()

      expect(result.success).toBe(false)
      expect(result.error).toBe('没有可撤销的操作')
    })

    it('should handle undo failure', async () => {
      const undoAction = vi.fn().mockRejectedValue(new Error('Undo failed'))
      const operation = {
        id: 'undo-1',
        timestamp: Date.now(),
        originalOperation: {} as SyncOperation,
        undoAction,
        description: 'Test operation',
      }

      undoManager.add(operation)
      const result = await undoManager.undo()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Undo failed')
      // Operation should be put back
      expect(undoManager.canUndo()).toBe(true)
    })

    it('should clear all operations', () => {
      const operation = {
        id: 'undo-1',
        timestamp: Date.now(),
        originalOperation: {} as SyncOperation,
        undoAction: vi.fn(),
        description: 'Test operation',
      }

      undoManager.add(operation)
      undoManager.clear()

      expect(undoManager.canUndo()).toBe(false)
      expect(undoManager.getHistorySize()).toBe(0)
    })

    it('should limit history size', () => {
      const manager = new UndoManager(3)

      for (let i = 0; i < 5; i++) {
        manager.add({
          id: `undo-${i}`,
          timestamp: Date.now(),
          originalOperation: {} as SyncOperation,
          undoAction: vi.fn(),
          description: `Operation ${i}`,
        })
      }

      expect(manager.getHistorySize()).toBe(3)
    })

    it('should return undoable operations in reverse order', () => {
      const op1 = {
        id: 'undo-1',
        timestamp: 1000,
        originalOperation: {} as SyncOperation,
        undoAction: vi.fn(),
        description: 'Operation 1',
      }
      const op2 = {
        id: 'undo-2',
        timestamp: 2000,
        originalOperation: {} as SyncOperation,
        undoAction: vi.fn(),
        description: 'Operation 2',
      }

      undoManager.add(op1)
      undoManager.add(op2)

      const undoable = undoManager.getUndoableOperations()

      expect(undoable[0]).toEqual(op2)
      expect(undoable[1]).toEqual(op1)
    })
  })

  describe('createUndoOperation', () => {
    const mockEntry: DirectoryDiffEntry = {
      id: '1',
      name: 'file.txt',
      type: 'file',
      status: 'modified',
      relativePath: 'file.txt',
      leftPath: '/left/file.txt',
      rightPath: '/right/file.txt',
    } as DirectoryDiffEntry

    it('should create undo for copy-left-to-right', async () => {
      const operation: SyncOperation = {
        id: 'op-1',
        action: 'copy-left-to-right',
        entry: mockEntry,
        status: 'pending',
      }

      const undo = await createUndoOperation(operation)

      expect(undo.id).toMatch(/^undo-/)
      expect(undo.description).toContain('撤销复制')
      expect(undo.originalOperation).toEqual(operation)

      // Execute undo action
      await undo.undoAction()
      expect(fs.promises.rm).toHaveBeenCalledWith('/right/file.txt', { recursive: true, force: true })
    })

    it('should create undo for copy-right-to-left', async () => {
      const operation: SyncOperation = {
        id: 'op-1',
        action: 'copy-right-to-left',
        entry: mockEntry,
        status: 'pending',
      }

      const undo = await createUndoOperation(operation)

      expect(undo.description).toContain('撤销复制')

      await undo.undoAction()
      expect(fs.promises.rm).toHaveBeenCalledWith('/left/file.txt', { recursive: true, force: true })
    })

    it('should create undo for delete-left with backup', async () => {
      vi.mocked(fs.promises.stat).mockResolvedValue({ isDirectory: () => false } as any)

      const operation: SyncOperation = {
        id: 'op-1',
        action: 'delete-left',
        entry: mockEntry,
        status: 'pending',
      }

      const undo = await createUndoOperation(operation, '/backup/file.txt')

      expect(undo.description).toContain('撤销删除')

      await undo.undoAction()
      expect(fs.promises.mkdir).toHaveBeenCalled()
      expect(fs.promises.copyFile).toHaveBeenCalledWith('/backup/file.txt', '/left/file.txt')
    })

    it('should throw error for delete without backup', async () => {
      const operation: SyncOperation = {
        id: 'op-1',
        action: 'delete-left',
        entry: mockEntry,
        status: 'pending',
      }

      await expect(createUndoOperation(operation)).rejects.toThrow('Cannot create undo for delete without backup')
    })

    it('should throw error for unsupported action', async () => {
      const operation: SyncOperation = {
        id: 'op-1',
        action: 'unknown' as any,
        entry: mockEntry,
        status: 'pending',
      }

      await expect(createUndoOperation(operation)).rejects.toThrow('Unsupported action for undo')
    })
  })

  describe('singleton', () => {
    it('should return same instance', () => {
      const manager1 = getUndoManager()
      const manager2 = getUndoManager()

      expect(manager1).toBe(manager2)
    })

    it('should reset instance', () => {
      const manager1 = getUndoManager()
      resetUndoManager()
      const manager2 = getUndoManager()

      expect(manager1).not.toBe(manager2)
    })
  })
})
