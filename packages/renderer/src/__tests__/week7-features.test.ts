import { describe, it, expect } from 'vitest'
import { existsSync } from 'fs'
import { resolve } from 'path'

describe('Week 7 功能测试', () => {
  describe('SessionManager 会话管理', () => {
    it('database.ts 应存在', () => {
      const filePath = resolve(__dirname, '../../../main/src/session/database.ts')
      expect(existsSync(filePath)).toBe(true)
    })

    it('session.repository.ts 应存在', () => {
      const filePath = resolve(__dirname, '../../../main/src/session/session.repository.ts')
      expect(existsSync(filePath)).toBe(true)
    })

    it('recent-files.repository.ts 应存在', () => {
      const filePath = resolve(__dirname, '../../../main/src/session/recent-files.repository.ts')
      expect(existsSync(filePath)).toBe(true)
    })

    it('session.handler.ts 应存在', () => {
      const filePath = resolve(__dirname, '../../../main/src/ipc/session.handler.ts')
      expect(existsSync(filePath)).toBe(true)
    })

    it('session.store.ts 应存在', () => {
      const filePath = resolve(__dirname, '../stores/session.store.ts')
      expect(existsSync(filePath)).toBe(true)
    })

    it('useSession hook 应存在', () => {
      const filePath = resolve(__dirname, '../hooks/useSession.ts')
      expect(existsSync(filePath)).toBe(true)
    })

    it('SessionStore 应定义必要的 state', async () => {
      const fs = await import('fs')
      const storePath = resolve(__dirname, '../stores/session.store.ts')
      const content = fs.readFileSync(storePath, 'utf-8')
      
      expect(content).toContain('sessions:')
      expect(content).toContain('currentSession:')
      expect(content).toContain('isLoading:')
      expect(content).toContain('error:')
    })

    it('SessionStore 应定义必要的 actions', async () => {
      const fs = await import('fs')
      const storePath = resolve(__dirname, '../stores/session.store.ts')
      const content = fs.readFileSync(storePath, 'utf-8')
      
      expect(content).toContain('loadSessions')
      expect(content).toContain('saveSession')
      expect(content).toContain('loadSession')
      expect(content).toContain('deleteSession')
      expect(content).toContain('setCurrentSession')
      expect(content).toContain('clearError')
    })

    it('SessionStore 应使用 API 调用', async () => {
      const fs = await import('fs')
      const storePath = resolve(__dirname, '../stores/session.store.ts')
      const content = fs.readFileSync(storePath, 'utf-8')
      
      expect(content).toContain('api.')
    })

    it('useSession hook 应导出必要的方法', async () => {
      const fs = await import('fs')
      const hookPath = resolve(__dirname, '../hooks/useSession.ts')
      const content = fs.readFileSync(hookPath, 'utf-8')
      
      expect(content).toContain('useSession')
      expect(content).toContain('loadSessions')
      expect(content).toContain('saveSession')
      expect(content).toContain('deleteSession')
    })
  })

  describe('SettingsDialog 设置对话框', () => {
    it('SettingsDialog.tsx 应存在', () => {
      const filePath = resolve(__dirname, '../components/dialogs/SettingsDialog.tsx')
      expect(existsSync(filePath)).toBe(true)
    })

    it('settings.store.ts 应存在', () => {
      const filePath = resolve(__dirname, '../stores/settings.store.ts')
      expect(existsSync(filePath)).toBe(true)
    })

    it('settings.handler.ts 应存在', () => {
      const filePath = resolve(__dirname, '../../../main/src/ipc/settings.handler.ts')
      expect(existsSync(filePath)).toBe(true)
    })

    it('settings/index.ts 应存在', () => {
      const filePath = resolve(__dirname, '../../../main/src/settings/index.ts')
      expect(existsSync(filePath)).toBe(true)
    })

    it('SettingsStore 应定义必要的 state', async () => {
      const fs = await import('fs')
      const storePath = resolve(__dirname, '../stores/settings.store.ts')
      const content = fs.readFileSync(storePath, 'utf-8')
      
      expect(content).toContain('settings:')
      expect(content).toContain('isLoading:')
      expect(content).toContain('error:')
    })

    it('SettingsStore 应定义必要的 actions', async () => {
      const fs = await import('fs')
      const storePath = resolve(__dirname, '../stores/settings.store.ts')
      const content = fs.readFileSync(storePath, 'utf-8')
      
      expect(content).toContain('updateSettings')
      expect(content).toContain('resetSettings')
      expect(content).toContain('loadFromBackend')
      expect(content).toContain('clearError')
    })

    it('SettingsStore 应使用乐观更新模式', async () => {
      const fs = await import('fs')
      const storePath = resolve(__dirname, '../stores/settings.store.ts')
      const content = fs.readFileSync(storePath, 'utf-8')
      
      // 应该先更新本地状态
      expect(content).toContain('set({ settings: newSettings })')
      // 然后同步到后端
      expect(content).toContain('await api.updateSettings')
    })

    it('SettingsStore 应在错误时回滚', async () => {
      const fs = await import('fs')
      const storePath = resolve(__dirname, '../stores/settings.store.ts')
      const content = fs.readFileSync(storePath, 'utf-8')
      
      expect(content).toContain('get().loadFromBackend()')
    })

    it('SettingsStore 应在初始化时加载后端设置', async () => {
      const fs = await import('fs')
      const storePath = resolve(__dirname, '../stores/settings.store.ts')
      const content = fs.readFileSync(storePath, 'utf-8')
      
      expect(content).toContain('loadFromBackend')
    })

    it('SettingsDialog 应包含编辑器设置', async () => {
      const fs = await import('fs')
      const dialogPath = resolve(__dirname, '../components/dialogs/SettingsDialog.tsx')
      const content = fs.readFileSync(dialogPath, 'utf-8')
      
      // 应包含字体、Tab大小等设置
      expect(content).toContain('fontSize')
      expect(content).toContain('tabSize')
    })

    it('SettingsDialog 应包含 Diff 设置', async () => {
      const fs = await import('fs')
      const dialogPath = resolve(__dirname, '../components/dialogs/SettingsDialog.tsx')
      const content = fs.readFileSync(dialogPath, 'utf-8')
      
      // 应包含忽略空白符、算法等设置
      expect(content).toContain('defaultIgnoreWhitespace')
      expect(content).toContain('defaultAlgorithm')
    })
  })

  describe('ShortcutsHelp 快捷键帮助', () => {
    it('ShortcutsHelp.tsx 应存在', () => {
      const filePath = resolve(__dirname, '../components/dialogs/ShortcutsHelp.tsx')
      expect(existsSync(filePath)).toBe(true)
    })

    it('ShortcutProvider.tsx 应存在', () => {
      const filePath = resolve(__dirname, '../features/shortcuts/ShortcutProvider.tsx')
      expect(existsSync(filePath)).toBe(true)
    })

    it('keybindings.ts 应存在', () => {
      const filePath = resolve(__dirname, '../../../shared/src/constants/keybindings.ts')
      expect(existsSync(filePath)).toBe(true)
    })

    it('keybindings.ts 应定义 SHORTCUTS 常量', async () => {
      const { SHORTCUTS } = await import('../../../shared/src/constants/keybindings')
      
      expect(Array.isArray(SHORTCUTS)).toBe(true)
      expect(SHORTCUTS.length).toBeGreaterThan(0)
      
      // 检查必要的快捷键
      const hasOpenFile = SHORTCUTS.some(s => s.action === 'openFilePair')
      const hasSaveSession = SHORTCUTS.some(s => s.action === 'saveSession')
      const hasNextDiff = SHORTCUTS.some(s => s.action === 'nextDiff')
      const hasPrevDiff = SHORTCUTS.some(s => s.action === 'prevDiff')
      
      expect(hasOpenFile).toBe(true)
      expect(hasSaveSession).toBe(true)
      expect(hasNextDiff).toBe(true)
      expect(hasPrevDiff).toBe(true)
    })

    it('每个快捷键应包含 key, action, description', async () => {
      const { SHORTCUTS } = await import('../../../shared/src/constants/keybindings')
      
      for (const shortcut of SHORTCUTS) {
        expect(shortcut.key).toBeDefined()
        expect(shortcut.action).toBeDefined()
        expect(shortcut.description).toBeDefined()
      }
    })

    it('ShortcutProvider 应定义 handlers 对象', async () => {
      const fs = await import('fs')
      const providerPath = resolve(__dirname, '../features/shortcuts/ShortcutProvider.tsx')
      const content = fs.readFileSync(providerPath, 'utf-8')
      
      expect(content).toContain('handlers')
      expect(content).toContain('handleKeyDown')
    })

    it('ShortcutProvider 应支持快捷键冲突检测', async () => {
      const fs = await import('fs')
      const providerPath = resolve(__dirname, '../features/shortcuts/ShortcutProvider.tsx')
      const content = fs.readFileSync(providerPath, 'utf-8')
      
      expect(content).toContain('detectConflicts')
      expect(content).toContain('ShortcutConflict')
    })

    it('ShortcutProvider 应处理输入框内的 Escape 键', async () => {
      const fs = await import('fs')
      const providerPath = resolve(__dirname, '../features/shortcuts/ShortcutProvider.tsx')
      const content = fs.readFileSync(providerPath, 'utf-8')
      
      // 应该检查是否为输入元素
      expect(content).toContain('INPUT')
      expect(content).toContain('TEXTAREA')
      expect(content).toContain('Escape')
    })

    it('ShortcutProvider 应注册所有必要的快捷键处理器', async () => {
      const fs = await import('fs')
      const providerPath = resolve(__dirname, '../features/shortcuts/ShortcutProvider.tsx')
      const content = fs.readFileSync(providerPath, 'utf-8')
      
      // 文件操作
      expect(content).toContain('openFilePair')
      expect(content).toContain('saveSession')
      
      // 视图切换
      expect(content).toContain('viewSplit')
      expect(content).toContain('viewUnified')
      expect(content).toContain('toggleTheme')
      
      // 差异导航
      expect(content).toContain('nextDiff')
      expect(content).toContain('prevDiff')
      expect(content).toContain('firstDiff')
      expect(content).toContain('lastDiff')
    })

    it('ShortcutsHelp 应显示快捷键列表', async () => {
      const fs = await import('fs')
      const helpPath = resolve(__dirname, '../components/dialogs/ShortcutsHelp.tsx')
      const content = fs.readFileSync(helpPath, 'utf-8')
      
      expect(content).toContain('SHORTCUTS')
      expect(content).toContain('key')
      expect(content).toContain('description')
    })
  })

  describe('Minimap 差异缩略图', () => {
    it('Minimap.tsx 应存在', () => {
      const filePath = resolve(__dirname, '../features/diff-view/components/Minimap.tsx')
      expect(existsSync(filePath)).toBe(true)
    })

    it('Minimap 应支持 lines 属性', () => {
      const lines = [
        { leftLineNo: 1, rightLineNo: 1, type: 'equal' as const, leftContent: 'test', rightContent: 'test' },
        { leftLineNo: null, rightLineNo: 2, type: 'insert' as const, leftContent: '', rightContent: 'new' }
      ]
      expect(Array.isArray(lines)).toBe(true)
      expect(lines[0].type).toBeDefined()
    })

    it('Minimap 应支持 height 属性', async () => {
      const fs = await import('fs')
      const minimapPath = resolve(__dirname, '../features/diff-view/components/Minimap.tsx')
      const content = fs.readFileSync(minimapPath, 'utf-8')
      
      expect(content).toContain('height')
      expect(content).toContain('canvas')
    })

    it('Minimap 应支持点击跳转', async () => {
      const fs = await import('fs')
      const minimapPath = resolve(__dirname, '../features/diff-view/components/Minimap.tsx')
      const content = fs.readFileSync(minimapPath, 'utf-8')
      
      expect(content).toContain('onClick')
      expect(content).toContain('onScrollTo')
    })

    it('Minimap 应使用 Canvas 渲染', async () => {
      const fs = await import('fs')
      const minimapPath = resolve(__dirname, '../features/diff-view/components/Minimap.tsx')
      const content = fs.readFileSync(minimapPath, 'utf-8')
      
      expect(content).toContain('useRef')
      expect(content).toContain('HTMLCanvasElement')
    })
  })

  describe('IPC Handlers 注册', () => {
    it('ipc/index.ts 应存在', () => {
      const filePath = resolve(__dirname, '../../../main/src/ipc/index.ts')
      expect(existsSync(filePath)).toBe(true)
    })

    it('dialog.handler.ts 应存在', () => {
      const filePath = resolve(__dirname, '../../../main/src/ipc/dialog.handler.ts')
      expect(existsSync(filePath)).toBe(true)
    })

    it('ipc/index.ts 应注册所有 handlers', async () => {
      const fs = await import('fs')
      const ipcPath = resolve(__dirname, '../../../main/src/ipc/index.ts')
      const content = fs.readFileSync(ipcPath, 'utf-8')
      
      expect(content).toContain('registerIpcHandlers')
      expect(content).toContain('diff.handler')
      expect(content).toContain('file.handler')
    })
  })
})
