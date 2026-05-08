import { useEffect, useRef, useCallback, useState } from 'react'
import type { FileInfo } from '@shared/types'
import { useDiffStore, useTabStore, useHistoryStore } from '@renderer/stores'
import { useSyncDiff, useUndoRedo } from '@renderer/hooks'
import { Minimap } from './Minimap'
import { FileInfoBar } from './FileInfoBar'
import { MonacoDiffEditor, type MonacoDiffEditorRef } from './MonacoDiffEditor'
import { api } from '@renderer/lib/api'
import { configureMonaco } from '../monaco-theme'
import './DiffView.css'

const EDIT_HISTORY_DEBOUNCE_MS = 800

/**
 * 双栏对比视图容器（Monaco Editor 版本）
 * 
 * §2.4.1 Monaco Editor 集成 - SplitDiffView 组件
 * 使用 Monaco DiffEditor 实现双栏对比
 */
export function SplitDiffView() {
  const {
    diffResult,
    activeChunkIndex,
    options,
    isCollapsed,
    leftFile,
    rightFile,
    setLeftFile,
    setRightFile,
    setDiffResult,
    setIsComputing,
    navigateToChunk,
    swapFiles
  } = useDiffStore()
  
  const { tabs, activeIndex, setActiveTabFiles, setActiveTabDiffResult, swapActiveTabFiles, updateActiveTabContent, markActiveTabAsSaved } = useTabStore()
  const { clear: clearHistory, addEntry } = useHistoryStore()
  const activeTab = tabs[activeIndex]
  
  const editorRef = useRef<MonacoDiffEditorRef>(null)
  
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const editBeforeStateRef = useRef<{ leftContent: string; rightContent: string } | null>(null)
  const editTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // §2.7.4 Minimap 滚动状态跟踪
  const [scrollState, setScrollState] = useState({
    scrollTop: 0,
    viewportHeight: 0,
    scrollHeight: 0
  })
  
  // 保存状态提示
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  
  // 同步状态提示
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle')

  // 拖拽状态
  const [dragOverSide, setDragOverSide] = useState<'left' | 'right' | null>(null)

  // 差异同步 hook - 同步单个 chunk
  const { syncChunk, isSyncing } = useSyncDiff({
    leftFile: activeTab?.leftFile ?? null,
    rightFile: activeTab?.rightFile ?? null,
    diffResult,
    activeChunkIndex,
    onSyncComplete: (result) => {
      setSyncStatus('synced')
      
      // 直接更新 diff 结果，避免重新计算
      setDiffResult(result.updatedDiffResult)
      setActiveTabDiffResult(result.updatedDiffResult)
      
      // 重置 chunk 选中状态（没有高亮）
      navigateToChunk(-1)
      
      setTimeout(() => {
        setSyncStatus('idle')
      }, 1500)
    },
    onSyncError: () => {
      setSyncStatus('error')
      setTimeout(() => setSyncStatus('idle'), 3000)
    }
  })

  // 撤销/重做 hook
  const { undo, redo, canUndo, canRedo } = useUndoRedo({
    onStateRestored: () => {
      // 状态恢复后重新计算 diff
      computeDiff()
    }
  })

  // 初始化 Monaco
  useEffect(() => {
    configureMonaco()
  }, [])

  useEffect(() => {
    return () => {
      if (editTimerRef.current) {
        clearTimeout(editTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (activeTab?.leftFile?.path && activeTab?.rightFile?.path) {
      clearHistory()
      editBeforeStateRef.current = null
      if (editTimerRef.current) {
        clearTimeout(editTimerRef.current)
        editTimerRef.current = null
      }
    }
  }, [activeTab?.leftFile?.path, activeTab?.rightFile?.path, clearHistory])

  // 计算差异
  const computeDiff = useCallback(() => {
    // 至少需要一侧有文件才能展示
    if (!activeTab?.leftFile && !activeTab?.rightFile) return

    // 只有两侧都有文件时才计算 diff
    if (!activeTab?.leftFile || !activeTab?.rightFile) {
      setDiffResult(null)
      setActiveTabDiffResult(null)
      return
    }

    setIsComputing(true)
    api.computeDiff(activeTab.leftFile, activeTab.rightFile, options)
      .then((result) => {
        setDiffResult(result)
        setActiveTabDiffResult(result)
      })
      .catch((error) => {
        console.error('Failed to compute diff:', error)
      })
      .finally(() => {
        setIsComputing(false)
      })
  }, [activeTab?.leftFile, activeTab?.rightFile, options, setDiffResult, setIsComputing, setActiveTabDiffResult])

  // 初始计算和依赖变化时重新计算
  useEffect(() => {
    computeDiff()
  }, [computeDiff])

  // 监听 activeChunkIndex 变化，自动滚动
  useEffect(() => {
    if (activeChunkIndex >= 0) {
      editorRef.current?.scrollToChunk(activeChunkIndex)
    }
  }, [activeChunkIndex])

  // §2.7.4 Minimap 滚动位置监听
  useEffect(() => {
    const updateScrollPosition = () => {
      const position = editorRef.current?.getScrollPosition()
      if (position) {
        setScrollState({
          scrollTop: position.scrollTop,
          viewportHeight: position.viewportHeight,
          scrollHeight: position.scrollHeight
        })
      }
    }

    // 初始更新
    updateScrollPosition()

    // 设置定时器定期更新滚动位置（Monaco 没有统一的 scroll 事件）
    const intervalId = setInterval(updateScrollPosition, 100)

    return () => clearInterval(intervalId)
  }, [diffResult])

  // §2.7.4 Minimap 点击跳转处理
  const handleMinimapScrollTo = useCallback((ratio: number) => {
    editorRef.current?.scrollToPosition(ratio)
  }, [])

  // 处理文件交换
  const handleSwap = useCallback(() => {
    swapFiles()
    swapActiveTabFiles()
  }, [swapFiles, swapActiveTabFiles])

  // 编辑器区域拖拽处理 - 在容器级别统一处理
  const handleContainerDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer?.types.includes('Files')) {
      // 根据鼠标位置判断是左侧还是右侧
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const x = e.clientX - rect.left
      const side = x < rect.width / 2 ? 'left' : 'right'
      setDragOverSide(side)
    }
  }, [])

  const handleContainerDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy'
    }
    // 根据鼠标位置更新拖拽侧
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = e.clientX - rect.left
    const side = x < rect.width / 2 ? 'left' : 'right'
    setDragOverSide(side)
  }, [])

  const handleContainerDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const container = e.currentTarget as HTMLElement
    const relatedTarget = e.relatedTarget as HTMLElement
    
    // 检查是否还在编辑器容器内
    if (!container.contains(relatedTarget)) {
      setDragOverSide(null)
    }
  }, [])

  const handleContainerDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    
    // 根据鼠标位置判断是左侧还是右侧
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = e.clientX - rect.left
    const side = x < rect.width / 2 ? 'left' : 'right'
    setDragOverSide(null)

    if (!e.dataTransfer) return

    const filePaths: string[] = []
    
    if (e.dataTransfer.items) {
      for (let i = 0; i < e.dataTransfer.items.length; i++) {
        const item = e.dataTransfer.items[i]
        if (item.kind === 'file') {
          const file = item.getAsFile()
          if (file) {
            const electronFile = file as File & { path?: string }
            if (electronFile.path) {
              filePaths.push(electronFile.path)
            }
          }
        }
      }
    }

    if (filePaths.length === 0 && e.dataTransfer.files) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i] as File & { path?: string }
        if (file.path) {
          filePaths.push(file.path)
        }
      }
    }

    if (filePaths.length === 0) return

    try {
      const fileInfo: FileInfo = await api.readFile(filePaths[0])
      
      if (side === 'left') {
        setLeftFile(fileInfo)
        setActiveTabFiles(fileInfo, rightFile)
        
        // 如果两侧都有文件，计算 diff
        if (rightFile) {
          setIsComputing(true)
          try {
            const result = await api.computeDiff(fileInfo, rightFile, options)
            setDiffResult(result)
            setActiveTabDiffResult(result)
          } catch (error) {
            console.error('Failed to compute diff:', error)
          } finally {
            setIsComputing(false)
          }
        }
      } else {
        setRightFile(fileInfo)
        setActiveTabFiles(leftFile, fileInfo)
        
        // 如果两侧都有文件，计算 diff
        if (leftFile) {
          setIsComputing(true)
          try {
            const result = await api.computeDiff(leftFile, fileInfo, options)
            setDiffResult(result)
            setActiveTabDiffResult(result)
          } catch (error) {
            console.error('Failed to compute diff:', error)
          } finally {
            setIsComputing(false)
          }
        }
      }
    } catch (error) {
      console.error('Failed to read file:', error)
    }
  }, [setLeftFile, setRightFile, setActiveTabFiles, leftFile, rightFile, setDiffResult, setActiveTabDiffResult, options, setIsComputing])

  const handleContentChange = useCallback((side: 'left' | 'right', content: string) => {
    const currentTab = useTabStore.getState().tabs[useTabStore.getState().activeIndex]
    if (!currentTab?.leftFile || !currentTab?.rightFile) return

    if (editBeforeStateRef.current === null) {
      editBeforeStateRef.current = {
        leftContent: currentTab.leftFile.content,
        rightContent: currentTab.rightFile.content
      }
    }

    updateActiveTabContent(side, content)
    setHasUnsavedChanges(true)

    if (editTimerRef.current) {
      clearTimeout(editTimerRef.current)
    }

    editTimerRef.current = setTimeout(() => {
      const latestTab = useTabStore.getState().tabs[useTabStore.getState().activeIndex]
      if (!latestTab?.leftFile || !latestTab?.rightFile) return

      const before = editBeforeStateRef.current
      if (before) {
        const after = {
          leftContent: latestTab.leftFile.content,
          rightContent: latestTab.rightFile.content
        }
        if (before.leftContent !== after.leftContent || before.rightContent !== after.rightContent) {
          addEntry('edit', side === 'left' ? '编辑左侧内容' : '编辑右侧内容', before, after)
        }
      }
      editBeforeStateRef.current = null
      editTimerRef.current = null
    }, EDIT_HISTORY_DEBOUNCE_MS)
  }, [updateActiveTabContent, addEntry])

  // 保存文件
  const handleSave = useCallback(async (side?: 'left' | 'right') => {
    if (!activeTab?.leftFile || !activeTab?.rightFile) return

    setSaveStatus('saving')

    try {
      // 保存左侧文件（如果指定了 side 为 left 或全部保存）
      if (!side || side === 'left') {
        if (activeTab.leftFile.path) {
          await api.writeFile(activeTab.leftFile.path, activeTab.leftFile.content)
        }
      }

      // 保存右侧文件（如果指定了 side 为 right 或全部保存）
      if (!side || side === 'right') {
        if (activeTab.rightFile.path) {
          await api.writeFile(activeTab.rightFile.path, activeTab.rightFile.content)
        }
      }

      markActiveTabAsSaved()
      setHasUnsavedChanges(false)
      setSaveStatus('saved')
      
      // 保存成功后重新计算 diff
      computeDiff()
      
      // 2秒后重置保存状态
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (error) {
      console.error('Failed to save file:', error)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }, [activeTab, markActiveTabAsSaved, computeDiff])

  // 获取当前选中的 chunk 信息
  const getCurrentChunkInfo = useCallback(() => {
    if (!diffResult || diffResult.chunks.length === 0) return null
    const index = activeChunkIndex >= 0 && activeChunkIndex < diffResult.chunks.length 
      ? activeChunkIndex 
      : 0
    return {
      index,
      chunk: diffResult.chunks[index],
      total: diffResult.chunks.length
    }
  }, [diffResult, activeChunkIndex])

  // 处理同步到右侧
  const handleSyncToRight = useCallback(async () => {
    const chunkInfo = getCurrentChunkInfo()
    if (!chunkInfo) return
    
    setSyncStatus('syncing')
    await syncChunk('left-to-right', chunkInfo.chunk.id)
  }, [syncChunk, getCurrentChunkInfo])

  // 处理同步到左侧
  const handleSyncToLeft = useCallback(async () => {
    const chunkInfo = getCurrentChunkInfo()
    if (!chunkInfo) return
    
    setSyncStatus('syncing')
    await syncChunk('right-to-left', chunkInfo.chunk.id)
  }, [syncChunk, getCurrentChunkInfo])

  // 监听 Ctrl+S 保存快捷键
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 检查是否是 Ctrl+S 或 Cmd+S
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault()
        handleSave()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSave])

  const hasChanges = diffResult && diffResult.chunks.length > 0
  const currentChunkInfo = getCurrentChunkInfo()

  // 至少需要一侧有文件才能展示编辑器
  if (!activeTab?.leftFile && !activeTab?.rightFile) {
    return (
      <div className="diff-empty">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <path d="M14 2v6h6"/>
          <path d="M8 13h8M8 17h5"/>
        </svg>
        <p>请打开文件开始对比</p>
      </div>
    )
  }

  return (
    <div className="diff-view-container">
      <div className="diff-toolbar">
        <FileInfoBar
          leftFile={activeTab.leftFile}
          rightFile={activeTab.rightFile}
          onSwap={handleSwap}
        />
        
        {/* 差异同步和撤销/重做按钮 */}
        <div className="diff-actions">
          {/* 撤销/重做按钮 */}
          <div className="history-actions">
            <button
              className="action-btn"
              onClick={undo}
              disabled={!canUndo}
              title="撤销 (Ctrl+Z)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 7v6h6"/>
                <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
              </svg>
              撤销
            </button>
            <button
              className="action-btn"
              onClick={redo}
              disabled={!canRedo}
              title="重做 (Ctrl+Y)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 7v6h-6"/>
                <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/>
              </svg>
              重做
            </button>
          </div>

          <div className="divider" />

          {/* 当前 chunk 信息 */}
          {currentChunkInfo && (
            <span className="chunk-indicator">
              差异 {currentChunkInfo.index + 1}/{currentChunkInfo.total}
            </span>
          )}

          <div className="divider" />

          {/* 同步按钮 - 只同步当前选中的 chunk */}
          {hasChanges && currentChunkInfo && (
            <div className="sync-actions">
              <button
                className={`sync-btn sync-to-left ${syncStatus}`}
                onClick={handleSyncToLeft}
                disabled={isSyncing}
                title={`将当前差异(${currentChunkInfo.index + 1})从右侧同步到左侧`}
              >
                {isSyncing ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spinner">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                    </svg>
                    同步中...
                  </>
                ) : syncStatus === 'synced' ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                    已同步
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 12H5M12 19l-7-7 7-7"/>
                    </svg>
                    同步到左侧
                  </>
                )}
              </button>
              
              <button
                className={`sync-btn sync-to-right ${syncStatus}`}
                onClick={handleSyncToRight}
                disabled={isSyncing}
                title={`将当前差异(${currentChunkInfo.index + 1})从左侧同步到右侧`}
              >
                {isSyncing ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spinner">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                    </svg>
                    同步中...
                  </>
                ) : syncStatus === 'synced' ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                    已同步
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                    同步到右侧
                  </>
                )}
              </button>
            </div>
          )}

          <div className="divider" />
          
          {/* 保存按钮区域 */}
          {hasUnsavedChanges && (
            <span className="unsaved-indicator">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <circle cx="12" cy="12" r="3" fill="currentColor"/>
              </svg>
              有未保存的更改
            </span>
          )}
          
          <button
            className={`save-btn ${saveStatus}`}
            onClick={() => handleSave()}
            disabled={saveStatus === 'saving' || !hasUnsavedChanges}
            title="保存文件 (Ctrl+S)"
          >
            {saveStatus === 'saving' ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spinner">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
                保存中...
              </>
            ) : saveStatus === 'saved' ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                已保存
              </>
            ) : saveStatus === 'error' ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                保存失败
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                  <polyline points="17 21 17 13 7 13 7 21"/>
                  <polyline points="7 3 7 8 15 8"/>
                </svg>
                保存
              </>
            )}
          </button>
          
          {/* 单独保存左右文件的按钮 */}
          {hasUnsavedChanges && (
            <div className="save-dropdown">
              <button
                className="save-side-btn"
                onClick={() => handleSave('left')}
                disabled={saveStatus === 'saving'}
                title="仅保存左侧文件"
              >
                保存左侧
              </button>
              <button
                className="save-side-btn"
                onClick={() => handleSave('right')}
                disabled={saveStatus === 'saving'}
                title="仅保存右侧文件"
              >
                保存右侧
              </button>
            </div>
          )}
        </div>
      </div>

      <div
        className="diff-editor-container"
        style={{ position: 'relative' }}
        onDragEnter={handleContainerDragEnter}
        onDragOver={handleContainerDragOver}
        onDragLeave={handleContainerDragLeave}
        onDrop={handleContainerDrop}
      >
        <MonacoDiffEditor
          ref={editorRef}
          leftFile={activeTab.leftFile}
          rightFile={activeTab.rightFile}
          diffResult={diffResult}
          activeChunkIndex={activeChunkIndex}
          isCollapsed={isCollapsed}
          readOnly={false}
          onContentChange={handleContentChange}
        />

        {/* 左侧拖拽提示层 - 仅显示视觉反馈，不拦截事件 */}
        {dragOverSide === 'left' && (
          <div
            className="editor-drop-zone left active"
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: '50%',
              height: '100%',
              zIndex: 100,
              pointerEvents: 'none',
              backgroundColor: 'var(--accent-primary-light)',
              border: '2px dashed var(--accent-primary)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              padding: '24px',
              backgroundColor: 'var(--bg-surface)',
              borderRadius: '12px',
              boxShadow: 'var(--shadow-md)'
            }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <span style={{ color: 'var(--accent-primary)', fontWeight: 500, fontSize: '14px' }}>
                松开以在左侧打开
              </span>
            </div>
          </div>
        )}

        {/* 右侧拖拽提示层 - 仅显示视觉反馈，不拦截事件 */}
        {dragOverSide === 'right' && (
          <div
            className="editor-drop-zone right active"
            style={{
              position: 'absolute',
              right: 32,
              top: 0,
              width: 'calc(50% - 32px)',
              height: '100%',
              zIndex: 100,
              pointerEvents: 'none',
              backgroundColor: 'var(--accent-primary-light)',
              border: '2px dashed var(--accent-primary)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              padding: '24px',
              backgroundColor: 'var(--bg-surface)',
              borderRadius: '12px',
              boxShadow: 'var(--shadow-md)'
            }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <span style={{ color: 'var(--accent-primary)', fontWeight: 500, fontSize: '14px' }}>
                松开以在右侧打开
              </span>
            </div>
          </div>
        )}

        <Minimap
          lines={diffResult?.lines || []}
          scrollPosition={scrollState.scrollTop}
          viewportHeight={scrollState.viewportHeight}
          scrollHeight={scrollState.scrollHeight}
          onScrollTo={handleMinimapScrollTo}
        />
      </div>
    </div>
  )
}
