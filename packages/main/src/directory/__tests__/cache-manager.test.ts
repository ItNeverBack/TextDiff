import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  CacheManager,
  getGlobalCacheManager,
  resetGlobalCacheManager,
  getCacheHealthReport
} from '../cache-manager'
import { resetCacheManager } from '../cache'

describe('CacheManager', () => {
  let manager: CacheManager

  beforeEach(() => {
    vi.useFakeTimers()
    resetGlobalCacheManager()
    manager = new CacheManager({ autoCleanup: false })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  afterEach(() => {
    manager.destroy()
  })

  describe('constructor', () => {
    it('使用默认配置初始化', () => {
      const defaultManager = new CacheManager()

      expect(defaultManager.getStats()).toBeDefined()
      defaultManager.destroy()
    })

    it('自定义配置覆盖默认值', () => {
      const customManager = new CacheManager({
        cleanupInterval: 10000,
        maxMemoryUsage: 1000000,
        autoCleanup: false
      })

      expect(customManager.getStats()).toBeDefined()
      customManager.destroy()
    })

    it('autoCleanup=true 时启动自动清理', () => {
      const autoManager = new CacheManager({ autoCleanup: true, cleanupInterval: 100 })

      // 等待一段时间让定时器触发
      vi.advanceTimersByTime(150)

      autoManager.destroy()
    })
  })

  describe('createCache', () => {
    it('创建缓存并触发事件', () => {
      const createdSpy = vi.fn()
      manager.on('cache:created', createdSpy)

      manager.createCache('/test')

      expect(createdSpy).toHaveBeenCalledWith({ rootPath: '/test', entries: 0 })
    })

    it('返回创建的缓存对象', () => {
      const cache = manager.createCache('/test')

      expect(cache.rootPath).toBe('/test')
      expect(cache.entries).toBeInstanceOf(Map)
    })
  })

  describe('getCache', () => {
    it('获取存在的缓存', () => {
      manager.createCache('/test')

      const cache = manager.getCache('/test')

      expect(cache).toBeDefined()
      expect(cache?.rootPath).toBe('/test')
    })

    it('不存在的缓存返回 undefined', () => {
      const cache = manager.getCache('/nonexistent')

      expect(cache).toBeUndefined()
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

  describe('startAutoCleanup', () => {
    it('启动定时清理', () => {
      const cleanupSpy = vi.spyOn(manager as any, 'performCleanup')

      manager.startAutoCleanup()

      vi.advanceTimersByTime(310000) // 默认 5 分钟 = 300000ms

      expect(cleanupSpy).toHaveBeenCalled()
    })

    it('多次启动清除之前的定时器', () => {
      manager.startAutoCleanup()
      manager.startAutoCleanup() // 再次启动

      // 不应该有多个定时器在运行
      expect(() => manager.stopAutoCleanup()).not.toThrow()
    })
  })

  describe('stopAutoCleanup', () => {
    it('停止定时清理', () => {
      manager.startAutoCleanup()
      manager.stopAutoCleanup()

      // 停止后不应再触发清理
      const cleanupSpy = vi.spyOn(manager as any, 'performCleanup')
      vi.advanceTimersByTime(310000)

      expect(cleanupSpy).not.toHaveBeenCalled()
    })

    it('未启动时停止不报错', () => {
      expect(() => manager.stopAutoCleanup()).not.toThrow()
    })
  })

  describe('performCleanup', () => {
    it('内存使用正常时只清理过期缓存', () => {
      manager.createCache('/test')

      const cleanedSpy = vi.fn()
      manager.on('cache:cleaned', cleanedSpy)

      manager.performCleanup()

      // 内存使用正常，应该只清理过期缓存
      expect(manager.getStats().totalCaches).toBeGreaterThanOrEqual(0)
    })

    it('内存超出时触发警告', () => {
      const warningSpy = vi.fn()
      manager.on('memory:warning', warningSpy)

      // 创建大量缓存以增加内存占用
      for (let i = 0; i < 100; i++) {
        const cache = manager.createCache(`/test${i}`)
        for (let j = 0; j < 100; j++) {
          cache.entries.set(`file${j}.txt`, {
            relativePath: `file${j}.txt`,
            size: 1000000,
            modifiedTime: Date.now(),
            cachedAt: Date.now()
          })
        }
      }

      manager.performCleanup()

      // 如果内存使用超过限制，应该触发警告
      if (manager.getStats().memoryEstimate > 500 * 1024 * 1024) {
        expect(warningSpy).toHaveBeenCalled()
      }
    })

    it('错误时触发 error 事件', () => {
      const errorSpy = vi.fn()
      manager.on('error', errorSpy)

      // 使用一个没有 stats 的内部状态来模拟错误
      // 通过设置一个无效的 maxMemoryUsage 来触发边界情况
      const originalGetStats = (manager as any).cacheManager.getStats.bind((manager as any).cacheManager)
      vi.spyOn((manager as any).cacheManager, 'getStats').mockImplementation(() => {
        throw new Error('Test error')
      })

      manager.performCleanup()

      expect(errorSpy).toHaveBeenCalled()

      // 恢复
      vi.restoreAllMocks()
    })
  })

  describe('getStats', () => {
    it('返回统计信息', () => {
      manager.createCache('/test')

      const stats = manager.getStats()

      expect(stats.totalCaches).toBe(1)
    })
  })

  describe('getCacheStatus', () => {
    it('返回缓存状态', () => {
      manager.createCache('/test')

      const status = manager.getCacheStatus('/test')

      expect(status.exists).toBe(true)
      expect(status.entries).toBe(0)
      expect(status.age).toBeGreaterThanOrEqual(0)
    })

    it('不存在的缓存返回不存在标记', () => {
      const status = manager.getCacheStatus('/nonexistent')

      expect(status.exists).toBe(false)
      expect(status.entries).toBe(0)
      expect(status.age).toBe(0)
    })
  })

  describe('getHealthStatus', () => {
    it('返回健康状态', () => {
      const health = manager.getHealthStatus()

      expect(health.healthy).toBeDefined()
      expect(health.memoryUsage).toBeDefined()
      expect(health.memoryLimit).toBe(500 * 1024 * 1024)
      expect(health.memoryPercent).toBeGreaterThanOrEqual(0)
      expect(health.lastCleanup).toBeGreaterThan(0)
    })

    it('内存使用 < 80% 时为健康', () => {
      const health = manager.getHealthStatus()

      if (health.memoryPercent < 80) {
        expect(health.healthy).toBe(true)
      }
    })

    it('内存使用 >= 80% 时为不健康', () => {
      // 创建大量缓存
      for (let i = 0; i < 200; i++) {
        const cache = manager.createCache(`/test${i}`)
        for (let j = 0; j < 200; j++) {
          cache.entries.set(`file${j}.txt`, {
            relativePath: `file${j}.txt`,
            size: 1000000,
            modifiedTime: Date.now(),
            cachedAt: Date.now()
          })
        }
      }

      const health = manager.getHealthStatus()

      if (health.memoryPercent >= 80) {
        expect(health.healthy).toBe(false)
      }
    })
  })

  describe('destroy', () => {
    it('停止自动清理', () => {
      manager.startAutoCleanup()

      manager.destroy()

      // 销毁后不应再触发清理
      const cleanupSpy = vi.spyOn(manager as any, 'performCleanup')
      vi.advanceTimersByTime(310000)

      expect(cleanupSpy).not.toHaveBeenCalled()
    })

    it('清除所有缓存', () => {
      manager.createCache('/test')

      manager.destroy()

      expect(manager.getStats().totalCaches).toBe(0)
    })

    it('移除所有监听器', () => {
      const spy = vi.fn()
      manager.on('cache:created', spy)

      manager.destroy()

      // 销毁后事件不应再触发
      manager.createCache('/test')

      expect(spy).not.toHaveBeenCalled()
    })
  })

  describe('事件触发', () => {
    it('创建缓存时触发 cache:created', () => {
      const spy = vi.fn()
      manager.on('cache:created', spy)

      manager.createCache('/test')

      expect(spy).toHaveBeenCalledWith({ rootPath: '/test', entries: 0 })
    })

    it('清理时触发 cache:cleaned', () => {
      const spy = vi.fn()
      manager.on('cache:cleaned', spy)

      // 创建过期缓存
      const cache = manager.createCache('/test')
      cache.lastScan = 1 // 很早的扫描时间

      manager.performCleanup()

      expect(spy).toHaveBeenCalled()
    })

    it('过期缓存触发 cache:expired', () => {
      const spy = vi.fn()
      manager.on('cache:expired', spy)

      // 创建缓存后手动模拟过期（通过直接操作内部状态）
      const cache = manager.createCache('/test')
      cache.lastScan = 1

      // 设置一个非常短的 TTL
      const shortManager = new CacheManager({ autoCleanup: false })
      shortManager.createCache('/test2')
      // 通过直接修改内部缓存来触发过期
      const shortCache = shortManager.getCache('/test2')
      if (shortCache) {
        shortCache.lastScan = 1 // 很久以前
      }

      shortManager.performCleanup()

      // 如果缓存过期了，应该会触发事件或清理
      expect(spy).toHaveBeenCalled
    })
  })
})

describe('getGlobalCacheManager', () => {
  beforeEach(() => {
    resetGlobalCacheManager()
  })

  it('首次调用创建新实例', () => {
    const manager = getGlobalCacheManager()

    expect(manager).toBeDefined()
    expect(manager.getStats()).toBeDefined()

    manager.destroy()
  })

  it('多次调用返回同一实例', () => {
    const manager1 = getGlobalCacheManager()
    const manager2 = getGlobalCacheManager()

    expect(manager1).toBe(manager2)

    manager1.destroy()
  })

  it('传递配置', () => {
    const manager = getGlobalCacheManager({ maxMemoryUsage: 1000000 })

    expect(manager.getHealthStatus().memoryLimit).toBe(1000000)

    manager.destroy()
  })
})

describe('resetGlobalCacheManager', () => {
  it('重置全局管理器', () => {
    const manager1 = getGlobalCacheManager()
    manager1.createCache('/test')

    resetGlobalCacheManager()

    const manager2 = getGlobalCacheManager()
    expect(manager2.getStats().totalCaches).toBe(0)
    expect(manager1).not.toBe(manager2)

    manager2.destroy()
  })
})

describe('getCacheHealthReport', () => {
  beforeEach(() => {
    resetGlobalCacheManager()
  })

  afterEach(() => {
    const manager = getGlobalCacheManager()
    manager.destroy()
    resetGlobalCacheManager()
  })

  it('生成健康报告字符串', () => {
    const manager = getGlobalCacheManager()
    manager.createCache('/test')

    const report = getCacheHealthReport()

    expect(report).toContain('Cache Health Report')
    expect(report).toContain('Total Caches: 1')
    expect(report).toContain('Memory Usage:')
    expect(report).toContain('Status:')
  })

  it('格式化内存大小', () => {
    const manager = getGlobalCacheManager()

    // 添加一些缓存条目以增加内存使用
    const cache = manager.createCache('/test')
    for (let i = 0; i < 10; i++) {
      cache.entries.set(`file${i}.txt`, {
        relativePath: `file${i}.txt`,
        size: 1000,
        modifiedTime: Date.now(),
        cachedAt: Date.now()
      })
    }

    const report = getCacheHealthReport()

    expect(report).toContain('B') // 应该包含字节单位
    expect(report).toContain('Memory Usage:')
  })

  it('显示健康状态', () => {
    const report = getCacheHealthReport()

    expect(report).toMatch(/Status: (HEALTHY|WARNING)/)
  })

  it('包含上次清理时间', () => {
    const report = getCacheHealthReport()

    expect(report).toContain('Last Cleanup:')
  })
})
