/**
 * 缓存管理器
 * 管理目录扫描缓存的生命周期和清理策略
 */
import { DirectoryCacheManager, getCacheManager, resetCacheManager } from './cache';
import { EventEmitter } from 'events';

// ============================================
// 缓存管理器配置
// ============================================
export interface CacheManagerConfig {
  /** 自动清理间隔（毫秒） */
  cleanupInterval?: number;
  /** 最大内存使用（字节） */
  maxMemoryUsage?: number;
  /** 是否启用自动清理 */
  autoCleanup?: boolean;
}

// ============================================
// 缓存事件
// ============================================
export interface CacheManagerEvents {
  'cache:created': { rootPath: string; entries: number };
  'cache:updated': { rootPath: string; entries: number };
  'cache:expired': { rootPath: string; age: number };
  'cache:cleaned': { count: number };
  'memory:warning': { usage: number; maxUsage: number };
  'error': { error: Error };
}

// ============================================
// 增强型缓存管理器
// ============================================
export class CacheManager extends EventEmitter {
  private cacheManager: DirectoryCacheManager;
  private config: Required<CacheManagerConfig>;
  private cleanupTimer?: NodeJS.Timeout;
  private lastCleanup = Date.now();

  constructor(config: CacheManagerConfig = {}) {
    super();
    this.config = {
      cleanupInterval: config.cleanupInterval || 5 * 60 * 1000, // 5分钟
      maxMemoryUsage: config.maxMemoryUsage || 500 * 1024 * 1024, // 500MB
      autoCleanup: config.autoCleanup !== false
    };

    this.cacheManager = getCacheManager();

    if (this.config.autoCleanup) {
      this.startAutoCleanup();
    }
  }

  // ============================================
  // 缓存管理
  // ============================================

  /**
   * 创建或获取缓存
   */
  createCache(rootPath: string) {
    const cache = this.cacheManager.createCache(rootPath);
    this.emit('cache:created', { rootPath, entries: 0 });
    return cache;
  }

  /**
   * 获取缓存
   */
  getCache(rootPath: string) {
    return this.cacheManager.getCache(rootPath);
  }

  /**
   * 清除指定缓存
   */
  clearCache(rootPath: string): boolean {
    return this.cacheManager.clearCache(rootPath);
  }

  /**
   * 清除所有缓存
   */
  clearAll(): void {
    this.cacheManager.clearAll();
  }

  // ============================================
  // 自动清理
  // ============================================

  /**
   * 启动自动清理
   */
  startAutoCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.performCleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * 停止自动清理
   */
  stopAutoCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * 执行清理 - 增强版，使用渐进式清理策略
   */
  performCleanup(): void {
    try {
      const stats = this.cacheManager.getStats();
      // 检查内存使用
      if (stats.memoryEstimate > this.config.maxMemoryUsage) {
        this.emit('memory:warning', {
          usage: stats.memoryEstimate,
          maxUsage: this.config.maxMemoryUsage
        });

        // 第一步：清理过期缓存
        const expiredCleaned = this.cacheManager.cleanExpired();
        if (expiredCleaned > 0) {
          this.emit('cache:cleaned', { count: expiredCleaned });
        }

        // 第二步：如果仍然超出限制，使用渐进式清理
        const newStats = this.cacheManager.getStats();
        if (newStats.memoryEstimate > this.config.maxMemoryUsage) {
          const targetPercent = 70; // 清理到 70% 的目标
          const gradualCleaned = this.cacheManager.cleanupGradual(targetPercent);
          if (gradualCleaned > 0) {
            this.emit('cache:cleaned', { count: gradualCleaned });
          }
        }

        // 第三步：如果仍然超出限制，清理最旧的完整缓存
        const finalStats = this.cacheManager.getStats();
        if (finalStats.memoryEstimate > this.config.maxMemoryUsage) {
          this.cleanupOldestCache();
        }
      } else {
        // 定期清理过期缓存
        const cleaned = this.cacheManager.cleanExpired();
        if (cleaned > 0) {
          this.emit('cache:cleaned', { count: cleaned });
        }
      }

      this.lastCleanup = Date.now();
    } catch (error) {
      this.emit('error', {
        error: error instanceof Error ? error : new Error(String(error))
      });
    }
  }

  /**
   * 清理最旧的缓存
   */
  private cleanupOldestCache(): void {
    // 找到最旧的缓存并删除
    // 需要遍历所有缓存，这里简化处理
    // 实际实现应该在 DirectoryCacheManager 中添加 getOldestCache 方法
    const stats = this.cacheManager.getStats();
    if (stats.totalCaches > 0) {
      // 如果清理单个缓存不够，清理所有
      this.cacheManager.clearAll();
      this.emit('cache:cleaned', { count: stats.totalCaches });
    }
  }

  // ============================================
  // 统计和监控
  // ============================================

  /**
   * 获取统计信息
   */
  getStats() {
    return this.cacheManager.getStats();
  }

  /**
   * 获取缓存状态
   */
  getCacheStatus(rootPath: string) {
    return this.cacheManager.getCacheStats(rootPath);
  }

  /**
   * 获取健康状态
   */
  getHealthStatus(): {
    healthy: boolean;
    memoryUsage: number;
    memoryLimit: number;
    memoryPercent: number;
    lastCleanup: number;
  } {
    const stats = this.cacheManager.getStats();
    const memoryPercent = (stats.memoryEstimate / this.config.maxMemoryUsage) * 100;

    return {
      healthy: memoryPercent < 80,
      memoryUsage: stats.memoryEstimate,
      memoryLimit: this.config.maxMemoryUsage,
      memoryPercent,
      lastCleanup: this.lastCleanup
    };
  }

  // ============================================
  // 生命周期
  // ============================================

  /**
   * 销毁管理器
   */
  destroy(): void {
    this.stopAutoCleanup();
    this.clearAll();
    this.removeAllListeners();
  }
}

// ============================================
// 单例实例
// ============================================
let cacheManagerInstance: CacheManager | null = null;

export function getGlobalCacheManager(config?: CacheManagerConfig): CacheManager {
  if (!cacheManagerInstance) {
    cacheManagerInstance = new CacheManager(config);
  }
  return cacheManagerInstance;
}

export function resetGlobalCacheManager(): void {
  cacheManagerInstance?.destroy();
  cacheManagerInstance = null;
  resetCacheManager();
}

// ============================================
// 便捷函数
// ============================================

/**
 * 获取缓存健康报告
 */
export function getCacheHealthReport(): string {
  const manager = getGlobalCacheManager();
  const stats = manager.getStats();
  const health = manager.getHealthStatus();

  const lines = [
    '=== Cache Health Report ===',
    `Total Caches: ${stats.totalCaches}`,
    `Total Entries: ${stats.totalEntries}`,
    `Memory Usage: ${formatBytes(stats.memoryEstimate)}`,
    `Memory Limit: ${formatBytes(health.memoryLimit)}`,
    `Memory Usage: ${health.memoryPercent.toFixed(1)}%`,
    `Status: ${health.healthy ? 'HEALTHY' : 'WARNING'}`,
    `Last Cleanup: ${new Date(health.lastCleanup).toISOString()}`,
    '==========================='
  ];

  return lines.join('\n');
}

/**
 * 格式化字节数
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
