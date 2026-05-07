import type { DiffSession, ListOptions } from '@shared/types'
import { getDatabase } from './database'

export class SessionRepository {
  save(session: DiffSession): void {
    const db = getDatabase()
    const stmt = db.prepare(`
      INSERT INTO sessions (id, name, created_at, updated_at, data)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        updated_at = excluded.updated_at,
        data = excluded.data
    `)

    stmt.run(
      session.id,
      session.name,
      session.createdAt,
      session.updatedAt,
      JSON.stringify(session)
    )
  }

  load(id: string): DiffSession | null {
    const db = getDatabase()
    const stmt = db.prepare('SELECT data FROM sessions WHERE id = ?')
    const row = stmt.get(id) as { data: string } | undefined

    if (!row) return null

    try {
      return JSON.parse(row.data) as DiffSession
    } catch {
      return null
    }
  }

  list(options: ListOptions = {}): DiffSession[] {
    const db = getDatabase()
    const { limit = 50, offset = 0, sortBy = 'updatedAt', sortOrder = 'desc' } = options

    const orderColumn = sortBy === 'createdAt' ? 'created_at' : 'updated_at'
    const orderDirection = sortOrder.toUpperCase()

    const stmt = db.prepare(`
      SELECT data FROM sessions
      ORDER BY ${orderColumn} ${orderDirection}
      LIMIT ? OFFSET ?
    `)

    const rows = stmt.all(limit, offset) as { data: string }[]

    return rows
      .map(row => {
        try {
          return JSON.parse(row.data) as DiffSession
        } catch {
          return null
        }
      })
      .filter((s): s is DiffSession => s !== null)
  }

  delete(id: string): void {
    const db = getDatabase()
    const stmt = db.prepare('DELETE FROM sessions WHERE id = ?')
    stmt.run(id)
  }

  update(id: string, updates: Partial<DiffSession>): DiffSession | null {
    const existing = this.load(id)
    if (!existing) return null

    const updated: DiffSession = {
      ...existing,
      ...updates,
      id: existing.id, // 确保 id 不被修改
      createdAt: existing.createdAt, // 确保创建时间不被修改
      updatedAt: Date.now() // 更新时间
    }

    this.save(updated)
    return updated
  }

  count(): number {
    const db = getDatabase()
    const stmt = db.prepare('SELECT COUNT(*) as count FROM sessions')
    const row = stmt.get() as { count: number }
    return row.count
  }
}

export const sessionRepository = new SessionRepository()
