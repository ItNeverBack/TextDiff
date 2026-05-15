import { describe, it, expect, beforeEach } from 'vitest'
import { useTabStore } from '../../stores/tab.store'
import type { FileInfo } from '@shared/types'

describe('useTabStore', () => {
  beforeEach(() => {
    // 重置 store 到初始状态
    useTabStore.setState({
      tabs: [{
        id: 'tab-1',
        title: '新对比',
        leftFile: null,
        rightFile: null,
        diffResult: null,
        hasChanges: false,
        isDirty: false
      }],
      activeIndex: 0
    })
  })

  describe('初始状态', () => {
    it('初始有一个空白 tab', () => {
      const state = useTabStore.getState()
      expect(state.tabs).toHaveLength(1)
      expect(state.activeIndex).toBe(0)
      expect(state.tabs[0].title).toBe('新对比')
    })
  })

  describe('Tab 添加', () => {
    it('addTab 增加新 tab', () => {
      useTabStore.getState().addTab()
      
      const state = useTabStore.getState()
      expect(state.tabs).toHaveLength(2)
      expect(state.activeIndex).toBe(1)
    })

    it('addTabWithFiles 创建带文件的 tab', () => {
      const leftFile: FileInfo = {
        path: '/test/left.txt',
        name: 'left.txt',
        content: 'left content',
        encoding: 'utf-8',
        lineEnding: 'LF',
        size: 12
      }
      const rightFile: FileInfo = {
        path: '/test/right.txt',
        name: 'right.txt',
        content: 'right content',
        encoding: 'utf-8',
        lineEnding: 'LF',
        size: 13
      }
      
      useTabStore.getState().addTabWithFiles(leftFile, rightFile)
      
      const state = useTabStore.getState()
      expect(state.tabs).toHaveLength(2)
      expect(state.tabs[1].leftFile).toEqual(leftFile)
      expect(state.tabs[1].rightFile).toEqual(rightFile)
      expect(state.tabs[1].title).toBe('left.txt vs right.txt')
      expect(state.activeIndex).toBe(1)
    })

    it('addDirectoryTab 创建目录对比 tab', () => {
      useTabStore.getState().addDirectoryTab('/path/left', '/path/right')
      
      const state = useTabStore.getState()
      expect(state.tabs).toHaveLength(2)
      expect(state.tabs[1].isDirectoryView).toBe(true)
      expect(state.tabs[1].title).toBe('left vs right')
    })

    it('addMergeTab 创建合并 tab', () => {
      useTabStore.getState().addMergeTab()
      
      const state = useTabStore.getState()
      expect(state.tabs).toHaveLength(2)
      expect(state.tabs[1].isMergeView).toBe(true)
      expect(state.tabs[1].title).toBe('三路合并')
    })
  })

  describe('Tab 关闭', () => {
    it('closeTab 移除指定 tab', () => {
      useTabStore.getState().addTab()
      expect(useTabStore.getState().tabs).toHaveLength(2)
      
      useTabStore.getState().closeTab(1)
      expect(useTabStore.getState().tabs).toHaveLength(1)
    })

    it('closeTab 后自动选择相邻 tab', () => {
      useTabStore.getState().addTab()
      useTabStore.getState().addTab()
      expect(useTabStore.getState().activeIndex).toBe(2)
      
      useTabStore.getState().closeTab(2)
      expect(useTabStore.getState().activeIndex).toBe(1)
    })

    it('关闭第一个 tab 后选择新的第一个', () => {
      useTabStore.getState().addTab()
      useTabStore.getState().selectTab(0)
      
      useTabStore.getState().closeTab(0)
      expect(useTabStore.getState().activeIndex).toBe(0)
    })

    it('不能关闭最后一个 tab', () => {
      useTabStore.getState().closeTab(0)
      expect(useTabStore.getState().tabs).toHaveLength(1)
    })
  })

  describe('Tab 选择', () => {
    it('selectTab 切换 activeIndex', () => {
      useTabStore.getState().addTab()
      useTabStore.getState().addTab()
      
      useTabStore.getState().selectTab(0)
      expect(useTabStore.getState().activeIndex).toBe(0)
      
      useTabStore.getState().selectTab(1)
      expect(useTabStore.getState().activeIndex).toBe(1)
    })

    it('selectTab 无效索引不执行', () => {
      useTabStore.getState().selectTab(10)
      expect(useTabStore.getState().activeIndex).toBe(0)
      
      useTabStore.getState().selectTab(-1)
      expect(useTabStore.getState().activeIndex).toBe(0)
    })

    it('selectTab 相同索引不执行', () => {
      useTabStore.getState().addTab()
      const initialActiveIndex = useTabStore.getState().activeIndex
      
      useTabStore.getState().selectTab(initialActiveIndex)
      expect(useTabStore.getState().activeIndex).toBe(initialActiveIndex)
    })
  })

  describe('Tab 更新', () => {
    it('updateTab 更新指定 tab', () => {
      useTabStore.getState().updateTab(0, { title: 'Updated Title' })
      
      expect(useTabStore.getState().tabs[0].title).toBe('Updated Title')
    })

    it('updateTabTitle 更新标题', () => {
      useTabStore.getState().updateTabTitle(0, 'New Title')
      
      expect(useTabStore.getState().tabs[0].title).toBe('New Title')
    })
  })

  describe('活跃 Tab 文件操作', () => {
    it('setActiveTabFiles 更新文件', () => {
      const leftFile: FileInfo = {
        path: '/test/left.txt',
        name: 'left.txt',
        content: 'content',
        encoding: 'utf-8',
        lineEnding: 'LF',
        size: 7
      }
      const rightFile: FileInfo = {
        path: '/test/right.txt',
        name: 'right.txt',
        content: 'content',
        encoding: 'utf-8',
        lineEnding: 'LF',
        size: 7
      }
      
      useTabStore.getState().setActiveTabFiles(leftFile, rightFile)
      
      const activeTab = useTabStore.getState().tabs[useTabStore.getState().activeIndex]
      expect(activeTab.leftFile).toEqual(leftFile)
      expect(activeTab.rightFile).toEqual(rightFile)
      expect(activeTab.hasChanges).toBe(true)
    })

    it('setActiveTabFiles 只传左侧文件', () => {
      const leftFile: FileInfo = {
        path: '/test/left.txt',
        name: 'left.txt',
        content: 'content',
        encoding: 'utf-8',
        lineEnding: 'LF',
        size: 7
      }
      
      useTabStore.getState().setActiveTabFiles(leftFile, null)
      
      const activeTab = useTabStore.getState().tabs[useTabStore.getState().activeIndex]
      expect(activeTab.leftFile).toEqual(leftFile)
      expect(activeTab.rightFile).toBeNull()
      expect(activeTab.title).toBe('left.txt')
    })

    it('swapActiveTabFiles 交换文件', () => {
      const leftFile: FileInfo = {
        path: '/test/left.txt',
        name: 'left.txt',
        content: 'left',
        encoding: 'utf-8',
        lineEnding: 'LF',
        size: 4
      }
      const rightFile: FileInfo = {
        path: '/test/right.txt',
        name: 'right.txt',
        content: 'right',
        encoding: 'utf-8',
        lineEnding: 'LF',
        size: 5
      }
      
      useTabStore.getState().setActiveTabFiles(leftFile, rightFile)
      useTabStore.getState().swapActiveTabFiles()
      
      const activeTab = useTabStore.getState().tabs[useTabStore.getState().activeIndex]
      expect(activeTab.leftFile).toEqual(rightFile)
      expect(activeTab.rightFile).toEqual(leftFile)
      expect(activeTab.title).toBe('right.txt vs left.txt')
    })
  })

  describe('脏状态管理', () => {
    it('updateActiveTabContent 更新内容并标记为脏', () => {
      const file: FileInfo = {
        path: '/test/file.txt',
        name: 'file.txt',
        content: 'original',
        encoding: 'utf-8',
        lineEnding: 'LF',
        size: 8
      }
      
      useTabStore.getState().setActiveTabFiles(file, null)
      useTabStore.getState().markActiveTabAsSaved()
      
      useTabStore.getState().updateActiveTabContent('left', 'modified')
      
      const activeTab = useTabStore.getState().tabs[useTabStore.getState().activeIndex]
      expect(activeTab.isDirty).toBe(true)
      expect(activeTab.hasChanges).toBe(true)
    })

    it('内容未变化时不标记为脏', () => {
      const file: FileInfo = {
        path: '/test/file.txt',
        name: 'file.txt',
        content: 'same',
        encoding: 'utf-8',
        lineEnding: 'LF',
        size: 4
      }
      
      useTabStore.getState().setActiveTabFiles(file, null)
      useTabStore.getState().markActiveTabAsSaved()
      
      useTabStore.getState().updateActiveTabContent('left', 'same')
      
      const activeTab = useTabStore.getState().tabs[useTabStore.getState().activeIndex]
      expect(activeTab.isDirty).toBe(false)
    })

    it('markActiveTabAsSaved 清除脏标记', () => {
      const file: FileInfo = {
        path: '/test/file.txt',
        name: 'file.txt',
        content: 'content',
        encoding: 'utf-8',
        lineEnding: 'LF',
        size: 7
      }
      
      useTabStore.getState().setActiveTabFiles(file, null)
      useTabStore.getState().updateActiveTabContent('left', 'modified')
      useTabStore.getState().markActiveTabAsSaved()
      
      const activeTab = useTabStore.getState().tabs[useTabStore.getState().activeIndex]
      expect(activeTab.isDirty).toBe(false)
      expect(activeTab.hasChanges).toBe(false)
    })

    it('getDirtyTabs 返回有未保存更改的 tab', () => {
      const file: FileInfo = {
        path: '/test/file.txt',
        name: 'file.txt',
        content: 'content',
        encoding: 'utf-8',
        lineEnding: 'LF',
        size: 7
      }
      
      useTabStore.getState().addTab()
      useTabStore.getState().setActiveTabFiles(file, null)
      useTabStore.getState().updateActiveTabContent('left', 'modified')
      
      const dirtyTabs = useTabStore.getState().getDirtyTabs()
      expect(dirtyTabs).toHaveLength(1)
      expect(dirtyTabs[0].index).toBe(1)
    })
  })

  describe('目录对比 Tab', () => {
    it('setActiveTabDirectories 设置目录', () => {
      useTabStore.getState().setActiveTabDirectories(
        { path: '/left', name: 'left', totalFiles: 10, totalSize: 1000, lastModified: new Date() },
        { path: '/right', name: 'right', totalFiles: 10, totalSize: 1000, lastModified: new Date() }
      )
      
      const activeTab = useTabStore.getState().tabs[useTabStore.getState().activeIndex]
      expect(activeTab.isDirectoryView).toBe(true)
      expect(activeTab.title).toBe('left vs right')
    })

    it('updateActiveTabDirViewMode 更新视图模式', () => {
      useTabStore.getState().addDirectoryTab('/left', '/right')
      useTabStore.getState().updateActiveTabDirViewMode('diff-only')
      
      const activeTab = useTabStore.getState().tabs[useTabStore.getState().activeIndex]
      expect(activeTab.dirViewMode).toBe('diff-only')
    })

    it('updateActiveTabExpandedPaths 更新展开路径', () => {
      useTabStore.getState().addDirectoryTab('/left', '/right')
      useTabStore.getState().updateActiveTabExpandedPaths(['/left/src', '/left/dist'])
      
      const activeTab = useTabStore.getState().tabs[useTabStore.getState().activeIndex]
      expect(activeTab.expandedPaths).toEqual(['/left/src', '/left/dist'])
    })
  })
})
