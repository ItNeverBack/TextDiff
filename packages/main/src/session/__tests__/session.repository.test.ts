import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { SessionRepository } from '../session.repository'
import { initDatabase, closeDatabase, getDatabase } from '../database'
import type { DiffSession } from '@shared/types'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

describe('SessionRepository', () => {
  let repository: SessionRepository
  let dbPath: string

  beforeEach(() => {
    dbPath = path.join(os.tmpdir(), `textdiff-session-test-${Date.now()}.db`)
    closeDatabase()
    initDatabase(dbPath)
    repository = new SessionRepository()
  })

  afterEach(() => {
    closeDatabase()
    try {
      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath)
      }
    } catch {
      // 忽略清理错误
    }
  })

  describe('save', () => {
    it('创建新会话', () => {
      const session: DiffSession = {
        id: 'test-id-1',
        name: 'Test Session',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        leftFile: {
          path: '/left/file.txt',
          content: 'left content',
          encoding: 'utf-8',
          lineEnding: 'LF',
          size: 100,
          mtime: Date.now()
        },
        rightFile: {
          path: '/right/file.txt',
          content: 'right content',
          encoding: 'utf-8',
          lineEnding: 'LF',
          size: 100,
          mtime: Date.now()
        },
        diffOptions: {
          algorithm: 'myers',
          ignoreWhitespace: false,
          ignoreCase: false,
          ignoreLineEndings: false,
          contextLines: 3
        }
      }

      repository.save(session)

      const loaded = repository.load('test-id-1')
      expect(loaded).toEqual(session)
    })

    it('更新现有会话', () => {
      const session: DiffSession = {
        id: 'test-id-2',
        name: 'Original Name',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        leftFile: null,
        rightFile: null
      }

      repository.save(session)

      const updatedSession: DiffSession = {
        ...session,
        name: 'Updated Name',
        updatedAt: Date.now() + 1000
      }

      repository.save(updatedSession)

      const loaded = repository.load('test-id-2')
      expect(loaded?.name).toBe('Updated Name')
      expect(loaded?.updatedAt).toBe(session.updatedAt + 1000)
    })

    it('保存多个会话', () => {
      for (let i = 0; i < 5; i++) {
        const session: DiffSession = {
          id: `test-id-${i}`,
          name: `Session ${i}`,
          createdAt: Date.now() + i,
          updatedAt: Date.now() + i
        }
        repository.save(session)
      }

      expect(repository.count()).toBe(5)
    })

    it('正确序列化复杂数据', () => {
      const session: DiffSession = {
        id: 'complex-id',
        name: 'Complex Session',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        leftFile: {
          path: '/path/to/left.txt',
          content: 'line 1\nline 2\nline 3',
          encoding: 'utf-8',
          lineEnding: 'LF',
          size: 1000,
          mtime: Date.now(),
          language: 'typescript'
        },
        rightFile: {
          path: '/path/to/right.txt',
          content: 'line 1\nmodified line\nline 3',
          encoding: 'utf-8',
          lineEnding: 'LF',
          size: 1000,
          mtime: Date.now(),
          language: 'typescript'
        },
        diffOptions: {
          algorithm: 'patience',
          ignoreWhitespace: true,
          ignoreCase: true,
          ignoreLineEndings: false,
          contextLines: 5
        }
      }

      repository.save(session)

      const loaded = repository.load('complex-id')
      expect(loaded).toEqual(session)
      expect(loaded?.leftFile?.content).toBe('line 1\nline 2\nline 3')
      expect(loaded?.diffOptions?.algorithm).toBe('patience')
    })
  })

  describe('load', () => {
    it('加载存在的会话', () => {
      const session: DiffSession = {
        id: 'load-test',
        name: 'Load Test',
        createdAt: 1234567890,
        updatedAt: 1234567890
      }

      repository.save(session)

      const loaded = repository.load('load-test')

      expect(loaded).not.toBeNull()
      expect(loaded?.id).toBe('load-test')
      expect(loaded?.name).toBe('Load Test')
    })

    it('加载不存在的会话返回 null', () => {
      const loaded = repository.load('nonexistent-id')

      expect(loaded).toBeNull()
    })

    it('损坏的数据返回 null', () => {
      // 手动插入损坏的 JSON 数据
      const db = getDatabase()
      const stmt = db.prepare(
        'INSERT INTO sessions (id, name, created_at, updated_at, data) VALUES (?, ?, ?, ?, ?)'
      )
      stmt.run('corrupted-id', 'Corrupted', 123, 123, 'not valid json {{{')

      const loaded = repository.load('corrupted-id')

      expect(loaded).toBeNull()
    })
  })

  describe('list', () => {
    beforeEach(() => {
      // 创建测试数据
      for (let i = 0; i < 10; i++) {
        const session: DiffSession = {
          id: `list-test-${i}`,
          name: `Session ${i}`,
          createdAt: 1000 + i,
          updatedAt: 5000 + i * 100 // 不同的更新时间
        }
        repository.save(session)
      }
    })

    it('返回所有会话（默认限制50）', () => {
      const sessions = repository.list()

      expect(sessions.length).toBe(10)
    })

    it('支持分页限制', () => {
      const sessions = repository.list({ limit: 5 })

      expect(sessions.length).toBe(5)
    })

    it('支持分页偏移', () => {
      const sessions = repository.list({ limit: 5, offset: 5 })

      expect(sessions.length).toBe(5)
    })

    it('默认按 updatedAt 降序排列', () => {
      const sessions = repository.list()

      // 最新的在前
      expect(sessions[0].updatedAt).toBeGreaterThan(sessions[9].updatedAt)
    })

    it('支持按 createdAt 排序', () => {
      const sessions = repository.list({ sortBy: 'createdAt', sortOrder: 'asc' })

      expect(sessions[0].createdAt).toBeLessThan(sessions[9].createdAt)
    })

    it('支持升序排列', () => {
      const sessions = repository.list({ sortOrder: 'asc' })

      expect(sessions[0].updatedAt).toBeLessThan(sessions[9].updatedAt)
    })

    it('过滤损坏的数据', () => {
      // 插入一条损坏的数据
      const db = getDatabase()
      const stmt = db.prepare(
        'INSERT INTO sessions (id, name, created_at, updated_at, data) VALUES (?, ?, ?, ?, ?)'
      )
      stmt.run('corrupted-list', 'Corrupted', 99999, 99999, 'invalid json')

      const sessions = repository.list()

      // 损坏的数据被过滤掉
      expect(sessions.every(s => s.id !== 'corrupted-list')).toBe(true)
    })
  })

  describe('delete', () => {
    it('删除存在的会话', () => {
      const session: DiffSession = {
        id: 'delete-test',
        name: 'Delete Test',
        createdAt: Date.now(),
        updatedAt: Date.now()
      }

      repository.save(session)
      expect(repository.load('delete-test')).not.toBeNull()

      repository.delete('delete-test')

      expect(repository.load('delete-test')).toBeNull()
    })

    it('删除不存在的会话不报错', () => {
      expect(() => repository.delete('nonexistent')).not.toThrow()
    })

    it('删除后 count 减少', () => {
      const session: DiffSession = {
        id: 'delete-count-test',
        name: 'Delete Count Test',
        createdAt: Date.now(),
        updatedAt: Date.now()
      }

      repository.save(session)
      const countBefore = repository.count()

      repository.delete('delete-count-test')
      const countAfter = repository.count()

      expect(countAfter).toBe(countBefore - 1)
    })
  })

  describe('update', () => {
    it('更新会话的部分字段', () => {
      const session: DiffSession = {
        id: 'update-test',
        name: 'Original Name',
        createdAt: 1000,
        updatedAt: 2000,
        leftFile: {
          path: '/left.txt',
          content: 'left',
          encoding: 'utf-8',
          lineEnding: 'LF',
          size: 10,
          mtime: Date.now()
        }
      }

      repository.save(session)

      const updated = repository.update('update-test', { name: 'Updated Name' })

      expect(updated).not.toBeNull()
      expect(updated?.name).toBe('Updated Name')
      expect(updated?.createdAt).toBe(1000) // 创建时间不变
      expect(updated?.updatedAt).toBeGreaterThan(2000) // 更新时间更新
    })

    it('更新多个字段', () => {
      const session: DiffSession = {
        id: 'multi-update-test',
        name: 'Name',
        createdAt: Date.now(),
        updatedAt: Date.now()
      }

      repository.save(session)

      const updated = repository.update('multi-update-test', {
        name: 'New Name',
        leftFile: {
          path: '/new/left.txt',
          content: 'new content',
          encoding: 'utf-8',
          lineEnding: 'LF',
          size: 50,
          mtime: Date.now()
        }
      })

      expect(updated?.name).toBe('New Name')
      expect(updated?.leftFile?.path).toBe('/new/left.txt')
    })

    it('id 字段不会被更新', () => {
      const session: DiffSession = {
        id: 'immutable-id-test',
        name: 'Test',
        createdAt: Date.now(),
        updatedAt: Date.now()
      }

      repository.save(session)

      // 尝试修改 id
      const updated = repository.update('immutable-id-test', { id: 'new-id' } as any)

      expect(updated?.id).toBe('immutable-id-test')
      expect(repository.load('immutable-id-test')).not.toBeNull()
      expect(repository.load('new-id')).toBeNull()
    })

    it('createdAt 字段不会被更新', () => {
      const session: DiffSession = {
        id: 'immutable-created-test',
        name: 'Test',
        createdAt: 1000,
        updatedAt: Date.now()
      }

      repository.save(session)

      const updated = repository.update('immutable-created-test', { createdAt: 9999 })

      expect(updated?.createdAt).toBe(1000)
    })

    it('不存在的会话返回 null', () => {
      const updated = repository.update('nonexistent', { name: 'New Name' })

      expect(updated).toBeNull()
    })
  })

  describe('count', () => {
    it('返回会话数量', () => {
      expect(repository.count()).toBe(0)

      for (let i = 0; i < 3; i++) {
        repository.save({
          id: `count-test-${i}`,
          name: `Session ${i}`,
          createdAt: Date.now(),
          updatedAt: Date.now()
        })
      }

      expect(repository.count()).toBe(3)
    })

    it('删除后计数减少', () => {
      repository.save({
        id: 'count-delete-test',
        name: 'Test',
        createdAt: Date.now(),
        updatedAt: Date.now()
      })

      const before = repository.count()
      repository.delete('count-delete-test')
      const after = repository.count()

      expect(after).toBe(before - 1)
    })
  })

  describe('边缘情况', () => {
    it('处理特殊字符', () => {
      const session: DiffSession = {
        id: 'special-"chars"-test',
        name: 'Session with "quotes" and \\ backslash',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        leftFile: {
          path: '/path/with spaces/file.txt',
          content: 'Content with emoji 🎉 and unicode 中文',
          encoding: 'utf-8',
          lineEnding: 'LF',
          size: 100,
          mtime: Date.now()
        }
      }

      repository.save(session)

      const loaded = repository.load('special-"chars"-test')
      expect(loaded?.name).toBe('Session with "quotes" and \\ backslash')
      expect(loaded?.leftFile?.content).toBe('Content with emoji 🎉 and unicode 中文')
    })

    it('处理空字符串', () => {
      const session: DiffSession = {
        id: 'empty-strings-test',
        name: '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        leftFile: {
          path: '',
          content: '',
          encoding: 'utf-8',
          lineEnding: 'LF',
          size: 0,
          mtime: Date.now()
        }
      }

      repository.save(session)

      const loaded = repository.load('empty-strings-test')
      expect(loaded?.name).toBe('')
      expect(loaded?.leftFile?.path).toBe('')
      expect(loaded?.leftFile?.content).toBe('')
    })

    it('处理很长的内容', () => {
      const longContent = 'a'.repeat(100000) // 10万字符

      const session: DiffSession = {
        id: 'long-content-test',
        name: 'Long Content',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        leftFile: {
          path: '/long.txt',
          content: longContent,
          encoding: 'utf-8',
          lineEnding: 'LF',
          size: 100000,
          mtime: Date.now()
        }
      }

      repository.save(session)

      const loaded = repository.load('long-content-test')
      expect(loaded?.leftFile?.content).toBe(longContent)
      expect(loaded?.leftFile?.content?.length).toBe(100000)
    })
  })
})
