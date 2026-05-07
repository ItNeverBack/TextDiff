import type { DiffLine, DiffChunk, DiffStats } from '@shared/types'

export function calculateStats(lines: DiffLine[], chunks: DiffChunk[]): DiffStats {
  const stats: DiffStats = {
    totalLines: lines.length,
    equalLines: 0,
    insertedLines: 0,
    deletedLines: 0,
    modifiedLines: 0,
    chunkCount: chunks.length
  }

  for (const line of lines) {
    switch (line.type) {
      case 'equal':
        stats.equalLines++
        break
      case 'insert':
        stats.insertedLines++
        break
      case 'delete':
        stats.deletedLines++
        break
      case 'replace':
        stats.modifiedLines++
        break
    }
  }

  return stats
}
