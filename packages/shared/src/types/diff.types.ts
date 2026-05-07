export type DiffLineType = 'equal' | 'insert' | 'delete' | 'replace'

export type ViewMode = 'split' | 'unified' | 'directory' | 'merge'

export type WhitespaceMode = 'none' | 'leading-trailing' | 'all'

export type Theme = 'light' | 'dark' | 'system'

export type DiffAlgorithm = 'myers' | 'patience' | 'histogram'

export interface InlineDiffSegment {
  text: string
  type: 'equal' | 'insert' | 'delete'
}

export interface InlineDiff {
  left: InlineDiffSegment[]
  right: InlineDiffSegment[]
}

export interface DiffLine {
  leftLineNo: number | null
  rightLineNo: number | null
  type: DiffLineType
  leftContent: string
  rightContent: string
  inlineDiff?: InlineDiff
}

export interface DiffChunk {
  id: string
  startIndex: number
  endIndex: number
  type: 'change' | 'insert' | 'delete'
  leftLineRange: [number, number]
  rightLineRange: [number, number]
  /**
   * 实际发生变化的行索引数组（在 diffResult.lines 中的索引）
   * 用于精确高亮，不包含上下文行
   */
  changeIndices: number[]
}

export interface DiffStats {
  totalLines: number
  equalLines: number
  insertedLines: number
  deletedLines: number
  modifiedLines: number
  chunkCount: number
}

export interface DiffResult {
  lines: DiffLine[]
  chunks: DiffChunk[]
  stats: DiffStats
  computedAt: number
}

export interface DiffOptions {
  ignoreWhitespace: WhitespaceMode
  ignoreCase: boolean
  ignoreLineEndings: boolean
  ignorePatterns: string[]
  ignoreComments: boolean
  commentPrefixes: string[]
  algorithm: DiffAlgorithm
  contextLines: number
}

export interface ConflictRegion {
  id: string
  startLine: number
  endLine: number
  baseContent: string
  leftContent: string
  rightContent: string
  resolved: boolean
  resolution?: 'base' | 'left' | 'right' | 'manual'
  resolvedContent?: string
}

export interface ThreeWayDiffResult {
  lines: DiffLine[]
  conflicts: ConflictRegion[]
  hasConflicts: boolean
  stats: DiffStats
  computedAt: number
}
