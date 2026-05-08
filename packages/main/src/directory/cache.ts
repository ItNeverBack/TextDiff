/**
 * 目录扫描缓存系统
 * 缓存目录扫描结果以提高重复扫描的性能
 */
import * as crypto from 'crypto';

// ============================================
// 缓存条目
// ============================================
export interface CacheEntry {
  /** 相对路径 */
  relativePath: string;
  /** 文件大小 */
  size: number;
  /** 修改时间 */
  modifiedTime: number;
  /** 文件哈希（可选） */
  hash?: string;
  /** 缓存时间 */
  cachedAt: number;
}

// ============================================
// 目录缓存
// ============================================
export interface DirectoryCache {
  /** 根目录路径 */
  rootPath: string;
  /** 缓存条目映射 */
  entries: Map<string, CacheEntry>;
  /** 最后扫描时间 */
  lastScan: number;
  /** 总文件数 */
  totalFiles: number;
  /** 总大小 */
  totalSize: number;
}

// ============================================
// 缓存配置
// ============================================
export interface CacheConfig {
  /** 最大缓存条目数 */
  maxEntries?: number;
  /** TTL（毫秒） */
  ttl?: number;
  /** 是否启用缓存 */
  enabled?: boolean;
}

// ============================================
// 缓存管理器
// ============================================
export class DirectoryCacheManager {
  private caches = new Map<string, DirectoryCache>();
  private config: Required<CacheConfig>;

  constructor(config: CacheConfig = {}) {
    this.config = {
      maxEntries: config.maxEntries || 10000,
      ttl: config.ttl || 60 * 60 * 1000, // 1小时
      enabled: config.enabled !== false
    };
  }

  // ============================================
  // 缓存操作
  // ============================================

  /**
   * 获取或创建缓存
   */
  getCache(rootPath: string): DirectoryCache | undefined {
    if (!this.config.enabled) return undefined;

    const cache = this.caches.get(rootPath);
    if (!cache) return undefined;

    // 检查 TTL
    if (Date.now() - cache.lastScan > this.config.ttl) {
      this.caches.delete(rootPath);
      return undefined;
    }

    return cache;
  }

  /**
   * 创建新缓存
   */
  createCache(rootPath: string): DirectoryCache {
    const cache: DirectoryCache = {
      rootPath,
      entries: new Map(),
      lastScan: Date.now(),
      totalFiles: 0,
      totalSize: 0
    };
    this.caches.set(rootPath, cache);
    return cache;
  }

  /**
   * 更新缓存条目
   */
  setEntry(cache: DirectoryCache, entry: CacheEntry): void {
    // 检查容量限制
    if (cache.entries.size >= this.config.maxEntries) {
      this.evictOldest(cache);
    }

    cache.entries.set(entry.relativePath, entry);
  }

  /**
   * 获取缓存条目
   */
  getEntry(cache: DirectoryCache, relativePath: string): CacheEntry | undefined {
    return cache.entries.get(relativePath);
  }

  /**
   * 删除缓存条目
   */
  deleteEntry(cache: DirectoryCache, relativePath: string): boolean {
    return cache.entries.delete(relativePath);
  }

  /**
   * 检查条目是否有效
   */
  isEntryValid(entry: CacheEntry, currentModifiedTime: number): boolean {
    // 检查修改时间是否变化
    return entry.modifiedTime === currentModifiedTime;
  }

  // ============================================
  // 缓存清理
  // ============================================

  /**
   * 驱逐最旧的条目
   */
  private evictOldest(cache: DirectoryCache): void {
    const entries = Array.from(cache.entries.entries());
    if (entries.length === 0) return;

    // 按缓存时间排序，删除最旧的 10%
    entries.sort((a, b) => a[1].cachedAt - b[1].cachedAt);
    const toDelete = Math.ceil(entries.length * 0.1);

    for (let i = 0; i < toDelete; i++) {
      cache.entries.delete(entries[i][0]);
    }
  }

  /**
   * 清理过期缓存 - 增强版，支持条目级 TTL 和渐进式清理
   */
  cleanExpired(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [rootPath, cache] of this.caches) {
      // 检查整个缓存的 TTL
      if (now - cache.lastScan > this.config.ttl) {
        this.caches.delete(rootPath);
        cleaned++;
        continue;
      }

      // 检查单个条目的 TTL（条目缓存时间超过 TTL 的 50% 时清理）
      const entryTTL = this.config.ttl * 0.5;
      const expiredEntries: string[] = [];

      for (const [entryPath, entry] of cache.entries) {
        if (now - entry.cachedAt > entryTTL) {
          expiredEntries.push(entryPath);
        }
      }

      // 删除过期条目
      for (const entryPath of expiredEntries) {
        cache.entries.delete(entryPath);
        cleaned++;
      }

      // 如果清理后条目过少，更新统计
      if (cache.entries.size === 0) {
        cache.totalFiles = 0;
        cache.totalSize = 0;
      }
    }

    return cleaned;
  }

  /**
   * 渐进式清理 - 当内存压力高时调用
   * 清理最旧的缓存条目，直到达到目标内存使用量
   */
  cleanupGradual(targetMemoryPercent: number = 70): number {
    const stats = this.getStats();
    const currentMemoryPercent = this.getMemoryUsagePercent();

    if (currentMemoryPercent <= targetMemoryPercent) {
      return 0;
    }

    let cleaned = 0;
    const targetMemory = (stats.memoryEstimate * targetMemoryPercent) / currentMemoryPercent;
    let currentMemory = stats.memoryEstimate;

    // 按最后访问时间排序（最旧的优先清理）
    const sortedCaches = Array.from(this.caches.entries())
      .sort((a, b) => a[1].lastScan - b[1].lastScan);

    for (const [rootPath, cache] of sortedCaches) {
      if (currentMemory <= targetMemory) break;

      // 计算此缓存的内存占用
      // 如果缓存较旧，清理单个条目
      const entriesArray = Array.from(cache.entries.entries())
        .sort((a, b) => a[1].cachedAt - b[1].cachedAt);

      for (const [entryPath, _entry] of entriesArray) {
        if (currentMemory <= targetMemory) break;

        cache.entries.delete(entryPath);
        currentMemory -= 200;
        cleaned++;
      }

      // 如果缓存为空，删除整个缓存
      if (cache.entries.size === 0) {
        this.caches.delete(rootPath);
      }
    }

    return cleaned;
  }

  /**
   * 获取内存使用百分比（估算）
   */
  getMemoryUsagePercent(): number {
    const stats = this.getStats();
    // 假设最大可用内存为 500MB
    const maxMemory = 500 * 1024 * 1024;
    return (stats.memoryEstimate / maxMemory) * 100;
  }

  /**
   * 清除指定缓存
   */
  clearCache(rootPath: string): boolean {
    return this.caches.delete(rootPath);
  }

  /**
   * 清除所有缓存
   */
  clearAll(): void {
    this.caches.clear();
  }

  // ============================================
  // 统计信息
  // ============================================

  /**
   * 获取缓存统计
   */
  getStats(): {
    totalCaches: number;
    totalEntries: number;
    memoryEstimate: number;
  } {
    let totalEntries = 0;
    for (const cache of this.caches.values()) {
      totalEntries += cache.entries.size;
    }

    // 估算内存使用（每个条目约 200 字节）
    const memoryEstimate = totalEntries * 200;

    return {
      totalCaches: this.caches.size,
      totalEntries,
      memoryEstimate
    };
  }

  /**
   * 获取特定缓存的统计
   */
  getCacheStats(rootPath: string): {
    exists: boolean;
    entries: number;
    age: number;
  } {
    const cache = this.caches.get(rootPath);
    if (!cache) {
      return { exists: false, entries: 0, age: 0 };
    }

    return {
      exists: true,
      entries: cache.entries.size,
      age: Date.now() - cache.lastScan
    };
  }
}

// ============================================
// 单例实例
// ============================================
let cacheManager: DirectoryCacheManager | null = null;

export function getCacheManager(config?: CacheConfig): DirectoryCacheManager {
  if (!cacheManager) {
    cacheManager = new DirectoryCacheManager(config);
  }
  return cacheManager;
}

export function resetCacheManager(): void {
  cacheManager?.clearAll();
  cacheManager = null;
}

// ============================================
// 辅助函数
// ============================================

/**
 * 生成缓存键
 */
export function generateCacheKey(relativePath: string, size: number, modifiedTime: number): string {
  return crypto
    .createHash('md5')
    .update(`${relativePath}:${size}:${modifiedTime}`)
    .digest('hex');
}

/**
 * 估算条目大小
 */
export function estimateEntrySize(entry: CacheEntry): number {
  // 基础大小 + 字符串长度
  return 56 + entry.relativePath.length * 2 + (entry.hash ? entry.hash.length * 2 : 0);
}
