import { useCallback, useState, useEffect } from 'react'
import type { FileInfo, DiffOptions, DiffResult } from '@shared/types'
import { api } from '@renderer/lib/api'

interface UseDiffOptions {
  leftFile: FileInfo | null
  rightFile: FileInfo | null
  options: DiffOptions
  onResult?: (result: DiffResult) => void
  onError?: (error: Error) => void
}

interface UseDiffReturn {
  result: DiffResult | null
  isComputing: boolean
  computeTime: number
  error: Error | null
  recompute: () => Promise<void>
}

export function useDiff({
  leftFile,
  rightFile,
  options,
  onResult,
  onError
}: UseDiffOptions): UseDiffReturn {
  const [result, setResult] = useState<DiffResult | null>(null)
  const [isComputing, setIsComputing] = useState(false)
  const [computeTime, setComputeTime] = useState(0)
  const [error, setError] = useState<Error | null>(null)

  const compute = useCallback(async () => {
    // 只有两侧都有文件时才计算 diff
    if (!leftFile || !rightFile) {
      setResult(null)
      return
    }

    setIsComputing(true)
    setError(null)
    const startTime = performance.now()

    try {
      const diffResult = await api.computeDiff(leftFile, rightFile, options)
      const elapsed = Math.round(performance.now() - startTime)

      setResult(diffResult)
      setComputeTime(elapsed)
      onResult?.(diffResult)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      onError?.(error)
    } finally {
      setIsComputing(false)
    }
  }, [leftFile, rightFile, options, onResult, onError])

  useEffect(() => {
    compute()
  }, [compute])

  return {
    result,
    isComputing,
    computeTime,
    error,
    recompute: compute
  }
}

/**
 * 用于比较文本字符串的 hook
 */
interface UseTextDiffOptions {
  leftText: string
  rightText: string
  options?: Partial<DiffOptions>
}

export function useTextDiff({
  leftText,
  rightText,
  options = {}
}: UseTextDiffOptions): UseDiffReturn {
  const [result, setResult] = useState<DiffResult | null>(null)
  const [isComputing, setIsComputing] = useState(false)
  const [computeTime, setComputeTime] = useState(0)
  const [error, setError] = useState<Error | null>(null)

  const recompute = useCallback(async () => {
    if (!leftText || !rightText) {
      setResult(null)
      return
    }

    setIsComputing(true)
    setError(null)
    const startTime = performance.now()

    try {
      // 创建临时 FileInfo 对象
      const leftFile: FileInfo = {
        path: null,
        content: leftText,
        encoding: 'utf-8',
        lineEnding: 'lf',
        size: leftText.length,
        mtime: null,
        language: 'plaintext'
      }

      const rightFile: FileInfo = {
        path: null,
        content: rightText,
        encoding: 'utf-8',
        lineEnding: 'lf',
        size: rightText.length,
        mtime: null,
        language: 'plaintext'
      }

      const defaultOptions: DiffOptions = {
        ignoreWhitespace: 'none',
        ignoreCase: false,
        ignoreLineEndings: true,
        ignorePatterns: [],
        ignoreComments: false,
        commentPrefixes: [],
        algorithm: 'myers',
        contextLines: 3,
        ...options
      }

      const diffResult = await api.computeDiff(leftFile, rightFile, defaultOptions)
      const elapsed = Math.round(performance.now() - startTime)
      
      setResult(diffResult)
      setComputeTime(elapsed)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
    } finally {
      setIsComputing(false)
    }
  }, [leftText, rightText, options])

  useEffect(() => {
    recompute()
  }, [recompute])

  return {
    result,
    isComputing,
    computeTime,
    error,
    recompute
  }
}
