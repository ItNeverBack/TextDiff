import type { RecentFile } from '@shared/types'
import { getDatabase } from './database'

export class RecentFilesRepository {
  add(filepath: string): void {
    const db = getDatabase()

    const deleteStmt = db.prepare('DELETE FROM recent_files WHERE path = ?')
    deleteStmt.run(filepath)

    const insertStmt = db.prepare('INSERT INTO recent_files (path, accessed_at) VALUES (?, ?)')
    insertStmt.run(filepath, Date.now())
  }

  list(limit: number = 10): RecentFile[] {
    const db = getDatabase()
    const stmt = db.prepare(`
      SELECT path, accessed_at FROM recent_files
      ORDER BY accessed_at DESC
      LIMIT ?
    `)

    const rows = stmt.all(limit) as { path: string; accessed_at: number }[]

    return rows.map(row => ({
      path: row.path,
      accessedAt: row.accessed_at
    }))
  }

  clear(): void {
    const db = getDatabase()
    const stmt = db.prepare('DELETE FROM recent_files')
    stmt.run()
  }

  delete(filepath: string): void {
    const db = getDatabase()
    const stmt = db.prepare('DELETE FROM recent_files WHERE path = ?')
    stmt.run(filepath)
  }
}

export const recentFilesRepository = new RecentFilesRepository()
