import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ipcMain, dialog, BrowserWindow } from 'electron'
import type { DirectoryComparison, ReportFormat, ReportOptions } from '@shared/types'

// Mock Electron
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
  dialog: {
    showSaveDialog: vi.fn(),
  },
  BrowserWindow: {
    fromWebContents: vi.fn(),
  },
}))

// Mock fs
const mockWriteFile = vi.fn()

vi.mock('fs', () => ({
  promises: {
    writeFile: (...args: any[]) => mockWriteFile(...args),
  },
}))

// Mock report module
const mockGenerateReport = vi.fn()

vi.mock('../directory/report', () => ({
  generateReport: (...args: any[]) => mockGenerateReport(...args),
  DEFAULT_REPORT_OPTIONS: {
    format: 'html' as ReportFormat,
    includeStatistics: true,
    includeEntries: true,
  },
}))

describe('Report Handler', () => {
  const mockComparison: DirectoryComparison = {
    id: 'compare-1',
    leftRoot: {
      path: '/left',
      name: 'left',
      totalFiles: 10,
      totalSize: 1024,
      modifiedTime: new Date(),
    },
    rightRoot: {
      path: '/right',
      name: 'right',
      totalFiles: 10,
      totalSize: 1024,
      modifiedTime: new Date(),
    },
    entries: [],
    statistics: {
      totalFiles: 10,
      equalFiles: 5,
      modifiedFiles: 2,
      leftOnlyFiles: 1,
      rightOnlyFiles: 2,
      duration: 1000,
    },
    completedAt: new Date(),
    options: {} as any,
  }

  const mockReport = '<html><body>Report</body></html>'

  let registeredHandlers: Map<string, Function> = new Map()

  beforeEach(() => {
    vi.clearAllMocks()
    registeredHandlers.clear()

    // Capture registered handlers
    vi.mocked(ipcMain.handle).mockImplementation((channel: string, handler: Function) => {
      registeredHandlers.set(channel, handler)
    })

    // Mock BrowserWindow.fromWebContents
    vi.mocked(BrowserWindow.fromWebContents).mockReturnValue({ id: 1 } as any)

    // Setup default mocks
    mockGenerateReport.mockReturnValue(mockReport)
    mockWriteFile.mockResolvedValue(undefined)

    // Import and register handlers
    return import('../report.handler').then(({ registerReportHandlers }) => {
      registerReportHandlers()
    })
  })

  describe('Handler Registration', () => {
    it('should register all report handlers', () => {
      expect(ipcMain.handle).toHaveBeenCalledWith('report:generate', expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith('report:save', expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith('report:generateAndSave', expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith('report:preview', expect.any(Function))
    })
  })

  describe('report:generate', () => {
    it('should generate report', async () => {
      const handler = registeredHandlers.get('report:generate')
      const result = await handler({}, mockComparison, {})

      expect(mockGenerateReport).toHaveBeenCalledWith(mockComparison, expect.any(Object))
      expect(result).toBe(mockReport)
    })

    it('should merge options with defaults', async () => {
      const customOptions: Partial<ReportOptions> = {
        format: 'json',
        includeStatistics: false,
      }

      const handler = registeredHandlers.get('report:generate')
      await handler({}, mockComparison, customOptions)

      expect(mockGenerateReport).toHaveBeenCalledWith(mockComparison, expect.objectContaining({
        format: 'json',
        includeStatistics: false,
        includeEntries: true,
      }))
    })
  })

  describe('report:save', () => {
    it('should save report to file', async () => {
      vi.mocked(dialog.showSaveDialog).mockResolvedValue({
        canceled: false,
        filePath: '/reports/report.html',
      } as any)

      const handler = registeredHandlers.get('report:save')
      const result = await handler({ sender: { id: 1 } }, mockReport, 'html')

      expect(dialog.showSaveDialog).toHaveBeenCalled()
      expect(mockWriteFile).toHaveBeenCalledWith('/reports/report.html', mockReport, 'utf-8')
      expect(result).toEqual({ success: true, filePath: '/reports/report.html' })
    })

    it('should return success:false when cancelled', async () => {
      vi.mocked(dialog.showSaveDialog).mockResolvedValue({
        canceled: true,
        filePath: undefined,
      } as any)

      const handler = registeredHandlers.get('report:save')
      const result = await handler({ sender: { id: 1 } }, mockReport, 'html')

      expect(result).toEqual({ success: false })
      expect(mockWriteFile).not.toHaveBeenCalled()
    })

    it('should use default filename when not provided', async () => {
      vi.mocked(dialog.showSaveDialog).mockResolvedValue({
        canceled: false,
        filePath: '/reports/comparison-report-1234567890.html',
      } as any)

      const handler = registeredHandlers.get('report:save')
      await handler({ sender: { id: 1 } }, mockReport, 'html')

      expect(dialog.showSaveDialog).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        defaultPath: expect.stringMatching(/comparison-report-\d+\.html/),
      }))
    })

    it('should use provided default filename', async () => {
      vi.mocked(dialog.showSaveDialog).mockResolvedValue({
        canceled: false,
        filePath: '/reports/my-report.html',
      } as any)

      const handler = registeredHandlers.get('report:save')
      await handler({ sender: { id: 1 } }, mockReport, 'html', 'my-report')

      expect(dialog.showSaveDialog).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        defaultPath: 'my-report.html',
      }))
    })

    it('should return error on write failure', async () => {
      vi.mocked(dialog.showSaveDialog).mockResolvedValue({
        canceled: false,
        filePath: '/reports/report.html',
      } as any)
      mockWriteFile.mockRejectedValue(new Error('Write failed'))

      const handler = registeredHandlers.get('report:save')
      const result = await handler({ sender: { id: 1 } }, mockReport, 'html')

      expect(result).toEqual({ success: false, error: 'Write failed' })
    })

    it('should use correct filters for html format', async () => {
      vi.mocked(dialog.showSaveDialog).mockResolvedValue({
        canceled: true,
        filePath: undefined,
      } as any)

      const handler = registeredHandlers.get('report:save')
      await handler({ sender: { id: 1 } }, mockReport, 'html')

      expect(dialog.showSaveDialog).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        filters: [
          { name: 'HTML 文件', extensions: ['html', 'htm'] },
          { name: '所有文件', extensions: ['*'] },
        ],
      }))
    })

    it('should use correct filters for json format', async () => {
      vi.mocked(dialog.showSaveDialog).mockResolvedValue({
        canceled: true,
        filePath: undefined,
      } as any)

      const handler = registeredHandlers.get('report:save')
      await handler({ sender: { id: 1 } }, mockReport, 'json')

      expect(dialog.showSaveDialog).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        filters: [
          { name: 'JSON 文件', extensions: ['json'] },
          { name: '所有文件', extensions: ['*'] },
        ],
      }))
    })
  })

  describe('report:generateAndSave', () => {
    it('should generate and save in one step', async () => {
      vi.mocked(dialog.showSaveDialog).mockResolvedValue({
        canceled: false,
        filePath: '/reports/report.html',
      } as any)

      const handler = registeredHandlers.get('report:generateAndSave')
      const result = await handler({ sender: { id: 1 } }, mockComparison, {})

      expect(mockGenerateReport).toHaveBeenCalled()
      expect(mockWriteFile).toHaveBeenCalled()
      expect(result).toEqual({ success: true, filePath: '/reports/report.html' })
    })

    it('should return error on generation failure', async () => {
      mockGenerateReport.mockImplementation(() => {
        throw new Error('Generation failed')
      })

      const handler = registeredHandlers.get('report:generateAndSave')
      const result = await handler({ sender: { id: 1 } }, mockComparison, {})

      expect(result).toEqual({ success: false, error: 'Generation failed' })
    })
  })

  describe('report:preview', () => {
    it('should generate html preview', async () => {
      const handler = registeredHandlers.get('report:preview')
      const result = await handler({}, mockComparison, {})

      expect(mockGenerateReport).toHaveBeenCalledWith(mockComparison, expect.objectContaining({
        format: 'html',
      }))
      expect(result).toBe(mockReport)
    })

    it('should force html format regardless of options', async () => {
      const handler = registeredHandlers.get('report:preview')
      await handler({}, mockComparison, { format: 'json' } as any)

      expect(mockGenerateReport).toHaveBeenCalledWith(mockComparison, expect.objectContaining({
        format: 'html',
      }))
    })
  })
})
