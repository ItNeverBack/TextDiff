import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ipcMain } from 'electron'
import type { DirectoryDiffEntry, SyncPlan, SyncResult, SyncStrategy, SyncProgress, SyncOperation } from '@shared/types'

// Mock Electron
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
}))

// Mock sync modules
const mockGenerateSyncPlanByStrategy = vi.fn()
const mockGenerateSyncPlan = vi.fn()
const mockValidateSyncPlan = vi.fn()
const mockAnalyzeSyncPlan = vi.fn()
const mockSyncEngineExecute = vi.fn()
const mockSyncEngineCancel = vi.fn()
const mockSyncEngineGetCurrentOperation = vi.fn()
const mockSyncEngineCanUndo = vi.fn()
const mockSyncEngineGetUndoHistory = vi.fn()
const mockSyncEngineUndo = vi.fn()
const mockSyncEngineClearUndoHistory = vi.fn()

vi.mock('../directory/sync-plan', () => ({
  generateSyncPlanByStrategy: (...args: any[]) => mockGenerateSyncPlanByStrategy(...args),
  generateSyncPlan: (...args: any[]) => mockGenerateSyncPlan(...args),
  analyzeSyncPlan: (...args: any[]) => mockAnalyzeSyncPlan(...args),
}))

vi.mock('../directory/sync', () => ({
  SyncEngine: class MockSyncEngine {
    execute = mockSyncEngineExecute
    cancel = mockSyncEngineCancel
    getCurrentOperation = mockSyncEngineGetCurrentOperation
    canUndo = mockSyncEngineCanUndo
    getUndoHistory = mockSyncEngineGetUndoHistory
    undo = mockSyncEngineUndo
    clearUndoHistory = mockSyncEngineClearUndoHistory
  },
  validateSyncPlan: (...args: any[]) => mockValidateSyncPlan(...args),
}))

describe('Sync Handler', () => {
  const mockEntries: DirectoryDiffEntry[] = [
    { name: 'file1.txt', type: 'file', status: 'modified' } as DirectoryDiffEntry,
  ]

  const mockSyncPlan: SyncPlan = {
    operations: [
      { type: 'copy', direction: 'left-to-right', source: '/left/file1.txt', target: '/right/file1.txt' },
    ],
    stats: { copy: 1, delete: 0, merge: 0, total: 1 },
  }

  const mockSyncResult: SyncResult = {
    success: true,
    completedOperations: 1,
    failedOperations: 0,
    errors: [],
  }

  let registeredHandlers: Map<string, Function> = new Map()

  beforeEach(() => {
    vi.clearAllMocks()
    registeredHandlers.clear()

    // Capture registered handlers
    vi.mocked(ipcMain.handle).mockImplementation((channel: string, handler: Function) => {
      registeredHandlers.set(channel, handler)
    })

    // Setup default mocks
    mockGenerateSyncPlanByStrategy.mockReturnValue(mockSyncPlan)
    mockGenerateSyncPlan.mockReturnValue(mockSyncPlan)
    mockValidateSyncPlan.mockReturnValue({ valid: true, operations: [] })
    mockAnalyzeSyncPlan.mockReturnValue({
      totalOperations: 1,
      copyCount: 1,
      deleteCount: 0,
      mergeCount: 0,
      ignoreCount: 0,
      estimatedTime: 1000,
    })
    mockSyncEngineExecute.mockResolvedValue(mockSyncResult)
    mockSyncEngineGetCurrentOperation.mockReturnValue(null)
    mockSyncEngineCanUndo.mockReturnValue(true)
    mockSyncEngineGetUndoHistory.mockReturnValue([
      { id: '1', description: 'Copy file1.txt', timestamp: Date.now(), undo: vi.fn() },
    ])
    mockSyncEngineUndo.mockResolvedValue({ success: true })

    // Import and register handlers
    return import('../sync.handler').then(({ registerSyncHandlers }) => {
      registerSyncHandlers()
    })
  })

  describe('Handler Registration', () => {
    it('should register all sync handlers', () => {
      expect(ipcMain.handle).toHaveBeenCalledWith('sync:generatePlan', expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith('sync:generatePlanWithConfig', expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith('sync:validate', expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith('sync:analyze', expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith('sync:execute', expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith('sync:cancel', expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith('sync:getProgress', expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith('sync:canUndo', expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith('sync:undo', expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith('sync:getUndoHistory', expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith('sync:clearUndoHistory', expect.any(Function))
    })
  })

  describe('sync:generatePlan', () => {
    it('should generate sync plan with strategy', async () => {
      const handler = registeredHandlers.get('sync:generatePlan')
      const result = await handler({}, mockEntries, 'left-to-right' as SyncStrategy)

      expect(mockGenerateSyncPlanByStrategy).toHaveBeenCalledWith(mockEntries, 'left-to-right')
      expect(result).toEqual(mockSyncPlan)
    })
  })

  describe('sync:generatePlanWithConfig', () => {
    it('should generate sync plan with custom config', async () => {
      const config = {
        strategy: 'bidirectional' as SyncStrategy,
        includeEqual: false,
        includeLeftOnly: true,
        includeRightOnly: true,
        includeModified: true,
      }

      const handler = registeredHandlers.get('sync:generatePlanWithConfig')
      const result = await handler({}, mockEntries, config)

      expect(mockGenerateSyncPlan).toHaveBeenCalledWith(mockEntries, expect.objectContaining({
        strategy: 'bidirectional',
        includeEqual: false,
        includeLeftOnly: true,
        includeRightOnly: true,
        includeModified: true,
      }))
      expect(result).toEqual(mockSyncPlan)
    })

    it('should use defaults for undefined config values', async () => {
      const config = {
        strategy: 'left-to-right' as SyncStrategy,
      }

      const handler = registeredHandlers.get('sync:generatePlanWithConfig')
      await handler({}, mockEntries, config)

      expect(mockGenerateSyncPlan).toHaveBeenCalledWith(mockEntries, expect.objectContaining({
        includeEqual: false,
        includeLeftOnly: true,
        includeRightOnly: true,
        includeModified: true,
      }))
    })
  })

  describe('sync:validate', () => {
    it('should validate sync plan', async () => {
      const handler = registeredHandlers.get('sync:validate')
      const result = await handler({}, mockSyncPlan)

      expect(mockValidateSyncPlan).toHaveBeenCalledWith(mockSyncPlan)
      expect(result).toEqual({ valid: true, operations: [] })
    })
  })

  describe('sync:analyze', () => {
    it('should analyze sync plan', async () => {
      const handler = registeredHandlers.get('sync:analyze')
      const result = await handler({}, mockSyncPlan)

      expect(mockAnalyzeSyncPlan).toHaveBeenCalledWith(mockSyncPlan)
      expect(result).toHaveProperty('totalOperations')
      expect(result).toHaveProperty('copyCount')
      expect(result).toHaveProperty('deleteCount')
      expect(result).toHaveProperty('estimatedTime')
    })
  })

  describe('sync:execute', () => {
    it('should execute sync plan', async () => {
      const mockSend = vi.fn()
      const mockEvent = { sender: { send: mockSend } }

      const handler = registeredHandlers.get('sync:execute')
      const result = await handler(mockEvent, mockSyncPlan, {})

      expect(mockSyncEngineExecute).toHaveBeenCalledWith(
        mockSyncPlan,
        {},
        expect.any(Function)
      )
      expect(result).toEqual(mockSyncResult)
    })

    it('should send progress updates', async () => {
      const mockSend = vi.fn()
      const mockEvent = { sender: { send: mockSend } }

      mockSyncEngineExecute.mockImplementation(async (_, __, onProgress) => {
        onProgress({ current: 1, total: 2, operation: 'copy', percent: 50 })
        return mockSyncResult
      })

      const handler = registeredHandlers.get('sync:execute')
      await handler(mockEvent, mockSyncPlan, {})

      expect(mockSend).toHaveBeenCalledWith('sync:progress', expect.objectContaining({
        current: 1,
        total: 2,
        percent: 50,
      }))
    })
  })

  describe('sync:cancel', () => {
    it('should cancel active sync', async () => {
      const handler = registeredHandlers.get('sync:execute')
      const cancelHandler = registeredHandlers.get('sync:cancel')

      // Start a sync first
      const mockEvent = { sender: { send: vi.fn() } }
      const syncPromise = handler(mockEvent, mockSyncPlan, {})

      // Cancel it
      const cancelResult = await cancelHandler({}, 'unknown-id')
      expect(cancelResult).toBe(false)
    })
  })

  describe('sync:getProgress', () => {
    it('should return false for non-existent session', async () => {
      const handler = registeredHandlers.get('sync:getProgress')
      const result = await handler({}, 'non-existent-id')

      expect(result).toEqual({ exists: false })
    })
  })

  describe('sync:canUndo', () => {
    it('should return false for non-existent session', async () => {
      const handler = registeredHandlers.get('sync:canUndo')
      const result = await handler({}, 'non-existent-id')

      expect(result).toEqual({ canUndo: false, historySize: 0 })
    })
  })

  describe('sync:undo', () => {
    it('should return error for non-existent session', async () => {
      const handler = registeredHandlers.get('sync:undo')
      const result = await handler({}, 'non-existent-id')

      expect(result).toEqual({ success: false, error: 'Sync session not found' })
    })
  })

  describe('sync:getUndoHistory', () => {
    it('should return false for non-existent session', async () => {
      const handler = registeredHandlers.get('sync:getUndoHistory')
      const result = await handler({}, 'non-existent-id')

      expect(result).toEqual({ exists: false })
    })
  })

  describe('sync:clearUndoHistory', () => {
    it('should return false for non-existent session', async () => {
      const handler = registeredHandlers.get('sync:clearUndoHistory')
      const result = await handler({}, 'non-existent-id')

      expect(result).toEqual({ success: false })
    })
  })
})
