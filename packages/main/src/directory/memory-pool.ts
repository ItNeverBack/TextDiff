/**
 * 对象池实现
 * 用于减少目录对比过程中的内存分配和 GC 压力
 * 参考设计文档 §4.2.3 内存优化
 */

// ============================================
// 节点对象池
// ============================================
export class NodePool<T> {
  private pool: T[] = [];
  private maxSize: number;
  private createFn: () => T;
  private resetFn: (node: T) => void;

  constructor(
    createFn: () => T,
    resetFn: (node: T) => void,
    maxSize = 1000
  ) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = maxSize;
  }

  /**
   * 获取一个对象（从池中复用或创建新的）
   */
  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.createFn();
  }

  /**
   * 释放对象回池中
   */
  release(node: T): void {
    if (this.pool.length < this.maxSize) {
      this.resetFn(node);
      this.pool.push(node);
    }
  }

  /**
   * 批量释放
   */
  releaseMany(nodes: T[]): void {
    for (const node of nodes) {
      this.release(node);
    }
  }

  /**
   * 清空池
   */
  clear(): void {
    this.pool = [];
  }

  /**
   * 获取池大小
   */
  get size(): number {
    return this.pool.length;
  }
}

// ============================================
// WeakMap 缓存管理器
// ============================================
export class WeakMapCache<K extends object, V> {
  private cache = new WeakMap<K, V>();
  private keyRefs: WeakRef<K>[] = [];

  /**
   * 获取缓存值
   */
  get(key: K): V | undefined {
    return this.cache.get(key);
  }

  /**
   * 设置缓存值
   */
  set(key: K, value: V): void {
    this.cache.set(key, value);
    this.keyRefs.push(new WeakRef(key));
  }

  /**
   * 检查是否有缓存
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }

  /**
   * 删除缓存
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * 清理已回收的引用
   */
  cleanup(): void {
    this.keyRefs = this.keyRefs.filter(ref => ref.deref() !== undefined);
  }

  /**
   * 获取活跃引用数（估算）
   */
  get activeCount(): number {
    return this.keyRefs.filter(ref => ref.deref() !== undefined).length;
  }
}

// ============================================
// 目录对比专用对象池
// ============================================
import type { DirectoryDiffEntry, DirTreeNode, FileMetadata } from '@shared/types';

// DirTreeNode 对象池
export const dirTreeNodePool = new NodePool<DirTreeNode>(
  () => ({
    path: '',
    name: '',
    type: 'file',
    children: undefined,
    metadata: undefined,
    relativePath: ''
  }),
  (node) => {
    node.path = '';
    node.name = '';
    node.type = 'file';
    node.children = undefined;
    node.metadata = undefined;
    node.relativePath = '';
  },
  2000 // 最大池大小
);

// DirectoryDiffEntry 对象池
export const diffEntryPool = new NodePool<DirectoryDiffEntry>(
  () => ({
    id: '',
    relativePath: '',
    name: '',
    type: 'file',
    status: 'equal',
    leftPath: null,
    rightPath: null,
    leftMetadata: undefined,
    rightMetadata: undefined,
    children: undefined,
    parentId: undefined,
    depth: 0,
    isExpanded: undefined,
    isSelected: undefined,
    isVisible: undefined
  }),
  (entry) => {
    entry.id = '';
    entry.relativePath = '';
    entry.name = '';
    entry.type = 'file';
    entry.status = 'equal';
    entry.leftPath = null;
    entry.rightPath = null;
    entry.leftMetadata = undefined;
    entry.rightMetadata = undefined;
    entry.children = undefined;
    entry.parentId = undefined;
    entry.depth = 0;
    entry.isExpanded = undefined;
    entry.isSelected = undefined;
    entry.isVisible = undefined;
  },
  3000
);

// ============================================
// 哈希缓存 - 使用 WeakMap
// ============================================
const hashCache = new WeakMapCache<FileMetadata, string>();

/**
 * 获取文件哈希（带缓存）
 */
export function getCachedHash(metadata: FileMetadata, computeFn: () => string): string {
  let hash = hashCache.get(metadata);
  if (hash === undefined) {
    hash = computeFn();
    hashCache.set(metadata, hash);
  }
  return hash;
}

/**
 * 清理哈希缓存
 */
export function cleanupHashCache(): void {
  hashCache.cleanup();
}

/**
 * 获取哈希缓存统计
 */
export function getHashCacheStats(): { activeCount: number } {
  return { activeCount: hashCache.activeCount };
}

// ============================================
// 内存使用监控
// ============================================
interface MemoryStats {
  dirTreeNodePoolSize: number;
  diffEntryPoolSize: number;
  hashCacheActiveCount: number;
}

export function getMemoryPoolStats(): MemoryStats {
  return {
    dirTreeNodePoolSize: dirTreeNodePool.size,
    diffEntryPoolSize: diffEntryPool.size,
    hashCacheActiveCount: hashCache.activeCount
  };
}

/**
 * 释放对象回池中的辅助函数
 */
export function releaseDirTreeNode(node: DirTreeNode): void {
  if (node.children) {
    for (const child of node.children) {
      releaseDirTreeNode(child);
    }
    node.children = undefined;
  }
  dirTreeNodePool.release(node);
}

export function releaseDiffEntry(entry: DirectoryDiffEntry): void {
  if (entry.children) {
    for (const child of entry.children) {
      releaseDiffEntry(child);
    }
    entry.children = undefined;
  }
  diffEntryPool.release(entry);
}
