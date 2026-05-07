import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  DirectoryCacheManager,
  CacheEntry,
  getCacheManager,
  resetCacheManager,
  generateCacheKey
} from '../../cache';

describe('DirectoryCacheManager', () => {
  let cacheManager: DirectoryCacheManager;

  beforeEach(() => {
    cacheManager = new DirectoryCacheManager({ enabled: true });
  });

  afterEach(() => {
    resetCacheManager();
  });

  describe('基本操作', () => {
    it('should create cache', () => {
      const cache = cacheManager.createCache('/test/path');
      expect(cache.rootPath).toBe('/test/path');
      expect(cache.entries.size).toBe(0);
      expect(cache.lastScan).toBeGreaterThan(0);
    });

    it('should get cache', () => {
      cacheManager.createCache('/test/path');
      const cache = cacheManager.getCache('/test/path');
      expect(cache).toBeDefined();
      expect(cache?.rootPath).toBe('/test/path');
    });

    it('should return undefined for non-existent cache', () => {
      const cache = cacheManager.getCache('/non/existent');
      expect(cache).toBeUndefined();
    });

    it('should set and get entry', () => {
      const cache = cacheManager.createCache('/test/path');
      const entry: CacheEntry = {
        relativePath: 'test.txt',
        size: 100,
        modifiedTime: Date.now(),
        cachedAt: Date.now()
      };

      cacheManager.setEntry(cache, entry);
      const retrieved = cacheManager.getEntry(cache, 'test.txt');
      expect(retrieved).toEqual(entry);
    });

    it('should delete entry', () => {
      const cache = cacheManager.createCache('/test/path');
      const entry: CacheEntry = {
        relativePath: 'test.txt',
        size: 100,
        modifiedTime: Date.now(),
        cachedAt: Date.now()
      };

      cacheManager.setEntry(cache, entry);
      const deleted = cacheManager.deleteEntry(cache, 'test.txt');
      expect(deleted).toBe(true);

      const retrieved = cacheManager.getEntry(cache, 'test.txt');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('TTL 过期', () => {
    it('should return undefined for expired cache', () => {
      const cacheManagerWithShortTTL = new DirectoryCacheManager({
        ttl: 1, // 1ms TTL
        enabled: true
      });

      cacheManagerWithShortTTL.createCache('/test/path');

      // 等待过期
      setTimeout(() => {
        const cache = cacheManagerWithShortTTL.getCache('/test/path');
        expect(cache).toBeUndefined();
      }, 10);
    });

    it('should clean expired caches', () => {
      const cacheManagerWithShortTTL = new DirectoryCacheManager({
        ttl: 1,
        enabled: true
      });

      cacheManagerWithShortTTL.createCache('/test/path1');
      cacheManagerWithShortTTL.createCache('/test/path2');

      // 等待过期
      setTimeout(() => {
        const cleaned = cacheManagerWithShortTTL.cleanExpired();
        expect(cleaned).toBe(2);
      }, 10);
    });
  });

  describe('容量限制', () => {
    it('should evict oldest entries when exceeding max entries', () => {
      const cacheManagerWithLimit = new DirectoryCacheManager({
        maxEntries: 3,
        enabled: true
      });

      const cache = cacheManagerWithLimit.createCache('/test/path');

      // 添加超过限制的条目
      for (let i = 0; i < 5; i++) {
        const entry: CacheEntry = {
          relativePath: `file${i}.txt`,
          size: 100,
          modifiedTime: Date.now(),
          cachedAt: Date.now() + i // 不同的缓存时间
        };
        cacheManagerWithLimit.setEntry(cache, entry);
      }

      // 应该只保留最新的 90% (大约 2-3 个)
      expect(cache.entries.size).toBeLessThanOrEqual(3);
    });
  });

  describe('统计信息', () => {
    it('should return correct stats', () => {
      const cache1 = cacheManager.createCache('/test/path1');
      const cache2 = cacheManager.createCache('/test/path2');

      const entry: CacheEntry = {
        relativePath: 'test.txt',
        size: 100,
        modifiedTime: Date.now(),
        cachedAt: Date.now()
      };

      cacheManager.setEntry(cache1, entry);
      cacheManager.setEntry(cache2, entry);

      const stats = cacheManager.getStats();
      expect(stats.totalCaches).toBe(2);
      expect(stats.totalEntries).toBe(2);
      expect(stats.memoryEstimate).toBeGreaterThan(0);
    });

    it('should return cache stats for specific path', () => {
      const cache = cacheManager.createCache('/test/path');
      const entry: CacheEntry = {
        relativePath: 'test.txt',
        size: 100,
        modifiedTime: Date.now(),
        cachedAt: Date.now()
      };
      cacheManager.setEntry(cache, entry);

      const stats = cacheManager.getCacheStats('/test/path');
      expect(stats.exists).toBe(true);
      expect(stats.entries).toBe(1);
      expect(stats.age).toBeGreaterThanOrEqual(0);
    });

    it('should return empty stats for non-existent cache', () => {
      const stats = cacheManager.getCacheStats('/non/existent');
      expect(stats.exists).toBe(false);
      expect(stats.entries).toBe(0);
    });
  });

  describe('禁用缓存', () => {
    it('should return undefined when cache is disabled', () => {
      const disabledManager = new DirectoryCacheManager({ enabled: false });
      disabledManager.createCache('/test/path');

      const cache = disabledManager.getCache('/test/path');
      expect(cache).toBeUndefined();
    });
  });

  describe('清除缓存', () => {
    it('should clear specific cache', () => {
      cacheManager.createCache('/test/path1');
      cacheManager.createCache('/test/path2');

      const cleared = cacheManager.clearCache('/test/path1');
      expect(cleared).toBe(true);

      const stats = cacheManager.getStats();
      expect(stats.totalCaches).toBe(1);
    });

    it('should clear all caches', () => {
      cacheManager.createCache('/test/path1');
      cacheManager.createCache('/test/path2');

      cacheManager.clearAll();

      const stats = cacheManager.getStats();
      expect(stats.totalCaches).toBe(0);
    });
  });

  describe('条目验证', () => {
    it('should detect unchanged entry', () => {
      const entry: CacheEntry = {
        relativePath: 'test.txt',
        size: 100,
        modifiedTime: 1234567890,
        cachedAt: Date.now()
      };

      const isValid = cacheManager.isEntryValid(entry, 1234567890);
      expect(isValid).toBe(true);
    });

    it('should detect changed entry', () => {
      const entry: CacheEntry = {
        relativePath: 'test.txt',
        size: 100,
        modifiedTime: 1234567890,
        cachedAt: Date.now()
      };

      const isValid = cacheManager.isEntryValid(entry, 9876543210);
      expect(isValid).toBe(false);
    });
  });
});

describe('缓存辅助函数', () => {
  describe('generateCacheKey', () => {
    it('should generate consistent keys for same input', () => {
      const key1 = generateCacheKey('test.txt', 100, 1234567890);
      const key2 = generateCacheKey('test.txt', 100, 1234567890);
      expect(key1).toBe(key2);
    });

    it('should generate different keys for different input', () => {
      const key1 = generateCacheKey('test1.txt', 100, 1234567890);
      const key2 = generateCacheKey('test2.txt', 100, 1234567890);
      expect(key1).not.toBe(key2);
    });
  });
});

describe('单例模式', () => {
  afterEach(() => {
    resetCacheManager();
  });

  it('should return same instance', () => {
    const manager1 = getCacheManager();
    const manager2 = getCacheManager();
    expect(manager1).toBe(manager2);
  });

  it('should reset instance', () => {
    const manager1 = getCacheManager();
    resetCacheManager();
    const manager2 = getCacheManager();
    expect(manager1).not.toBe(manager2);
  });
});
