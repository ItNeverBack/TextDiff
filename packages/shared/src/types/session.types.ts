import type { DiffOptions, DiffStats } from './diff.types'
import type { FileInfo } from './file.types'

export interface DiffSession {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  left: FileInfo
  right: FileInfo
  options: DiffOptions
  stats?: DiffStats  // 差异统计信息（可选）
  scrollPosition?: {
    left: number
    right: number
  }
  activeChunkIndex?: number
}

export interface RecentFile {
  path: string
  accessedAt: number
}

export interface RecentDirectory {
  path: string
  accessedAt: number
}

export interface ListOptions {
  limit?: number
  offset?: number
  sortBy?: 'createdAt' | 'updatedAt' | 'name'
  sortOrder?: 'asc' | 'desc'
}
