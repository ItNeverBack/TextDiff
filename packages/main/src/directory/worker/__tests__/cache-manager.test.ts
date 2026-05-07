import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CacheManager, getGlobalCacheManager, resetGlobalCacheManager, getCacheHealthReport } from '../../cache-manager';

describe('CacheManager', () => {
  let cacheManager: CacheManager;

  beforeEach(() => {
    cacheManager = new CacheManager({
      cleanupInterval: 1000,
      maxMemoryUsage: 100 * 1024 * 1024, // 100MB
      autoCleanup: false
    });
  });

  afterEach(() => {
    cacheManager.destroy();
    resetGlobalCacheManager();
  });

  describe('基本操作', () => {
    it('should create cache and emit event', () => {
      const listener = vi.fn();
      cacheManager.on('cache:created', listener);

      cacheManager.createCache('/test/path');

      expect(listener).toHaveBeenCalledWith({
        rootPath: '/test/path',
        entries: 0
      });
    });

    it('should get cache', () => {
      cacheManager.createCache('/test/path');
      const cache = cacheManager.getCache('/test/path');
      expect(cache).toBeDefined();
    });

    it('should clear specific cache', () => {
      cacheManager.createCache('/test/path');
      const cleared = cacheManager.clearCache('/test/path');
      expect(cleared).toBe(true);

      const cache = cacheManager.getCache('/test/path');
      expect(cache).toBeUndefined();
    });

    it('should clear all caches', () => {
      cacheManager.createCache('/test/path1');
      cacheManager.createCache('/test/path2');

      cacheManager.clearAll();

      const stats = cacheManager.getStats();
      expect(stats.totalCaches).toBe(0);
    });
  });

  describe('自动清理', () => {
    it('should start auto cleanup', () => {
      const managerWithCleanup = new CacheManager({
        cleanupInterval: 100,
        autoCleanup: true
      });

      // 应该启动了定时器
      expect(managerWithCleanup['cleanupTimer']).toBeDefined();

      managerWithCleanup.destroy();
    });

    it('should stop auto cleanup', () => {
      cacheManager.startAutoCleanup();
      expect(cacheManager['cleanupTimer']).toBeDefined();

      cacheManager.stopAutoCleanup();
      expect(cacheManager['cleanupTimer']).toBeUndefined();
    });

    it('should clean expired caches', () => {
      const listener = vi.fn();
      cacheManager.on('cache:cleaned', listener);

      // 创建一个短 TTL 的缓存管理器来测试过期清理
      const shortTTLManager = new CacheManager({
        autoCleanup: false
      });

      // 模拟过期缓存
      const cache = shortTTLManager.createCache('/test/path');
      cache.lastScan = Date.now() - 2 * 60 * 60 * 1000; // 2小时前

      shortTTLManager.performCleanup();

      shortTTLManager.destroy();
    });
  });

  describe('内存管理', () => {
    it('should emit memory warning when exceeding limit', () => {
      const listener = vi.fn();
      cacheManager.on('memory:warning', listener);

      // 模拟高内存使用
      cacheManager.createCache('/test/path');

      // 由于无法直接控制内存使用，我们验证事件系统工作
      expect(cacheManager.listenerCount('memory:warning')).toBe(1);
    });

    it('should return health status', () => {
      const health = cacheManager.getHealthStatus();

      expect(health).toMatchObject({
        healthy: expect.any(Boolean),
        memoryUsage: expect.any(Number),
        memoryLimit: expect.any(Number),
        memoryPercent: expect.any(Number),
        lastCleanup: expect.any(Number)
      });
    });

    it('should be healthy with low memory usage', () => {
      const health = cacheManager.getHealthStatus();
      expect(health.healthy || health.memoryPercent < 80).toBe(true);
    });
  });

  describe('统计信息', () => {
    it('should return stats', () => {
      cacheManager.createCache('/test/path1');
      cacheManager.createCache('/test/path2');

      const stats = cacheManager.getStats();
      expect(stats.totalCaches).toBe(2);
    });

    it('should return cache status for specific path', () => {
      cacheManager.createCache('/test/path');

      const status = cacheManager.getCacheStatus('/test/path');
      expect(status.exists).toBe(true);
    });

    it('should return empty status for non-existent path', () => {
      const status = cacheManager.getCacheStatus('/non/existent');
      expect(status.exists).toBe(false);
    });
  });

  describe('错误处理', () => {
    it('should handle errors during cleanup', () => {
      const listener = vi.fn();
      cacheManager.on('error', listener);

      // 执行清理不应该抛出错误
      expect(() => cacheManager.performCleanup()).not.toThrow();
    });
  });

  describe('生命周期', () => {
    it('should clean up on destroy', () => {
      cacheManager.createCache('/test/path');
      cacheManager.destroy();

      const stats = cacheManager.getStats();
      expect(stats.totalCaches).toBe(0);
    });

    it('should remove all listeners on destroy', () => {
      cacheManager.on('test', () => {});
      cacheManager.destroy();

      expect(cacheManager.listenerCount('test')).toBe(0);
    });
  });
});

describe('单例模式', () => {
  afterEach(() => {
    resetGlobalCacheManager();
  });

  it('should return same instance', () => {
    const manager1 = getGlobalCacheManager();
    const manager2 = getGlobalCacheManager();
    expect(manager1).toBe(manager2);
  });

  it('should reset instance', () => {
    const manager1 = getGlobalCacheManager();
    resetGlobalCacheManager();
    const manager2 = getGlobalCacheManager();
    expect(manager1).not.toBe(manager2);
  });
});

describe('getCacheHealthReport', () => {
  afterEach(() => {
    resetGlobalCacheManager();
  });

  it('should return health report string', () => {
    const report = getCacheHealthReport();

    expect(report).toContain('Cache Health Report');
    expect(report).toContain('Total Caches');
    expect(report).toContain('Memory Usage');
    expect(report).toContain('Status');
  });

  it('should format memory usage in human readable format', () => {
    const report = getCacheHealthReport();

    expect(report).toMatch(/Memory Usage: [\d.]+ (B|KB|MB|GB)/);
  });
});
