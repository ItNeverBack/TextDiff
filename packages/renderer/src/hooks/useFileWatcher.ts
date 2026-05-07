import { useEffect, useRef, useCallback } from 'react'
import type { FileInfo } from '@shared/types'
import { api } from '../lib/api'
import { useDiffStore, useTabStore } from '../stores'

export function useFileWatcher() {
  const { leftFile, rightFile, options, setDiffResult, setIsComputing, setLeftFile, setRightFile } = useDiffStore()
  const { setActiveTabDiffResult, activeIndex, updateTab } = useTabStore()
  const unwatchLeft = useRef<(() => void) | null>(null)
  const unwatchRight = useRef<(() => void) | null>(null)

  const recomputeDiff = useCallback(async (newLeftFile: FileInfo | null, newRightFile: FileInfo | null) => {
    if (!newLeftFile || !newRightFile) return
    
    setIsComputing(true)
    try {
      const result = await api.computeDiff(newLeftFile, newRightFile, options)
      setDiffResult(result)
      setActiveTabDiffResult(result)
    } catch (error) {
      console.error('Failed to recompute diff:', error)
    } finally {
      setIsComputing(false)
    }
  }, [options, setDiffResult, setIsComputing, setActiveTabDiffResult])

  useEffect(() => {
    // 清理之前的监听器
    if (unwatchLeft.current) {
      unwatchLeft.current()
      unwatchLeft.current = null
    }
    if (unwatchRight.current) {
      unwatchRight.current()
      unwatchRight.current = null
    }

    // 设置新的监听器
    if (leftFile?.path) {
      unwatchLeft.current = api.watchFile(leftFile.path, async () => {
        if (leftFile.path) {
          try {
            const newLeftFile = await api.readFile(leftFile.path)
            setLeftFile(newLeftFile)
            updateTab(activeIndex, { leftFile: newLeftFile })

            const currentRight = useDiffStore.getState().rightFile
            if (currentRight) {
              await recomputeDiff(newLeftFile, currentRight)
            }
          } catch (error) {
            console.error('Failed to reload file:', error)
          }
        }
      })
    }

    if (rightFile?.path) {
      unwatchRight.current = api.watchFile(rightFile.path, async () => {
        if (rightFile.path) {
          try {
            const newRightFile = await api.readFile(rightFile.path)
            setRightFile(newRightFile)
            updateTab(activeIndex, { rightFile: newRightFile })

            const currentLeft = useDiffStore.getState().leftFile
            if (currentLeft) {
              await recomputeDiff(currentLeft, newRightFile)
            }
          } catch (error) {
            console.error('Failed to reload file:', error)
          }
        }
      })
    }

    // 清理函数
    return () => {
      if (unwatchLeft.current) {
        unwatchLeft.current()
      }
      if (unwatchRight.current) {
        unwatchRight.current()
      }
    }
  }, [leftFile?.path, rightFile?.path, setLeftFile, setRightFile, updateTab, activeIndex, recomputeDiff])
}
