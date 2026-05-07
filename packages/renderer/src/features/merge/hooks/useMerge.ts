import { useCallback } from 'react'
import { useMergeStore } from '../stores/merge.store'
import { api } from '../../../lib/api'
import type { FileInfo } from '@shared/types'

export function useMerge() {
  const {
    baseFile,
    leftFile,
    rightFile,
    mergeResult,
    isComputing,
    activeConflictIndex,
    resolutions,
    setBaseFile,
    setLeftFile,
    setRightFile,
    computeMerge,
    nextConflict,
    prevConflict,
    buildResult,
    reset
  } = useMergeStore()

  const openBaseFile = useCallback(async () => {
    const file = await api.openFile('left')
    if (file) setBaseFile(file)
  }, [setBaseFile])

  const openLeftFile = useCallback(async () => {
    const file = await api.openFile('left')
    if (file) setLeftFile(file)
  }, [setLeftFile])

  const openRightFile = useCallback(async () => {
    const file = await api.openFile('right')
    if (file) setRightFile(file)
  }, [setRightFile])

  const loadFiles = useCallback(async (base: FileInfo, left: FileInfo, right: FileInfo) => {
    setBaseFile(base)
    setLeftFile(left)
    setRightFile(right)
    await computeMerge()
  }, [setBaseFile, setLeftFile, setRightFile, computeMerge])

  const saveResult = useCallback(async () => {
    const content = buildResult()
    const path = await api.showSaveDialog({
      title: '保存合并结果',
      filters: [{ name: '所有文件', extensions: ['*'] }]
    })
    if (path) {
      await api.writeFile(path, content)
    }
  }, [buildResult])

  const unresolvedCount = mergeResult
    ? mergeResult.conflicts.filter(c => !resolutions.has(c.id)).length
    : 0

  const resolvedCount = mergeResult
    ? mergeResult.conflicts.filter(c => resolutions.has(c.id)).length
    : 0

  return {
    baseFile,
    leftFile,
    rightFile,
    mergeResult,
    isComputing,
    activeConflictIndex,
    resolutions,
    unresolvedCount,
    resolvedCount,
    setBaseFile,
    setLeftFile,
    setRightFile,
    openBaseFile,
    openLeftFile,
    openRightFile,
    loadFiles,
    computeMerge,
    nextConflict,
    prevConflict,
    saveResult,
    reset
  }
}

