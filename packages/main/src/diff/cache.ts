import type { DiffResult, DiffOptions, FileInfo } from '@shared/types'
import { computeDiff as computeDiffOriginal } from './index'

/**
 * Diff 计算缓存项
 */
interface CacheEntry {
  result: DiffResult
  timestamp: number
  leftHash: string
  rightHash: string
  optionsHash: string
}

/**
 * Diff 计算缓存管理器
 * §Week 12 性能优化：Diff 计算结果缓存
 */
class DiffCache {
  private cache: Map<string, CacheEntry> = new Map()
  private maxSize: number
  private ttl: number // 缓存过期时间（毫秒）

  constructor(maxSize = 50, ttl = 5 * 60 * 1000) {
    this.maxSize = maxSize
    this.ttl = ttl
  }

  /**
   * 生成缓存键
   */
  private generateKey(
    leftContent: string,
    rightContent: string,
    options: DiffOptions
  ): string {
    const leftHash = this.simpleHash(leftContent)
    const rightHash = this.simpleHash(rightContent)
    const optionsHash = this.simpleHash(JSON.stringify(options))
    return `${leftHash}-${rightHash}-${optionsHash}`
  }

  /**
   * 简单的字符串哈希函数
   */
  private simpleHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return hash.toString(36)
  }

  /**
   * 获取缓存的 diff 结果
   */
  get(
    leftContent: string,
    rightContent: string,
    options: DiffOptions
  ): DiffResult | null {
    const key = this.generateKey(leftContent, rightContent, options)
    const entry = this.cache.get(key)

    if (!entry) return null

    // 检查是否过期
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key)
      return null
    }

    // 验证内容哈希是否匹配（防止碰撞）
    const leftHash = this.simpleHash(leftContent)
    const rightHash = this.simpleHash(rightContent)
    const optionsHash = this.simpleHash(JSON.stringify(options))

    if (
      entry.leftHash !== leftHash ||
      entry.rightHash !== rightHash ||
      entry.optionsHash !== optionsHash
    ) {
      this.cache.delete(key)
      return null
    }

    console.log('[DiffCache] Cache hit:', key)
    return entry.result
  }

  /**
   * 缓存 diff 结果
   */
  set(
    leftContent: string,
    rightContent: string,
    options: DiffOptions,
    result: DiffResult
  ): void {
    // 清理过期项
    this.cleanup()

    // 如果缓存已满，删除最旧的项
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) {
        this.cache.delete(oldestKey)
      }
    }

    const key = this.generateKey(leftContent, rightContent, options)
    this.cache.set(key, {
      result,
      timestamp: Date.now(),
      leftHash: this.simpleHash(leftContent),
      rightHash: this.simpleHash(rightContent),
      optionsHash: this.simpleHash(JSON.stringify(options))
    })

    console.log('[DiffCache] Cache set:', key, 'size:', this.cache.size)
  }

  /**
   * 清理过期缓存
   */
  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear()
    console.log('[DiffCache] Cache cleared')
  }

  /**
   * 获取缓存统计
   */
  getStats(): { size: number; maxSize: number; ttl: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttl: this.ttl
    }
  }
}

// 全局缓存实例
const globalDiffCache = new DiffCache()

/**
 * 带缓存的 diff 计算函数
 * Week 12 性能优化：Diff 计算结果缓存
 * 
 * @param left 左侧文件内容
 * @param right 右侧文件内容
 * @param options diff 选项
 * @returns DiffResult
 */
export async function computeDiffWithCache(
  left: string,
  right: string,
  options: DiffOptions
): Promise<DiffResult> {
  // 尝试从缓存获取
  const cached = globalDiffCache.get(left, right, options)
  if (cached) {
    // 更新计算时间戳
    return {
      ...cached,
      computedAt: Date.now()
    }
  }

  // 执行计算
  const startTime = performance.now()
  const result = await computeDiffOriginal(left, right, options)
  const computeTime = performance.now() - startTime

  // 缓存结果
  globalDiffCache.set(left, right, options, result)

  console.log(`[DiffCache] Computed in ${computeTime.toFixed(2)}ms, cached`)
  return result
}

/**
 * 从 FileInfo 计算 diff（带缓存）
 */
export async function computeDiffFromFiles(
  leftFile: FileInfo,
  rightFile: FileInfo,
  options: DiffOptions
): Promise<DiffResult> {
  return computeDiffWithCache(leftFile.content, rightFile.content, options)
}

/**
 * 清空 diff 缓存
 */
export function clearDiffCache(): void {
  globalDiffCache.clear()
}

/**
 * 获取缓存统计
 */
export function getDiffCacheStats(): { size: number; maxSize: number; ttl: number } {
  return globalDiffCache.getStats()
}

// 导出原始计算函数
export { computeDiffOriginal as computeDiff }
