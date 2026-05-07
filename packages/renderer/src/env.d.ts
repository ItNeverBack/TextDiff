/// <reference types="vite/client" />

import type { TextDiffAPI, Language, DiffLine, DiffChunk } from '@shared/types'
import type { SyncDiffOptions, SyncDiffResult } from '@shared/types/ipc.types'

declare global {
  interface Window {
    api: TextDiffAPI & {
      // Week 12: 缓存管理
      getDiffCacheStats: () => Promise<{ size: number; maxSize: number; ttl: number }>
      clearDiffCache: () => Promise<void>
      clearSessionCache: (leftPath: string, rightPath: string) => Promise<void>
      // Week 13: 语言切换
      setLanguage: (language: Language) => Promise<void>
      // 差异同步
      syncDiff: (
        leftPath: string,
        rightPath: string,
        leftContent: string,
        rightContent: string,
        lines: DiffLine[],
        chunks: DiffChunk[],
        options: SyncDiffOptions
      ) => Promise<SyncDiffResult>
    }
  }
}

export {}
