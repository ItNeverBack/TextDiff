import type { RecentDirectory } from '@shared/types'
import { getDatabase } from './database'

export class RecentDirectoriesRepository {
  add(dirPath: string): void {
    const db = getDatabase()

    const deleteStmt = db.prepare('DELETE FROM recent_directories WHERE path = ?')
    deleteStmt.run(dirPath)

    const insertStmt = db.prepare('INSERT INTO recent_directories (path, accessed_at) VALUES (?, ?)')
    insertStmt.run(dirPath, Date.now())
  }

  list(limit: number = 10): RecentDirectory[] {
    const db = getDatabase()
    const stmt = db.prepare(`
      SELECT path, accessed_at FROM recent_directories
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
    const stmt = db.prepare('DELETE FROM recent_directories')
    stmt.run()
  }

  delete(dirPath: string): void {
    const db = getDatabase()
    const stmt = db.prepare('DELETE FROM recent_directories WHERE path = ?')
    stmt.run(dirPath)
  }
}

export const recentDirectoriesRepository = new RecentDirectoriesRepository()
