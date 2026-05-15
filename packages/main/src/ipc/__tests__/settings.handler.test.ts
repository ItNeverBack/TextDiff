import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ipcMain } from 'electron'
import type { AppSettings } from '@shared/types'

// Mock Electron
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
}))

// Mock settings manager
const mockGetSettings = vi.fn()
const mockUpdateSettings = vi.fn()

vi.mock('../settings', () => ({
  settingsManager: {
    get: () => mockGetSettings(),
    update: (updates: Partial<AppSettings>) => mockUpdateSettings(updates),
  },
}))

describe('Settings Handler', () => {
  const mockSettings: AppSettings = {
    theme: 'system',
    language: 'zh-CN',
    diff: {
      defaultIgnoreWhitespace: 'leading-trailing',
      defaultIgnoreCase: false,
      defaultIgnoreLineEndings: true,
      defaultIgnoreComments: false,
      defaultCommentPrefixes: ['//', '#'],
      defaultAlgorithm: 'myers',
      contextLines: 3,
      foldUnchanged: false,
    },
    editor: {
      fontSize: 13,
      fontFamily: 'monospace',
      tabSize: 2,
      showInvisibleCharacters: false,
      wordWrap: false,
    },
    keyBindings: {},
  }

  let registeredHandlers: Map<string, Function> = new Map()

  beforeEach(() => {
    vi.clearAllMocks()
    registeredHandlers.clear()

    // Capture registered handlers
    vi.mocked(ipcMain.handle).mockImplementation((channel: string, handler: Function) => {
      registeredHandlers.set(channel, handler)
    })

    // Import and register handlers
    return import('../settings.handler').then(({ registerSettingsHandlers }) => {
      registerSettingsHandlers()
    })
  })

  describe('Handler Registration', () => {
    it('should register all settings handlers', () => {
      expect(ipcMain.handle).toHaveBeenCalledWith('settings:get', expect.any(Function))
      expect(ipcMain.handle).toHaveBeenCalledWith('settings:update', expect.any(Function))
    })
  })

  describe('settings:get', () => {
    it('should return current settings', async () => {
      mockGetSettings.mockReturnValue(mockSettings)

      const handler = registeredHandlers.get('settings:get')
      const result = await handler()

      expect(mockGetSettings).toHaveBeenCalled()
      expect(result).toEqual(mockSettings)
    })
  })

  describe('settings:update', () => {
    it('should update settings', async () => {
      mockUpdateSettings.mockResolvedValue(undefined)

      const updates = { theme: 'dark' as const }
      const handler = registeredHandlers.get('settings:update')
      await handler({}, updates)

      expect(mockUpdateSettings).toHaveBeenCalledWith(updates)
    })

    it('should support partial updates', async () => {
      mockUpdateSettings.mockResolvedValue(undefined)

      const updates = {
        diff: {
          defaultAlgorithm: 'patience' as const,
          contextLines: 5,
        },
      }

      const handler = registeredHandlers.get('settings:update')
      await handler({}, updates)

      expect(mockUpdateSettings).toHaveBeenCalledWith(updates)
    })

    it('should support nested updates', async () => {
      mockUpdateSettings.mockResolvedValue(undefined)

      const updates = {
        editor: {
          fontSize: 14,
        },
      }

      const handler = registeredHandlers.get('settings:update')
      await handler({}, updates)

      expect(mockUpdateSettings).toHaveBeenCalledWith(updates)
    })
  })
})
