import { useEffect, useRef, forwardRef, useImperativeHandle, useMemo, useState } from 'react'
import * as monaco from 'monaco-editor'
import type { FileInfo, DiffResult } from '@shared/types'
import { LARGE_FILE_THRESHOLD } from '@shared/constants'
import { configureMonacoWorkers } from '../monaco-worker'
import { useFolding } from '../hooks/useFolding'
import { useSearchStore, useSettingsStore } from '@renderer/stores'

interface MonacoDiffEditorProps {
  leftFile: FileInfo | null
  rightFile: FileInfo | null
  diffResult: DiffResult | null
  activeChunkIndex: number
  isCollapsed: boolean
  readOnly?: boolean
  onChunkNavigate?: (index: number) => void
  onContentChange?: (side: 'left' | 'right', content: string) => void
}

export interface MonacoDiffEditorRef {
  scrollToChunk: (chunkIndex: number) => void
  getModifiedEditor: () => monaco.editor.IStandaloneCodeEditor | null
  getOriginalEditor: () => monaco.editor.IStandaloneCodeEditor | null
  revealLineInCenter: (lineNumber: number) => void
  getScrollPosition: () => { scrollTop: number; scrollHeight: number; viewportHeight: number }
  scrollToPosition: (ratio: number) => void
  revealSearchMatch: (lineNumber: number, side: 'left' | 'right') => void
}

/**
 * Monaco Diff Editor 组件
 * 
 * §2.4.1 Monaco Editor 集成
 * 使用 Monaco Editor 的 DiffEditor API 实现双栏对比视图
 */
export const MonacoDiffEditor = forwardRef<MonacoDiffEditorRef, MonacoDiffEditorProps>(
  function MonacoDiffEditor({
    leftFile,
    rightFile,
    diffResult,
    activeChunkIndex,
    isCollapsed,
    readOnly = false,
    onChunkNavigate,
    onContentChange
  }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const editorRef = useRef<monaco.editor.IStandaloneDiffEditor | null>(null)
    const originalModelRef = useRef<monaco.editor.ITextModel | null>(null)
    const modifiedModelRef = useRef<monaco.editor.ITextModel | null>(null)
    // 所有差异行的高亮（始终显示）
    const allDiffDecorationsRef = useRef<string[]>([])
    // 当前活跃差异的标记（随导航变化）
    const activeChunkDecorationsRef = useRef<string[]>([])
    const searchDecorationsRef = useRef<{ original: string[]; modified: string[] }>({ original: [], modified: [] })
    // §修复搜索框问题：存储按键绑定disposables以便清理
    const searchKeybindingsRef = useRef<string[]>([])
    const [initError, setInitError] = useState<string | null>(null)

    // §编辑功能：跟踪当前文件路径和内容，避免编辑器内部编辑时重置光标
    const currentLeftPathRef = useRef<string | null>(null)
    const currentRightPathRef = useRef<string | null>(null)
    const isEditorUpdatingRef = useRef(false)

    // §Week 12: 搜索高亮状态
    const { highlightedLineIndex, highlightedRanges, matches, currentMatchIndex } = useSearchStore()

    // 字体设置
    const { settings } = useSettingsStore()
    const { fontSize, fontFamily } = settings.editor

    /**
     * §2.4.1 大文件检测
     * 检测文件大小是否超过 LARGE_FILE_THRESHOLD (5MB)
     */
    const isLargeFile = useMemo(() => {
      const leftSize = leftFile?.size || 0
      const rightSize = rightFile?.size || 0
      return leftSize > LARGE_FILE_THRESHOLD || rightSize > LARGE_FILE_THRESHOLD
    }, [leftFile, rightFile])

    // §2.4.4 使用折叠 hook
    const { updateFolding } = useFolding(editorRef, diffResult, isCollapsed, isLargeFile)

    // 初始化 Monaco Diff Editor
    useEffect(() => {
      if (!containerRef.current) return

      try {
        // §2.4.1 配置 Monaco Worker
        configureMonacoWorkers()

        // 处理 Monaco 内部的 Canceled 错误 - 这些是 diff 计算取消的正常行为
        const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
          const reason = event.reason
          if (reason instanceof Error && reason.message === 'Canceled') {
            // 忽略 Monaco 的 Canceled 错误
            event.preventDefault()
          }
        }
        window.addEventListener('unhandledrejection', handleUnhandledRejection)

        // §2.4.1 大文件虚拟滚动配置
        // 当文件大小超过 5MB 时，启用性能优化配置
        const isLarge = isLargeFile

        // 配置 diff 编辑器
        const diffEditor = monaco.editor.createDiffEditor(containerRef.current, {
        readOnly: false,  // 允许编辑
        renderSideBySide: true,
        enableSplitViewResizing: true,
        // 使用 advanced diff 算法，通常提供更好的行匹配结果
        diffAlgorithm: 'advanced',
        ignoreTrimWhitespace: false, // 不要忽略空白符差异
        renderWhitespace: isLarge ? 'none' : 'selection',  // 大文件不渲染空白符
        scrollBeyondLastLine: false,
        minimap: { enabled: false },  // 禁用 minimap 提高性能
        overviewRulerLanes: 0,
        overviewRulerBorder: false,
        lineNumbers: 'on',
        glyphMargin: !isLarge,  // 大文件禁用 glyph margin
        folding: true,  // §2.4.4 启用折叠（使用优化后的折叠逻辑，大文件也能正常工作）
        foldingStrategy: 'auto',
        showFoldingControls: 'always',
        renderLineHighlight: 'none',  // 禁用当前行高亮，避免视觉干扰
        matchBrackets: isLarge ? 'never' : 'always',  // 大文件禁用括号匹配
        automaticLayout: true,
        fontSize: fontSize,
        fontFamily: fontFamily,
        fontLigatures: !isLarge,  // 大文件禁用字体连字
        contextmenu: true,
        hover: { enabled: !isLarge },  // 大文件禁用 hover
        diffCodeLens: false,
        renderIndicators: false,  // 禁用 diff 边线指示器，避免视觉干扰
        renderMarginRevertIcon: false,  // 禁用 revert 图标提高性能
        renderGutterMenu: false,  // 禁用 gutter 菜单简化 UI
        originalEditable: true,  // 允许编辑左侧（原始）内容
        diffWordWrap: 'off',
        useInlineViewWhenSpaceIsLimited: false,  // 始终使用双栏视图
        hideUnchangedRegions: {
          enabled: false,  // 默认不隐藏未改变区域
          contextLineCount: 3
        },
        // §2.4.1 大文件虚拟滚动优化
        scrollbar: {
          vertical: 'auto',
          horizontal: 'auto',
          useShadows: !isLarge,
          verticalHasArrows: false,
          horizontalHasArrows: false,
          verticalScrollbarSize: 10,
          horizontalScrollbarSize: 10,
          alwaysConsumeMouseWheel: false  // 优化滚动性能
        },
        // 大文件额外优化
        ...(isLarge && {
          maxComputationTime: 500,  // 限制 diff 计算时间
          domReadOnly: false,  // 允许编辑（大文件也允许编辑）
          disableLayerHinting: true,  // 禁用层提示
          disableMonospaceOptimizations: false,
          fixedOverflowWidgets: true
        })
      })

      editorRef.current = diffEditor

      // §修复搜索框问题：拦截 Ctrl+F，触发应用搜索对话框
      const originalEditor = diffEditor.getOriginalEditor()
      const modifiedEditor = diffEditor.getModifiedEditor()

      const searchKeybinding = originalEditor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF,
        () => {
          // 触发自定义搜索事件
          window.dispatchEvent(new CustomEvent('textdiff:open-search'))
        }
      )

      const modifiedSearchKeybinding = modifiedEditor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF,
        () => {
          // 触发自定义搜索事件
          window.dispatchEvent(new CustomEvent('textdiff:open-search'))
        }
      )

      // 存储按键绑定以便清理
      if (searchKeybinding) {
        searchKeybindingsRef.current.push(searchKeybinding)
      }
      if (modifiedSearchKeybinding) {
        searchKeybindingsRef.current.push(modifiedSearchKeybinding)
      }

      // 监听 diff 计算完成
      diffEditor.onDidUpdateDiff(() => {
        const changes = diffEditor.getLineChanges()
        console.log('[MonacoDiff] Diff computed:', changes?.length, 'changes')
        if (changes) {
          changes.forEach((change, i) => {
            // Monaco diff 格式：当 end < start 时表示纯插入或纯删除
            const originalCount = Math.max(0, change.originalEndLineNumber - change.originalStartLineNumber + 1)
            const modifiedCount = Math.max(0, change.modifiedEndLineNumber - change.modifiedStartLineNumber + 1)
            const changeType = originalCount === 0 ? 'insert' : modifiedCount === 0 ? 'delete' : 'modify'
            console.log(`[MonacoDiff] Change ${i}:`, {
              original: `${change.originalStartLineNumber}-${change.originalEndLineNumber} (${originalCount} lines)`,
              modified: `${change.modifiedStartLineNumber}-${change.modifiedEndLineNumber} (${modifiedCount} lines)`,
              type: changeType
            })
          })
        }
        if (changes && onChunkNavigate) {
          // Monaco 的 diff 计算完成
        }
      })

        return () => {
          // 移除未处理 Promise 拒绝的监听器
          window.removeEventListener('unhandledrejection', handleUnhandledRejection)

          // §修复搜索框问题：清理按键绑定 (编辑器销毁时会自动清理commands)
          searchKeybindingsRef.current = []

          // 清理资源 - 先销毁编辑器（它会释放对模型的引用），再销毁模型
          if (editorRef.current) {
            editorRef.current.dispose()
            editorRef.current = null
          }
          if (originalModelRef.current && !originalModelRef.current.isDisposed()) {
            originalModelRef.current.dispose()
            originalModelRef.current = null
          }
          if (modifiedModelRef.current && !modifiedModelRef.current.isDisposed()) {
            modifiedModelRef.current.dispose()
            modifiedModelRef.current = null
          }
        }
      } catch (error) {
        console.error('Failed to initialize Monaco Editor:', error)
        setInitError(error instanceof Error ? error.message : '编辑器初始化失败')
      }
    }, [readOnly, onChunkNavigate, isLargeFile])

    // 更新编辑器内容
    useEffect(() => {
      const editor = editorRef.current
      // 至少需要一侧有文件才能展示
      if (!editor || (!leftFile && !rightFile)) return

      const language = leftFile?.language || rightFile?.language || 'plaintext'

      // §2.4.1 大文件处理：如果文件太大，可能需要分块加载
      // 这里我们使用 Monaco 的虚拟滚动来处理大文件
      // 标准化行尾符为 LF，确保与 computeDiff 的处理一致（computeDiff 默认 ignoreLineEndings: true）
      const leftContent = (leftFile?.content || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
      const rightContent = (rightFile?.content || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')

      // §编辑功能：判断是否是新文件（路径变化）
      const isNewLeftFile = currentLeftPathRef.current !== (leftFile?.path || null)
      const isNewRightFile = currentRightPathRef.current !== (rightFile?.path || null)
      
      // 更新路径引用
      currentLeftPathRef.current = leftFile?.path || null
      currentRightPathRef.current = rightFile?.path || null

      // 检查模型是否已被销毁，如果是则创建新模型
      if (originalModelRef.current && !originalModelRef.current.isDisposed()) {
        // §编辑功能：只有文件路径变化或内容确实不同时才更新值
        // 避免编辑器内部编辑时 setValue 重置光标位置
        const currentValue = originalModelRef.current.getValue()
        if (isNewLeftFile || currentValue !== leftContent) {
          // 标记为正在更新，避免触发 onContentChange
          isEditorUpdatingRef.current = true
          originalModelRef.current.setValue(leftContent)
          monaco.editor.setModelLanguage(originalModelRef.current, language)
          // 延迟重置标记，确保 onDidChangeModelContent 事件处理完毕
          setTimeout(() => { isEditorUpdatingRef.current = false }, 0)
        }
      } else {
        originalModelRef.current?.dispose()
        originalModelRef.current = monaco.editor.createModel(
          leftContent,
          language
        )
      }

      if (modifiedModelRef.current && !modifiedModelRef.current.isDisposed()) {
        // §编辑功能：只有文件路径变化或内容确实不同时才更新值
        const currentValue = modifiedModelRef.current.getValue()
        if (isNewRightFile || currentValue !== rightContent) {
          isEditorUpdatingRef.current = true
          modifiedModelRef.current.setValue(rightContent)
          monaco.editor.setModelLanguage(modifiedModelRef.current, language)
          setTimeout(() => { isEditorUpdatingRef.current = false }, 0)
        }
      } else {
        modifiedModelRef.current?.dispose()
        modifiedModelRef.current = monaco.editor.createModel(
          rightContent,
          language
        )
      }

      // 设置模型的 EOL 一致 - 内容已标准化为 LF，所以模型也使用 LF
      // 这确保 Monaco diff 算法在比较时使用一致的行尾符
      if (!originalModelRef.current.isDisposed()) {
        originalModelRef.current.setEOL(monaco.editor.EndOfLineSequence.LF)
      }
      if (!modifiedModelRef.current.isDisposed()) {
        modifiedModelRef.current.setEOL(monaco.editor.EndOfLineSequence.LF)
      }

      // 检查模型是否已经有值且相同，避免重复设置
      const currentModel = editor.getModel()
      const newOriginal = originalModelRef.current
      const newModified = modifiedModelRef.current

      if (currentModel?.original === newOriginal && currentModel?.modified === newModified) {
        // 模型相同，只需要更新折叠
        updateFolding()
        return
      }

      // 设置模型到编辑器 - 捕获 Monaco 内部 diff 计算取消的错误
      try {
        editor.setModel({
          original: newOriginal,
          modified: newModified
        })
      } catch (error) {
        // 忽略 Monaco 内部的 Canceled 错误，这是正常的 diff 计算取消行为
        if (error instanceof Error && error.message === 'Canceled') {
          // 继续执行，折叠更新可以正常进行
        } else {
          throw error
        }
      }

      // 配置折叠（使用优化后的折叠逻辑，大文件也能正常工作）
      updateFolding()
    }, [leftFile, rightFile, isLargeFile, updateFolding])

    // 监听编辑器内容变化
    useEffect(() => {
      const editor = editorRef.current
      if (!editor || !onContentChange) return

      const originalEditor = editor.getOriginalEditor()
      const modifiedEditor = editor.getModifiedEditor()

      // 监听左侧（原始）编辑器内容变化
      const originalDisposable = originalEditor.onDidChangeModelContent(() => {
        // §编辑功能：如果是 setValue 触发的变化，不通知父组件
        if (isEditorUpdatingRef.current) return
        const newValue = originalEditor.getValue()
        onContentChange('left', newValue)
      })

      // 监听右侧（修改后）编辑器内容变化
      const modifiedDisposable = modifiedEditor.onDidChangeModelContent(() => {
        // §编辑功能：如果是 setValue 触发的变化，不通知父组件
        if (isEditorUpdatingRef.current) return
        const newValue = modifiedEditor.getValue()
        onContentChange('right', newValue)
      })

      return () => {
        originalDisposable.dispose()
        modifiedDisposable.dispose()
      }
    }, [onContentChange])

    // §2.4.4 监听折叠状态变化（使用优化后的折叠逻辑）
    useEffect(() => {
      updateFolding()
    }, [updateFolding])

    // 监听字体设置变化并更新编辑器
    useEffect(() => {
      const editor = editorRef.current
      if (!editor) return

      // 使用 requestAnimationFrame 确保编辑器已经渲染完成
      const timeoutId = setTimeout(() => {
        try {
          const originalEditor = editor.getOriginalEditor()
          const modifiedEditor = editor.getModifiedEditor()

          // 更新字体设置
          if (originalEditor && !originalEditor.isDisposed?.()) {
            originalEditor.updateOptions({ fontSize, fontFamily })
          }
          if (modifiedEditor && !modifiedEditor.isDisposed?.()) {
            modifiedEditor.updateOptions({ fontSize, fontFamily })
          }
        } catch (error) {
          console.warn('Failed to update editor font settings:', error)
        }
      }, 0)

      return () => clearTimeout(timeoutId)
    }, [fontSize, fontFamily])

    // §2.4.3 为所有差异行添加高亮（始终显示，不随导航改变）
    useEffect(() => {
      const editor = editorRef.current
      if (!editor || !diffResult) return

      const originalEditor = editor.getOriginalEditor()
      const modifiedEditor = editor.getModifiedEditor()

      // 清除旧的高亮
      if (allDiffDecorationsRef.current.length > 0) {
        originalEditor.deltaDecorations(allDiffDecorationsRef.current, [])
        modifiedEditor.deltaDecorations(allDiffDecorationsRef.current, [])
        allDiffDecorationsRef.current = []
      }

      const originalModel = originalModelRef.current
      const modifiedModel = modifiedModelRef.current

      if (!originalModel || originalModel.isDisposed() || !modifiedModel || modifiedModel.isDisposed()) {
        return
      }

      // 定义不同类型的高亮样式（背景色）
      const getHighlightOptions = (type: string): monaco.editor.IModelDecorationOptions => {
        switch (type) {
          case 'insert':
            return {
              isWholeLine: true,
              className: 'diff-highlight-insert'
            }
          case 'delete':
            return {
              isWholeLine: true,
              className: 'diff-highlight-delete'
            }
          case 'replace':
            return {
              isWholeLine: true,
              className: 'diff-highlight-replace'
            }
          default:
            return { isWholeLine: true }
        }
      }

      const leftDecorations: string[] = []
      const rightDecorations: string[] = []

      // 为所有差异行添加高亮
      for (const chunk of diffResult.chunks) {
        for (const changeIndex of chunk.changeIndices) {
          const line = diffResult.lines[changeIndex]
          if (!line || line.type === 'equal') continue

          const highlightOptions = getHighlightOptions(line.type)

          // 左侧编辑器高亮
          if (line.leftLineNo !== null) {
            const leftLineNum = line.leftLineNo
            if (leftLineNum > 0 && leftLineNum <= originalModel.getLineCount()) {
              const decoration = originalEditor.deltaDecorations([], [{
                range: {
                  startLineNumber: leftLineNum,
                  startColumn: 1,
                  endLineNumber: leftLineNum,
                  endColumn: originalModel.getLineMaxColumn(leftLineNum) || 1
                },
                options: highlightOptions
              }])
              leftDecorations.push(...decoration)
            }
          }

          // 右侧编辑器高亮
          if (line.rightLineNo !== null) {
            const rightLineNum = line.rightLineNo
            if (rightLineNum > 0 && rightLineNum <= modifiedModel.getLineCount()) {
              const decoration = modifiedEditor.deltaDecorations([], [{
                range: {
                  startLineNumber: rightLineNum,
                  startColumn: 1,
                  endLineNumber: rightLineNum,
                  endColumn: modifiedModel.getLineMaxColumn(rightLineNum) || 1
                },
                options: highlightOptions
              }])
              rightDecorations.push(...decoration)
            }
          }
        }
      }

      allDiffDecorationsRef.current = [...leftDecorations, ...rightDecorations]
    }, [diffResult])

    // §2.4.3 标记当前活跃的差异（只在行号区域显示标记，随导航变化）
    useEffect(() => {
      const editor = editorRef.current
      if (!editor || !diffResult) return

      const originalEditor = editor.getOriginalEditor()
      const modifiedEditor = editor.getModifiedEditor()

      // 清除旧的活跃标记
      if (activeChunkDecorationsRef.current.length > 0) {
        originalEditor.deltaDecorations(activeChunkDecorationsRef.current, [])
        modifiedEditor.deltaDecorations(activeChunkDecorationsRef.current, [])
        activeChunkDecorationsRef.current = []
      }

      // 如果没有活跃 chunk，只清除标记
      if (activeChunkIndex < 0) return

      const chunk = diffResult.chunks[activeChunkIndex]
      if (!chunk) return

      const originalModel = originalModelRef.current
      const modifiedModel = modifiedModelRef.current

      if (!originalModel || originalModel.isDisposed() || !modifiedModel || modifiedModel.isDisposed()) {
        return
      }

      // 定义不同类型的行号标记样式
      const getActiveMarkerOptions = (type: string): monaco.editor.IModelDecorationOptions => {
        switch (type) {
          case 'insert':
            return {
              overviewRuler: { color: 'var(--diff-added-line)', position: monaco.editor.OverviewRulerLane.Center },
              linesDecorationsClassName: 'diff-active-marker-insert'
            }
          case 'delete':
            return {
              overviewRuler: { color: 'var(--diff-deleted-line)', position: monaco.editor.OverviewRulerLane.Center },
              linesDecorationsClassName: 'diff-active-marker-delete'
            }
          case 'replace':
            return {
              overviewRuler: { color: 'var(--diff-modified-line)', position: monaco.editor.OverviewRulerLane.Center },
              linesDecorationsClassName: 'diff-active-marker-replace'
            }
          default:
            return {
              overviewRuler: { color: 'var(--text-muted)', position: monaco.editor.OverviewRulerLane.Center }
            }
        }
      }

      const leftDecorations: string[] = []
      const rightDecorations: string[] = []

      // 只为当前 chunk 的行添加行号标记
      for (const changeIndex of chunk.changeIndices) {
        const line = diffResult.lines[changeIndex]
        if (!line || line.type === 'equal') continue

        const markerOptions = getActiveMarkerOptions(line.type)

        // 左侧编辑器标记
        if (line.leftLineNo !== null) {
          const leftLineNum = line.leftLineNo
          if (leftLineNum > 0 && leftLineNum <= originalModel.getLineCount()) {
            const decoration = originalEditor.deltaDecorations([], [{
              range: {
                startLineNumber: leftLineNum,
                startColumn: 1,
                endLineNumber: leftLineNum,
                endColumn: 1
              },
              options: markerOptions
            }])
            leftDecorations.push(...decoration)
          }
        }

        // 右侧编辑器标记
        if (line.rightLineNo !== null) {
          const rightLineNum = line.rightLineNo
          if (rightLineNum > 0 && rightLineNum <= modifiedModel.getLineCount()) {
            const decoration = modifiedEditor.deltaDecorations([], [{
              range: {
                startLineNumber: rightLineNum,
                startColumn: 1,
                endLineNumber: rightLineNum,
                endColumn: 1
              },
              options: markerOptions
            }])
            rightDecorations.push(...decoration)
          }
        }
      }

      activeChunkDecorationsRef.current = [...leftDecorations, ...rightDecorations]
    }, [activeChunkIndex, diffResult])

    // §Week 12: 搜索高亮 - 在 Monaco Editor 中高亮搜索结果
    useEffect(() => {
      const editor = editorRef.current
      if (!editor || !diffResult) return

      const originalEditor = editor.getOriginalEditor()
      const modifiedEditor = editor.getModifiedEditor()

      // 清除旧的搜索高亮
      if (searchDecorationsRef.current.original.length > 0) {
        originalEditor.deltaDecorations(searchDecorationsRef.current.original, [])
        searchDecorationsRef.current.original = []
      }
      if (searchDecorationsRef.current.modified.length > 0) {
        modifiedEditor.deltaDecorations(searchDecorationsRef.current.modified, [])
        searchDecorationsRef.current.modified = []
      }

      // 如果没有高亮行，直接返回
      if (highlightedLineIndex === null || highlightedLineIndex < 0) return

      const line = diffResult.lines[highlightedLineIndex]
      if (!line) return

      // 获取当前匹配的详细信息
      const currentMatch = currentMatchIndex >= 0 ? matches[currentMatchIndex] : null

      // 定义搜索匹配装饰器样式
      const matchDecorationOptions: monaco.editor.IModelDecorationOptions = {
        inlineClassName: 'search-highlight-match',
        overviewRuler: {
          color: 'var(--accent-primary)',
          position: monaco.editor.OverviewRulerLane.Center
        }
      }

      // 定义当前匹配装饰器样式（更突出）
      const currentMatchDecorationOptions: monaco.editor.IModelDecorationOptions = {
        inlineClassName: 'search-highlight-current',
        isWholeLine: true,
        overviewRuler: {
          color: 'var(--accent-primary-hover)',
          position: monaco.editor.OverviewRulerLane.Full
        }
      }

      const originalDecorations: monaco.editor.IModelDeltaDecoration[] = []
      const modifiedDecorations: monaco.editor.IModelDeltaDecoration[] = []

      // 高亮左侧编辑器中的匹配
      if (line.leftContent && line.leftLineNo !== null) {
        // 如果有具体的匹配范围，使用行内高亮
        if (currentMatch && currentMatch.side !== 'right' && highlightedRanges.length > 0) {
          for (const range of highlightedRanges) {
            const startColumn = range.start + 1 // Monaco 列号从 1 开始
            const endColumn = range.end + 1
            const maxColumn = Math.max(1, line.leftContent.length + 1)

            originalDecorations.push({
              range: {
                startLineNumber: line.leftLineNo,
                startColumn: Math.min(startColumn, maxColumn),
                endLineNumber: line.leftLineNo,
                endColumn: Math.min(endColumn, maxColumn)
              },
              options: matchDecorationOptions
            })
          }
        }

        // 如果是当前活动匹配，添加整行高亮
        if (currentMatch && currentMatch.side !== 'right') {
          originalDecorations.push({
            range: {
              startLineNumber: line.leftLineNo,
              startColumn: 1,
              endLineNumber: line.leftLineNo,
              endColumn: line.leftContent.length + 1
            },
            options: currentMatchDecorationOptions
          })
        }
      }

      // 高亮右侧编辑器中的匹配
      if (line.rightContent && line.rightLineNo !== null) {
        // 如果有具体的匹配范围，使用行内高亮
        if (currentMatch && currentMatch.side !== 'left' && highlightedRanges.length > 0) {
          for (const range of highlightedRanges) {
            const startColumn = range.start + 1
            const endColumn = range.end + 1
            const maxColumn = Math.max(1, line.rightContent.length + 1)

            modifiedDecorations.push({
              range: {
                startLineNumber: line.rightLineNo,
                startColumn: Math.min(startColumn, maxColumn),
                endLineNumber: line.rightLineNo,
                endColumn: Math.min(endColumn, maxColumn)
              },
              options: matchDecorationOptions
            })
          }
        }

        // 如果是当前活动匹配，添加整行高亮
        if (currentMatch && currentMatch.side !== 'left') {
          modifiedDecorations.push({
            range: {
              startLineNumber: line.rightLineNo,
              startColumn: 1,
              endLineNumber: line.rightLineNo,
              endColumn: line.rightContent.length + 1
            },
            options: currentMatchDecorationOptions
          })
        }
      }

      // 应用装饰器
      if (originalDecorations.length > 0) {
        searchDecorationsRef.current.original = originalEditor.deltaDecorations([], originalDecorations)
      }
      if (modifiedDecorations.length > 0) {
        searchDecorationsRef.current.modified = modifiedEditor.deltaDecorations([], modifiedDecorations)
      }

      // 滚动到高亮行
      if (currentMatch) {
        const targetLineNo = currentMatch.side === 'right'
          ? currentMatch.rightLineNo
          : currentMatch.leftLineNo

        if (targetLineNo !== null) {
          const targetEditor = currentMatch.side === 'right' ? modifiedEditor : originalEditor
          targetEditor.revealLineInCenter(targetLineNo)
        }
      }
    }, [highlightedLineIndex, highlightedRanges, matches, currentMatchIndex, diffResult])

    // 暴露方法给父组件
    useImperativeHandle(ref, () => ({
      scrollToChunk: (chunkIndex: number) => {
        const editor = editorRef.current
        if (!editor || !diffResult) return

        const chunk = diffResult.chunks[chunkIndex]
        if (!chunk) return

        // 根据 chunk 类型选择合适的编辑器进行滚动
        // 纯插入类型使用右侧编辑器（modified），其他使用左侧编辑器（original）
        const isInsertOnly = chunk.type === 'insert'
        const targetEditor = isInsertOnly
          ? editor.getModifiedEditor()
          : editor.getOriginalEditor()
        const lineNumber = isInsertOnly
          ? chunk.rightLineRange[0]
          : chunk.leftLineRange[0]

        // 确保行号有效（至少为 1）
        const validLineNumber = Math.max(1, lineNumber)

        targetEditor.revealLineInCenter(validLineNumber)
        targetEditor.setPosition({ lineNumber: validLineNumber, column: 1 })
      },
      getModifiedEditor: () => {
        return editorRef.current?.getModifiedEditor() || null
      },
      getOriginalEditor: () => {
        return editorRef.current?.getOriginalEditor() || null
      },
      revealLineInCenter: (lineNumber: number) => {
        const editor = editorRef.current
        if (!editor) return
        editor.getOriginalEditor().revealLineInCenter(lineNumber)
      },
      getScrollPosition: () => {
        const editor = editorRef.current
        if (!editor) {
          return { scrollTop: 0, scrollHeight: 0, viewportHeight: 0 }
        }
        const originalEditor = editor.getOriginalEditor()
        const layoutInfo = originalEditor.getLayoutInfo()
        const scrollTop = originalEditor.getScrollTop()
        const contentHeight = originalEditor.getContentHeight()
        return {
          scrollTop,
          scrollHeight: contentHeight,
          viewportHeight: layoutInfo.height
        }
      },
      scrollToPosition: (ratio: number) => {
        const editor = editorRef.current
        if (!editor) return
        const originalEditor = editor.getOriginalEditor()
        const contentHeight = originalEditor.getContentHeight()
        const viewportHeight = originalEditor.getLayoutInfo().height
        const scrollTop = ratio * (contentHeight - viewportHeight)
        originalEditor.setScrollTop(Math.max(0, scrollTop))
      },
      // §Week 12: 滚动到搜索匹配位置
      revealSearchMatch: (lineNumber: number, side: 'left' | 'right') => {
        const editor = editorRef.current
        if (!editor) return
        const targetEditor = side === 'right'
          ? editor.getModifiedEditor()
          : editor.getOriginalEditor()
        targetEditor.revealLineInCenter(lineNumber)
        targetEditor.setPosition({ lineNumber, column: 1 })
      }
    }), [diffResult])

    // 显示初始化错误
    if (initError) {
      return (
        <div className="monaco-diff-editor-container" style={{
          flex: 1,
          minWidth: 0,
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-surface)',
          color: 'var(--diff-deleted-text)',
          padding: '20px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '12px', opacity: 0.5 }}>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <p>编辑器初始化失败</p>
            <pre style={{ fontSize: '11px', marginTop: '8px', opacity: 0.7, maxWidth: '400px', overflow: 'auto' }}>{initError}</pre>
          </div>
        </div>
      )
    }

    return (
      <div
        ref={containerRef}
        className={`monaco-diff-editor-container ${isLargeFile ? 'large-file-mode' : ''}`}
        style={{
          flex: 1,
          minWidth: 0,
          height: '100%',
          position: 'relative'
        }}
      >
        {/* §2.4.1 大文件警告提示 */}
        {isLargeFile && (
          <div className="large-file-warning">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            大文件模式 - 已启用性能优化
          </div>
        )}
      </div>
    )
  }
)
