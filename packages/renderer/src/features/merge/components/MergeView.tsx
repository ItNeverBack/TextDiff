import { useState, useCallback } from 'react'
import { useMerge } from '../hooks/useMerge'
import { useMergeStore, type Resolution } from '../stores/merge.store'
import { MergeToolbar } from './MergeToolbar'
import { MergeEditor } from './MergeEditor'
import { ResultPreview } from './ResultPreview'
import { api } from '../../../lib/api'
import type { FileInfo, ThreeWayDiffResult } from '@shared/types'

export interface MergeViewProps {
  baseFile?: FileInfo
  leftFile?: FileInfo
  rightFile?: FileInfo
  mergeResult?: ThreeWayDiffResult
  onResolve?: (conflictId: string, resolution: Resolution) => void
  onSave?: (content: string) => void
}

export function MergeView(props: MergeViewProps) {
  const {
    baseFile: storeBaseFile,
    leftFile: storeLeftFile,
    rightFile: storeRightFile,
    mergeResult: storeMergeResult,
    isComputing,
    activeConflictIndex,
    resolvedCount,
    setBaseFile,
    setLeftFile,
    setRightFile,
    computeMerge,
    nextConflict,
    prevConflict,
    saveResult
  } = useMerge()

  const { resolveConflict, buildResult } = useMergeStore()

  // 外部 props 优先，否则回退到 store 状态
  const baseFile = props.baseFile ?? storeBaseFile
  const leftFile = props.leftFile ?? storeLeftFile
  const rightFile = props.rightFile ?? storeRightFile
  const mergeResult = props.mergeResult ?? storeMergeResult

  // 外部 onResolve/onSave 优先
  const handleResolve = useCallback((conflictId: string, resolution: Resolution) => {
    if (props.onResolve) {
      props.onResolve(conflictId, resolution)
    } else {
      resolveConflict(conflictId, resolution)
    }
  }, [props, resolveConflict])

  const handleSave = useCallback(async () => {
    if (props.onSave) {
      props.onSave(buildResult())
    } else {
      await saveResult()
    }
  }, [props, buildResult, saveResult])

  const [showPreview, setShowPreview] = useState(true)

  const hasFiles = !!(baseFile && leftFile && rightFile)
  const conflictTotal = mergeResult?.conflicts.length ?? 0

  const handleOpenBase = useCallback(async () => {
    const file = await api.openFile('left')
    if (file) setBaseFile(file)
  }, [setBaseFile])

  const handleOpenLeft = useCallback(async () => {
    const file = await api.openFile('left')
    if (file) setLeftFile(file)
  }, [setLeftFile])

  const handleOpenRight = useCallback(async () => {
    const file = await api.openFile('right')
    if (file) setRightFile(file)
  }, [setRightFile])

  const handleAutoMerge = useCallback(async () => {
    if (!hasFiles) return
    await computeMerge()
  }, [hasFiles, computeMerge])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* 文件选择栏 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-surface)',
        flexShrink: 0,
        flexWrap: 'wrap'
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginRight: 4 }}>
          三路合并
        </span>

        <FileSelector
          label="Base"
          file={baseFile}
          color="var(--text-secondary)"
          onOpen={handleOpenBase}
        />
        <FileSelector
          label="左侧（Local）"
          file={leftFile}
          color="var(--diff-added-text)"
          onOpen={handleOpenLeft}
        />
        <FileSelector
          label="右侧（Remote）"
          file={rightFile}
          color="var(--diff-deleted-text)"
          onOpen={handleOpenRight}
        />

        <button
          className="btn-primary"
          style={{ fontSize: 12, padding: '4px 12px', marginLeft: 8 }}
          onClick={computeMerge}
          disabled={!hasFiles || isComputing}
        >
          {isComputing ? '计算中...' : '开始合并'}
        </button>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showPreview}
              onChange={(e) => setShowPreview(e.target.checked)}
            />
            显示结果预览
          </label>
        </div>
      </div>

      {/* 合并工具栏 */}
      <MergeToolbar
        conflictTotal={conflictTotal}
        conflictResolved={resolvedCount}
        activeConflictIndex={activeConflictIndex}
        isComputing={isComputing}
        hasFiles={hasFiles}
        onPrevConflict={prevConflict}
        onNextConflict={nextConflict}
        onAutoMerge={handleAutoMerge}
        onSaveResult={handleSave}
      />

      {/* 主内容区 */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* 编辑器区域 */}
        <div style={{ flex: showPreview ? '0 0 60%' : '1', overflow: 'hidden', borderRight: showPreview ? '1px solid var(--border)' : 'none' }}>
          {!hasFiles ? (
            <EmptyState
              onOpenBase={handleOpenBase}
              onOpenLeft={handleOpenLeft}
              onOpenRight={handleOpenRight}
            />
          ) : (
            <MergeEditor
              baseFile={baseFile}
              leftFile={leftFile}
              rightFile={rightFile}
              mergeResult={mergeResult}
              onResolve={handleResolve}
            />
          )}
        </div>

        {/* 结果预览 */}
        {showPreview && (
          <div style={{ flex: '0 0 40%', overflow: 'hidden' }}>
            <ResultPreview visible={showPreview} />
          </div>
        )}
      </div>

      {/* 状态提示 */}
      {isComputing && (
        <div style={{
          position: 'absolute',
          bottom: 32,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          padding: '8px 16px',
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
        }}>
          <span className="spinner" />
          正在计算三路合并...
        </div>
      )}
    </div>
  )
}

function FileSelector({
  label,
  file,
  color,
  onOpen
}: {
  label: string
  file: { path: string | null } | null
  color: string
  onOpen: () => void
}) {
  const fileName = file?.path?.split(/[\\/]/).pop() ?? null
  return (
    <button
      className="toolbar-btn file-btn"
      onClick={onOpen}
      title={`选择${label}文件`}
      style={{ maxWidth: 180 }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
      </svg>
      <span style={{ color, fontWeight: 600, fontSize: 11, flexShrink: 0 }}>{label}</span>
      {fileName ? (
        <span style={{
          color: 'var(--text-primary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: 100
        }}>
          {fileName}
        </span>
      ) : (
        <span style={{ color: 'var(--text-muted)' }}>选择文件</span>
      )}
    </button>
  )
}

function EmptyState({
  onOpenBase,
  onOpenLeft,
  onOpenRight
}: {
  onOpenBase: () => void
  onOpenLeft: () => void
  onOpenRight: () => void
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      gap: 16,
      color: 'var(--text-muted)'
    }}>
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M8 6l4-4 4 4M12 2v10.3M8 18l4 4 4-4M12 22v-4"/>
        <path d="M4 12h4M16 12h4"/>
      </svg>
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>
        三路合并
      </div>
      <div style={{ fontSize: 13, textAlign: 'center', maxWidth: 320 }}>
        请选择三个文件：Base（公共祖先）、左侧（本地修改）、右侧（远程修改）
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button className="toolbar-btn" onClick={onOpenBase}>选择 Base 文件</button>
        <button className="toolbar-btn" onClick={onOpenLeft}>选择左侧文件</button>
        <button className="toolbar-btn" onClick={onOpenRight}>选择右侧文件</button>
      </div>
    </div>
  )
}
