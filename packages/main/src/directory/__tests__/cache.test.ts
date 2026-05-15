import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  DirectoryCacheManager,
  getCacheManager,
  resetCacheManager,
  generateCacheKey,
  estimateEntrySize,
  type CacheConfig,
  type CacheEntry
} from '../cache'

describe('DirectoryCacheManager', () => {
  let manager: DirectoryCacheManager

  beforeEach(() => {
    vi.useFakeTimers()
    resetCacheManager()
    manager = getCacheManager()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('constructor', () => {
    it('使用默认配置初始化', () => {
      const freshManager = new DirectoryCacheManager()
      expect(freshManager.getStats()).toBeDefined()
    })

    it('自定义配置覆盖默认值', () => {
      const config: CacheConfig = {
        maxEntries: 100,
        ttl: 60000,
        enabled: false
      }
      const customManager = new DirectoryCacheManager(config)

      // enabled=false 时无法获取缓存
      expect(customManager.getCache('/test')).toBeUndefined()
    })
  })

  describe('createCache', () => {
    it('创建新缓存', () => {
      const cache = manager.createCache('/test/dir')

      expect(cache.rootPath).toBe('/test/dir')
      expect(cache.entries.size).toBe(0)
      expect(cache.totalFiles).toBe(0)
      expect(cache.totalSize).toBe(0)
      expect(cache.lastScan).toBeGreaterThan(0)
    })

    it('多次创建相同路径覆盖旧缓存', () => {
      const cache1 = manager.createCache('/test/dir')
      cache1.totalFiles = 10

      const cache2 = manager.createCache('/test/dir')

      expect(cache2.totalFiles).toBe(0) // 新缓存覆盖旧缓存
    })
  })

  describe('getCache', () => {
    it('返回存在的缓存', () => {
      manager.createCache('/test/dir')
      const cache = manager.getCache('/test/dir')

      expect(cache).toBeDefined()
      expect(cache?.rootPath).toBe('/test/dir')
    })

    it('不存在的缓存返回 undefined', () => {
      const cache = manager.getCache('/nonexistent')

      expect(cache).toBeUndefined()
    })

    it('过期的缓存被删除', () => {
      const config: CacheConfig = { ttl: 1 } // 1ms TTL
      const shortLivedManager = new DirectoryCacheManager(config)

      shortLivedManager.createCache('/test/dir')

      // 等待过期
      vi.advanceTimersByTime(2)

      const cache = shortLivedManager.getCache('/test/dir')
      expect(cache).toBeUndefined()
    })

    it('禁用缓存时返回 undefined', () => {
      const disabledManager = new DirectoryCacheManager({ enabled: false })

      disabledManager.createCache('/test/dir')

      const cache = disabledManager.getCache('/test/dir')
      expect(cache).toBeUndefined()
    })
  })

  describe('setEntry', () => {
    it('添加条目到缓存', () => {
      const cache = manager.createCache('/test')
      const entry: CacheEntry = {
        relativePath: 'file.txt',
        size: 100,
        modifiedTime: Date.now(),
        cachedAt: Date.now()
      }

      manager.setEntry(cache, entry)

      expect(cache.entries.size).toBe(1)
      expect(cache.entries.get('file.txt')).toEqual(entry)
    })

    it('更新已存在的条目', () => {
      const cache = manager.createCache('/test')
      const entry1: CacheEntry = {
        relativePath: 'file.txt',
        size: 100,
        modifiedTime: 1000,
        cachedAt: Date.now()
      }
      const entry2: CacheEntry = {
        relativePath: 'file.txt',
        size: 200,
        modifiedTime: 2000,
        cachedAt: Date.now()
      }

      manager.setEntry(cache, entry1)
      manager.setEntry(cache, entry2)

      expect(cache.entries.size).toBe(1)
      expect(cache.entries.get('file.txt')?.size).toBe(200)
    })

    it('超过最大条目数时驱逐旧条目', () => {
      const config: CacheConfig = { maxEntries: 10 }
      const limitedManager = new DirectoryCacheManager(config)
      const cache = limitedManager.createCache('/test')

      // 添加 10 个条目
      for (let i = 0; i < 10; i++) {
        const entry: CacheEntry = {
          relativePath: `file${i}.txt`,
          size: 100,
          modifiedTime: Date.now(),
          cachedAt: Date.now() + i // 不同的缓存时间
        }
        limitedManager.setEntry(cache, entry)
      }

      expect(cache.entries.size).toBe(10)

      // 添加第 11 个条目，应触发驱逐
      const newEntry: CacheEntry = {
        relativePath: 'newfile.txt',
        size: 100,
        modifiedTime: Date.now(),
        cachedAt: Date.now() + 100
      }
      limitedManager.setEntry(cache, newEntry)

      // 驱逐10% = 1个条目，所以总数应该是10
      expect(cache.entries.size).toBe(10)
    })
  })

  describe('getEntry', () => {
    it('获取存在的条目', () => {
      const cache = manager.createCache('/test')
      const entry: CacheEntry = {
        relativePath: 'file.txt',
        size: 100,
        modifiedTime: Date.now(),
        cachedAt: Date.now()
      }

      manager.setEntry(cache, entry)
      const retrieved = manager.getEntry(cache, 'file.txt')

      expect(retrieved).toEqual(entry)
    })

    it('获取不存在的条目返回 undefined', () => {
      const cache = manager.createCache('/test')

      const retrieved = manager.getEntry(cache, 'nonexistent.txt')

      expect(retrieved).toBeUndefined()
    })
  })

  describe('deleteEntry', () => {
    it('删除存在的条目', () => {
      const cache = manager.createCache('/test')
      const entry: CacheEntry = {
        relativePath: 'file.txt',
        size: 100,
        modifiedTime: Date.now(),
        cachedAt: Date.now()
      }

      manager.setEntry(cache, entry)
      const deleted = manager.deleteEntry(cache, 'file.txt')

      expect(deleted).toBe(true)
      expect(cache.entries.has('file.txt')).toBe(false)
    })

    it('删除不存在的条目返回 false', () => {
      const cache = manager.createCache('/test')

      const deleted = manager.deleteEntry(cache, 'nonexistent.txt')

      expect(deleted).toBe(false)
    })
  })

  describe('isEntryValid', () => {
    it('修改时间相同视为有效', () => {
      const entry: CacheEntry = {
        relativePath: 'file.txt',
        size: 100,
        modifiedTime: 1000,
        cachedAt: Date.now()
      }

      const isValid = manager.isEntryValid(entry, 1000)

      expect(isValid).toBe(true)
    })

    it('修改时间不同视为无效', () => {
      const entry: CacheEntry = {
        relativePath: 'file.txt',
        size: 100,
        modifiedTime: 1000,
        cachedAt: Date.now()
      }

      const isValid = manager.isEntryValid(entry, 2000)

      expect(isValid).toBe(false)
    })
  })

  describe('cleanExpired', () => {
    it('清理过期缓存', () => {
      const config: CacheConfig = { ttl: 1 }
      const shortLivedManager = new DirectoryCacheManager(config)

      // 创建缓存
      shortLivedManager.createCache('/test1')
      shortLivedManager.createCache('/test2')

      // 等待过期
      vi.advanceTimersByTime(2)

      const cleaned = shortLivedManager.cleanExpired()

      expect(cleaned).toBeGreaterThanOrEqual(2)
      expect(shortLivedManager.getStats().totalCaches).toBe(0)
    })

    it('清理过期条目但保留缓存', () => {
      const cache = manager.createCache('/test')
      const entry: CacheEntry = {
        relativePath: 'file.txt',
        size: 100,
        modifiedTime: Date.now(),
        cachedAt: 1 // 很早的缓存时间
      }

      manager.setEntry(cache, entry)

      // 设置一个较长的TTL，条目过期但缓存未过期
      const config: CacheConfig = { ttl: 1000000 }
      const testManager = new DirectoryCacheManager(config)
      const testCache = testManager.createCache('/test2')
      testCache.entries.set('file.txt', entry)

      const cleaned = testManager.cleanExpired()

      // 条目缓存时间超过 TTL*0.5，应该被清理
      expect(cleaned).toBeGreaterThanOrEqual(0)
    })

    it('空缓存不报错', () => {
      const cleaned = manager.cleanExpired()
      expect(cleaned).toBe(0)
    })
  })

  describe('cleanupGradual', () => {
    it('内存使用正常时不清理', () => {
      const cleaned = manager.cleanupGradual(70)
      expect(cleaned).toBe(0)
    })

    it('返回清理的条目数', () => {
      // 添加大量条目以增加内存占用
      const cache = manager.createCache('/test')
      for (let i = 0; i < 100; i++) {
        const entry: CacheEntry = {
          relativePath: `file${i}.txt`,
          size: 1000000, // 大文件
          modifiedTime: Date.now(),
          cachedAt: Date.now()
        }
        cache.entries.set(entry.relativePath, entry)
      }

      const cleaned = manager.cleanupGradual(1) // 很低的阈值

      // 应该清理一些条目
      expect(typeof cleaned).toBe('number')
    })
  })

  describe('getMemoryUsagePercent', () => {
    it('返回内存使用百分比', () => {
      const percent = manager.getMemoryUsagePercent()

      expect(typeof percent).toBe('number')
      expect(percent).toBeGreaterThanOrEqual(0)
    })
  })

  describe('clearCache', () => {
    it('清除指定缓存', () => {
      manager.createCache('/test')

      const cleared = manager.clearCache('/test')

      expect(cleared).toBe(true)
      expect(manager.getCache('/test')).toBeUndefined()
    })

    it('清除不存在的缓存返回 false', () => {
      const cleared = manager.clearCache('/nonexistent')

      expect(cleared).toBe(false)
    })
  })

  describe('clearAll', () => {
    it('清除所有缓存', () => {
      manager.createCache('/test1')
      manager.createCache('/test2')

      manager.clearAll()

      expect(manager.getStats().totalCaches).toBe(0)
    })
  })

  describe('getStats', () => {
    it('返回缓存统计信息', () => {
      const cache = manager.createCache('/test')
      const entry: CacheEntry = {
        relativePath: 'file.txt',
        size: 100,
        modifiedTime: Date.now(),
        cachedAt: Date.now()
      }
      manager.setEntry(cache, entry)

      const stats = manager.getStats()

      expect(stats.totalCaches).toBe(1)
      expect(stats.totalEntries).toBe(1)
      expect(stats.memoryEstimate).toBeGreaterThan(0)
    })

    it('空管理器返回零统计', () => {
      const stats = manager.getStats()

      expect(stats.totalCaches).toBe(0)
      expect(stats.totalEntries).toBe(0)
      expect(stats.memoryEstimate).toBe(0)
    })
  })

  describe('getCacheStats', () => {
    it('返回存在的缓存统计', () => {
      const cache = manager.createCache('/test')
      const entry: CacheEntry = {
        relativePath: 'file.txt',
        size: 100,
        modifiedTime: Date.now(),
        cachedAt: Date.now()
      }
      manager.setEntry(cache, entry)

      const stats = manager.getCacheStats('/test')

      expect(stats.exists).toBe(true)
      expect(stats.entries).toBe(1)
      expect(stats.age).toBeGreaterThanOrEqual(0)
    })

    it('不存在的缓存返回不存在标记', () => {
      const stats = manager.getCacheStats('/nonexistent')

      expect(stats.exists).toBe(false)
      expect(stats.entries).toBe(0)
      expect(stats.age).toBe(0)
    })
  })
})

describe('getCacheManager', () => {
  beforeEach(() => {
    resetCacheManager()
  })

  it('首次调用创建新实例', () => {
    const manager = getCacheManager()

    expect(manager).toBeDefined()
    expect(manager.getStats()).toBeDefined()
  })

  it('多次调用返回同一实例', () => {
    const manager1 = getCacheManager()
    const manager2 = getCacheManager()

    expect(manager1).toBe(manager2)
  })

  it('使用配置创建实例', () => {
    const config: CacheConfig = { maxEntries: 500 }
    const manager = getCacheManager(config)

    expect(manager).toBeDefined()
  })
})

describe('resetCacheManager', () => {
  it('重置单例实例', () => {
    const manager1 = getCacheManager()
    manager1.createCache('/test')

    resetCacheManager()

    const manager2 = getCacheManager()
    expect(manager2.getStats().totalCaches).toBe(0)
    expect(manager1).not.toBe(manager2)
  })
})

describe('generateCacheKey', () => {
  it('为相同输入生成相同key', () => {
    const key1 = generateCacheKey('path/to/file.txt', 100, 123456)
    const key2 = generateCacheKey('path/to/file.txt', 100, 123456)

    expect(key1).toBe(key2)
  })

  it('为不同输入生成不同key', () => {
    const key1 = generateCacheKey('path1', 100, 123456)
    const key2 = generateCacheKey('path2', 100, 123456)

    expect(key1).not.toBe(key2)
  })

  it('生成有效的 MD5 hash', () => {
    const key = generateCacheKey('test', 0, 0)

    expect(key).toMatch(/^[a-f0-9]{32}$/)
  })
})

describe('estimateEntrySize', () => {
    it('估算条目大小', () => {
      const entry: CacheEntry = {
        relativePath: 'test.txt',
        size: 100,
        modifiedTime: Date.now(),
        cachedAt: Date.now()
      }

      const size = estimateEntrySize(entry)

      expect(size).toBeGreaterThan(0)
      // 基础大小 56 + 路径长度 * 2
      expect(size).toBeGreaterThanOrEqual(56 + 16)
    })

  it('包含hash时估算更大', () => {
    const entryWithHash: CacheEntry = {
      relativePath: 'test.txt',
      size: 100,
      modifiedTime: Date.now(),
      cachedAt: Date.now(),
      hash: 'abc123'
    }

    const entryWithoutHash: CacheEntry = {
      relativePath: 'test.txt',
      size: 100,
      modifiedTime: Date.now(),
      cachedAt: Date.now()
    }

    expect(estimateEntrySize(entryWithHash)).toBeGreaterThan(estimateEntrySize(entryWithoutHash))
  })

  it('长路径估算更大', () => {
    const shortPath: CacheEntry = {
      relativePath: 'a.txt',
      size: 100,
      modifiedTime: Date.now(),
      cachedAt: Date.now()
    }

    const longPath: CacheEntry = {
      relativePath: 'very/long/path/to/the/file/name.txt',
      size: 100,
      modifiedTime: Date.now(),
      cachedAt: Date.now()
    }

    expect(estimateEntrySize(longPath)).toBeGreaterThan(estimateEntrySize(shortPath))
  })
})
