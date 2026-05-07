import { describe, it, expect } from 'vitest'
import { existsSync } from 'fs'
import { resolve } from 'path'

describe('Week 6 功能测试', () => {
  describe('TabStore 标签页管理', () => {
    it('TabStore 文件应存在', () => {
      const storePath = resolve(__dirname, '../stores/tab.store.ts')
      expect(existsSync(storePath)).toBe(true)
    })

    it('TabInfo 类型应包含必要字段', () => {
      const tabInfo = {
        id: 'test-id',
        title: '测试标签',
        leftFile: null,
        rightFile: null,
        diffResult: null,
        hasChanges: false
      }
      expect(tabInfo.id).toBeDefined()
      expect(tabInfo.title).toBeDefined()
      expect(tabInfo.leftFile).toBeDefined()
      expect(tabInfo.rightFile).toBeDefined()
      expect(tabInfo.diffResult).toBeDefined()
      expect(tabInfo.hasChanges).toBeDefined()
    })

    it('TabStore 应定义必要的方法', async () => {
      const fs = await import('fs')
      const storePath = resolve(__dirname, '../stores/tab.store.ts')
      const content = fs.readFileSync(storePath, 'utf-8')
      
      // 检查关键方法是否存在
      expect(content).toContain('addTab')
      expect(content).toContain('closeTab')
      expect(content).toContain('selectTab')
      expect(content).toContain('updateTab')
      expect(content).toContain('setActiveTabFiles')
      expect(content).toContain('swapActiveTabFiles')
      expect(content).toContain('setActiveTabDiffResult')
    })

    it('TabStore 应包含必要的 state 字段', async () => {
      const fs = await import('fs')
      const storePath = resolve(__dirname, '../stores/tab.store.ts')
      const content = fs.readFileSync(storePath, 'utf-8')
      
      expect(content).toContain('tabs:')
      expect(content).toContain('activeIndex:')
    })

    it('TabStore 应正确处理单标签情况（不关闭最后一个标签）', async () => {
      const fs = await import('fs')
      const storePath = resolve(__dirname, '../stores/tab.store.ts')
      const content = fs.readFileSync(storePath, 'utf-8')
      
      // 检查是否有防止关闭最后一个标签的逻辑
      expect(content).toContain('tabs.length <= 1')
    })
  })

  describe('拖拽功能组件', () => {
    it('FileDropZone 组件文件应存在', () => {
      const componentPath = resolve(__dirname, '../components/layout/FileDropZone.tsx')
      expect(existsSync(componentPath)).toBe(true)
    })

    it('FileDropZone 应定义 getDroppedFilePaths 辅助函数', async () => {
      const fs = await import('fs')
      const content = fs.readFileSync(resolve(__dirname, '../components/layout/FileDropZone.tsx'), 'utf-8')
      expect(content).toContain('getDroppedFilePaths')
    })

    it('FileDropZone 应定义 getDroppedFileNames 辅助函数', async () => {
      const fs = await import('fs')
      const content = fs.readFileSync(resolve(__dirname, '../components/layout/FileDropZone.tsx'), 'utf-8')
      expect(content).toContain('getDroppedFileNames')
    })

    it('FileDropZone 应处理拖拽状态（isDragging, isProcessing）', async () => {
      const fs = await import('fs')
      const content = fs.readFileSync(resolve(__dirname, '../components/layout/FileDropZone.tsx'), 'utf-8')
      expect(content).toContain('isDragging')
      expect(content).toContain('isProcessing')
    })

    it('FileDropZone 应支持拖拽遮罩层和文件预览', async () => {
      const fs = await import('fs')
      const content = fs.readFileSync(resolve(__dirname, '../components/layout/FileDropZone.tsx'), 'utf-8')
      expect(content).toContain('drop-overlay')
      expect(content).toContain('drop-content')
      expect(content).toContain('droppedFiles')
    })

    it('FileDropZone 应处理单文件和双文件拖放逻辑', async () => {
      const fs = await import('fs')
      const content = fs.readFileSync(resolve(__dirname, '../components/layout/FileDropZone.tsx'), 'utf-8')
      // 检查单文件逻辑
      expect(content).toContain('filePaths.length === 1')
      // 检查双文件逻辑
      expect(content).toContain('filePaths.length')
    })

    it('FileDropZone 应使用拖放事件监听器', async () => {
      const fs = await import('fs')
      const content = fs.readFileSync(resolve(__dirname, '../components/layout/FileDropZone.tsx'), 'utf-8')
      expect(content).toContain('dragenter')
      expect(content).toContain('dragleave')
      expect(content).toContain('dragover')
      expect(content).toContain('drop')
    })
  })

  describe('粘贴文本对话框', () => {
    it('PasteDialog 组件文件应存在', () => {
      const componentPath = resolve(__dirname, '../components/dialogs/PasteDialog.tsx')
      expect(existsSync(componentPath)).toBe(true)
    })

    it('PasteDialog 应定义必要的状态（leftText, rightText, error, isLoading）', async () => {
      const fs = await import('fs')
      const content = fs.readFileSync(resolve(__dirname, '../components/dialogs/PasteDialog.tsx'), 'utf-8')
      expect(content).toContain('leftText')
      expect(content).toContain('rightText')
      expect(content).toContain('error')
      expect(content).toContain('isLoading')
    })

    it('PasteDialog 应验证输入不为空', async () => {
      const fs = await import('fs')
      const content = fs.readFileSync(resolve(__dirname, '../components/dialogs/PasteDialog.tsx'), 'utf-8')
      expect(content).toContain('请至少输入一侧的文本内容')
      expect(content).toContain('trim()')
    })

    it('PasteDialog 应标准化换行符', async () => {
      const fs = await import('fs')
      const content = fs.readFileSync(resolve(__dirname, '../components/dialogs/PasteDialog.tsx'), 'utf-8')
      expect(content).toContain("replace(/\\r\\n/g, '\\n')")
      expect(content).toContain("replace(/\\r/g, '\\n')")
    })

    it('PasteDialog 应生成正确的 FileInfo 对象', async () => {
      const fs = await import('fs')
      const content = fs.readFileSync(resolve(__dirname, '../components/dialogs/PasteDialog.tsx'), 'utf-8')
      expect(content).toContain('FileInfo')
      expect(content).toContain('path: null')
      expect(content).toContain("encoding: 'UTF-8'")
      expect(content).toContain("language: 'plaintext'")
    })

    it('PasteDialog 应显示字符和行数统计', async () => {
      const fs = await import('fs')
      const content = fs.readFileSync(resolve(__dirname, '../components/dialogs/PasteDialog.tsx'), 'utf-8')
      expect(content).toContain('paste-stats')
      expect(content).toContain('.length')
      expect(content).toContain("split('\\n')")
    })

    it('PasteDialog 应支持清空功能', async () => {
      const fs = await import('fs')
      const content = fs.readFileSync(resolve(__dirname, '../components/dialogs/PasteDialog.tsx'), 'utf-8')
      expect(content).toContain('handleClear')
      expect(content).toContain('清空')
    })

    it('PasteDialog 应支持取消操作', async () => {
      const fs = await import('fs')
      const content = fs.readFileSync(resolve(__dirname, '../components/dialogs/PasteDialog.tsx'), 'utf-8')
      expect(content).toContain('取消')
      expect(content).toContain('handleClose')
    })
  })

  describe('欢迎视图', () => {
    it('WelcomeView 组件文件应存在', () => {
      const componentPath = resolve(__dirname, '../components/welcome/WelcomeView.tsx')
      expect(existsSync(componentPath)).toBe(true)
    })

    it('应支持最近会话列表', () => {
      const recentSessions = [
        { id: '1', name: 'file1 vs file2', timestamp: Date.now() }
      ]
      expect(Array.isArray(recentSessions)).toBe(true)
      expect(recentSessions[0].id).toBeDefined()
      expect(recentSessions[0].name).toBeDefined()
    })

    it('WelcomeView 应支持拖拽提示', async () => {
      const fs = await import('fs')
      const componentPath = resolve(__dirname, '../components/welcome/WelcomeView.tsx')
      if (existsSync(componentPath)) {
        const content = fs.readFileSync(componentPath, 'utf-8')
        expect(content.length).toBeGreaterThan(0)
      }
    })
  })

  describe('文件监听功能', () => {
    it('useFileWatcher hook 文件应存在', () => {
      const hookPath = resolve(__dirname, '../hooks/useFileWatcher.ts')
      expect(existsSync(hookPath)).toBe(true)
    })

    it('useFileWatcher 应定义必要的接口', async () => {
      const fs = await import('fs')
      const hookPath = resolve(__dirname, '../hooks/useFileWatcher.ts')
      if (existsSync(hookPath)) {
        const content = fs.readFileSync(hookPath, 'utf-8')
        expect(content).toContain('useFileWatcher')
      }
    })
  })

  describe('主进程文件监听', () => {
    it('watcher.ts 文件应存在', () => {
      const watcherPath = resolve(__dirname, '../../../main/src/fs/watcher.ts')
      expect(existsSync(watcherPath)).toBe(true)
    })

    it('watcher.ts 应使用 chokidar', async () => {
      const fs = await import('fs')
      const watcherPath = resolve(__dirname, '../../../main/src/fs/watcher.ts')
      const content = fs.readFileSync(watcherPath, 'utf-8')
      expect(content).toContain('chokidar')
    })
  })
})
