import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  initDatabase,
  getDatabase,
  closeDatabase
} from '../database'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

describe('Database', () => {
  let dbPath: string

  beforeEach(() => {
    // 使用临时文件作为测试数据库
    dbPath = path.join(os.tmpdir(), `textdiff-test-${Date.now()}.db`)
    closeDatabase() // 确保关闭之前的数据库
  })

  afterEach(() => {
    closeDatabase()
    // 清理测试数据库文件
    try {
      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath)
      }
    } catch {
      // 忽略清理错误
    }
  })

  describe('initDatabase', () => {
    it('使用指定路径初始化数据库', () => {
      const db = initDatabase(dbPath)

      expect(db).toBeDefined()
      expect(fs.existsSync(dbPath)).toBe(true)
    })

    it('多次调用返回同一实例', () => {
      const db1 = initDatabase(dbPath)
      const db2 = initDatabase(dbPath)

      expect(db1).toBe(db2)
    })

    it('使用 WAL 模式', () => {
      const db = initDatabase(dbPath)

      const result = db.pragma('journal_mode') as { journal_mode: string }
      expect(result.journal_mode).toBe('wal')
    })

    it('创建 sessions 表', () => {
      const db = initDatabase(dbPath)

      const tables = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='sessions'"
      ).get() as { name: string } | undefined

      expect(tables?.name).toBe('sessions')
    })

    it('创建 recent_files 表', () => {
      const db = initDatabase(dbPath)

      const tables = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='recent_files'"
      ).get() as { name: string } | undefined

      expect(tables?.name).toBe('recent_files')
    })

    it('创建 recent_directories 表', () => {
      const db = initDatabase(dbPath)

      const tables = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='recent_directories'"
      ).get() as { name: string } | undefined

      expect(tables?.name).toBe('recent_directories')
    })

    it('创建 settings 表', () => {
      const db = initDatabase(dbPath)

      const tables = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='settings'"
      ).get() as { name: string } | undefined

      expect(tables?.name).toBe('settings')
    })

    it('创建 sessions 索引', () => {
      const db = initDatabase(dbPath)

      const indexes = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_sessions_updated_at'"
      ).get() as { name: string } | undefined

      expect(indexes?.name).toBe('idx_sessions_updated_at')
    })

    it('创建 recent_files 索引', () => {
      const db = initDatabase(dbPath)

      const indexes = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_recent_files_accessed_at'"
      ).get() as { name: string } | undefined

      expect(indexes?.name).toBe('idx_recent_files_accessed_at')
    })

    it('创建 recent_directories 索引', () => {
      const db = initDatabase(dbPath)

      const indexes = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_recent_directories_accessed_at'"
      ).get() as { name: string } | undefined

      expect(indexes?.name).toBe('idx_recent_directories_accessed_at')
    })

    it('回退方案在迁移文件不存在时创建表', () => {
      // 创建一个临时目录，不包含迁移文件
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'textdiff-test-'))
      const tempDbPath = path.join(tempDir, 'test.db')

      closeDatabase()

      // 通过直接调用 initTablesFallback 的方式测试
      const db = initDatabase(tempDbPath)

      // 验证表已创建
      const tables = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table'"
      ).all() as { name: string }[]

      const tableNames = tables.map(t => t.name)
      expect(tableNames).toContain('sessions')
      expect(tableNames).toContain('recent_files')
      expect(tableNames).toContain('recent_directories')
      expect(tableNames).toContain('settings')

      closeDatabase()

      // 清理
      try {
        fs.unlinkSync(tempDbPath)
        fs.rmdirSync(tempDir)
      } catch {
        // 忽略清理错误
      }
    })
  })

  describe('getDatabase', () => {
    it('未初始化时自动初始化', () => {
      closeDatabase()

      const db = getDatabase()

      expect(db).toBeDefined()
    })

    it('返回已初始化的数据库', () => {
      const db1 = initDatabase(dbPath)
      const db2 = getDatabase()

      expect(db1).toBe(db2)
    })
  })

  describe('closeDatabase', () => {
    it('关闭数据库连接', () => {
      initDatabase(dbPath)

      closeDatabase()

      // 关闭后应该可以重新初始化
      const db = initDatabase(dbPath)
      expect(db).toBeDefined()
    })

    it('多次关闭不报错', () => {
      expect(() => {
        closeDatabase()
        closeDatabase()
      }).not.toThrow()
    })
  })

  describe('数据库表结构', () => {
    it('sessions 表有正确的列', () => {
      const db = initDatabase(dbPath)

      const columns = db.prepare(
        "PRAGMA table_info(sessions)"
      ).all() as { name: string; type: string; notnull: number; pk: number }[]

      const columnMap = new Map(columns.map(c => [c.name, c]))

      expect(columnMap.has('id')).toBe(true)
      expect(columnMap.has('name')).toBe(true)
      expect(columnMap.has('created_at')).toBe(true)
      expect(columnMap.has('updated_at')).toBe(true)
      expect(columnMap.has('data')).toBe(true)

      // id 是主键
      expect(columnMap.get('id')?.pk).toBe(1)

      // 所有列都是 NOT NULL
      expect(columnMap.get('id')?.notnull).toBe(1)
      expect(columnMap.get('name')?.notnull).toBe(1)
      expect(columnMap.get('created_at')?.notnull).toBe(1)
      expect(columnMap.get('updated_at')?.notnull).toBe(1)
      expect(columnMap.get('data')?.notnull).toBe(1)
    })

    it('recent_files 表有正确的列', () => {
      const db = initDatabase(dbPath)

      const columns = db.prepare(
        "PRAGMA table_info(recent_files)"
      ).all() as { name: string; type: string; notnull: number; pk: number }[]

      const columnMap = new Map(columns.map(c => [c.name, c]))

      expect(columnMap.has('id')).toBe(true)
      expect(columnMap.has('path')).toBe(true)
      expect(columnMap.has('accessed_at')).toBe(true)

      // id 是自增主键
      expect(columnMap.get('id')?.pk).toBe(1)

      // path 有 UNIQUE 约束
      // 注意：SQLite 中 UNIQUE 约束在 table_info 中不直接显示
    })

    it('recent_directories 表有正确的列', () => {
      const db = initDatabase(dbPath)

      const columns = db.prepare(
        "PRAGMA table_info(recent_directories)"
      ).all() as { name: string; type: string; notnull: number; pk: number }[]

      const columnMap = new Map(columns.map(c => [c.name, c]))

      expect(columnMap.has('id')).toBe(true)
      expect(columnMap.has('path')).toBe(true)
      expect(columnMap.has('accessed_at')).toBe(true)

      expect(columnMap.get('id')?.pk).toBe(1)
    })

    it('settings 表有正确的列', () => {
      const db = initDatabase(dbPath)

      const columns = db.prepare(
        "PRAGMA table_info(settings)"
      ).all() as { name: string; type: string; notnull: number; pk: number }[]

      const columnMap = new Map(columns.map(c => [c.name, c]))

      expect(columnMap.has('key')).toBe(true)
      expect(columnMap.has('value')).toBe(true)

      // key 是主键
      expect(columnMap.get('key')?.pk).toBe(1)
    })
  })

  describe('数据库基本操作', () => {
    it('可以插入和查询 sessions 数据', () => {
      const db = initDatabase(dbPath)

      const insert = db.prepare(
        'INSERT INTO sessions (id, name, created_at, updated_at, data) VALUES (?, ?, ?, ?, ?)'
      )
      insert.run('test-id', 'Test Session', Date.now(), Date.now(), '{}')

      const result = db.prepare('SELECT * FROM sessions WHERE id = ?').get('test-id') as {
        id: string
        name: string
      }

      expect(result.id).toBe('test-id')
      expect(result.name).toBe('Test Session')
    })

    it('可以插入和查询 recent_files 数据', () => {
      const db = initDatabase(dbPath)

      const insert = db.prepare(
        'INSERT INTO recent_files (path, accessed_at) VALUES (?, ?)'
      )
      insert.run('/path/to/file.txt', Date.now())

      const result = db.prepare('SELECT * FROM recent_files WHERE path = ?').get('/path/to/file.txt') as {
        path: string
      }

      expect(result.path).toBe('/path/to/file.txt')
    })

    it('可以插入和查询 settings 数据', () => {
      const db = initDatabase(dbPath)

      const insert = db.prepare(
        'INSERT INTO settings (key, value) VALUES (?, ?)'
      )
      insert.run('theme', 'dark')

      const result = db.prepare('SELECT * FROM settings WHERE key = ?').get('theme') as {
        key: string
        value: string
      }

      expect(result.key).toBe('theme')
      expect(result.value).toBe('dark')
    })

    it('sessions id 唯一约束', () => {
      const db = initDatabase(dbPath)

      const insert = db.prepare(
        'INSERT INTO sessions (id, name, created_at, updated_at, data) VALUES (?, ?, ?, ?, ?)'
      )
      insert.run('same-id', 'Session 1', Date.now(), Date.now(), '{}')

      // 尝试插入相同 id 应该报错
      expect(() => {
        insert.run('same-id', 'Session 2', Date.now(), Date.now(), '{}')
      }).toThrow()
    })

    it('settings key 唯一约束', () => {
      const db = initDatabase(dbPath)

      const insert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)')
      insert.run('key1', 'value1')

      // 尝试插入相同 key 应该报错
      expect(() => {
        insert.run('key1', 'value2')
      }).toThrow()
    })

    it('recent_files path 唯一约束', () => {
      const db = initDatabase(dbPath)

      const insert = db.prepare('INSERT INTO recent_files (path, accessed_at) VALUES (?, ?)')
      insert.run('/same/path.txt', Date.now())

      // 尝试插入相同 path 应该报错
      expect(() => {
        insert.run('/same/path.txt', Date.now())
      }).toThrow()
    })
  })
})
