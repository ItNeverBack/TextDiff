/**
 * 增量扫描逻辑
 * 基于缓存的增量目录扫描
 */
import * as fs from 'fs';
import * as path from 'path';
import { DirectoryCacheManager, CacheEntry, DirectoryCache } from './cache';
import type { DirTreeNode, DirCompareOptions, FileMetadata } from '@shared/types';
import { getFileMetadata } from './scanner';

// ============================================
// 增量扫描结果
// ============================================
export interface IncrementalScanResult {
  /** 变更的条目 */
  changes: ChangeEntry[];
  /** 新增的条目 */
  added: ChangeEntry[];
  /** 删除的条目 */
  deleted: string[];
  /** 未变更的条目（可直接使用缓存） */
  unchanged: string[];
  /** 是否使用了缓存 */
  usedCache: boolean;
  /** 节省的时间（毫秒，估算） */
  timeSaved: number;
}

// ============================================
// 变更条目
// ============================================
export interface ChangeEntry {
  relativePath: string;
  type: 'file' | 'directory';
  metadata?: FileMetadata;
}

// ============================================
// 增量扫描器
// ============================================
export class IncrementalScanner {
  private cacheManager: DirectoryCacheManager;

  constructor(cacheManager?: DirectoryCacheManager) {
    this.cacheManager = cacheManager || new DirectoryCacheManager();
  }

  // ============================================
  // 主要方法
  // ============================================

  /**
   * 执行增量扫描
   */
  async scan(
    rootPath: string,
    options: DirCompareOptions,
    previousCache?: DirectoryCache
  ): Promise<IncrementalScanResult> {
    const result: IncrementalScanResult = {
      changes: [],
      added: [],
      deleted: [],
      unchanged: [],
      usedCache: false,
      timeSaved: 0
    };

    // 获取或创建缓存
    const cache = previousCache || this.cacheManager.getCache(rootPath);
    if (!cache) {
      // 没有缓存，执行完整扫描
      return result;
    }

    result.usedCache = true;

    // 获取当前目录内容
    const currentEntries = await this.listAllEntries(rootPath, '', options);

    // 创建路径集合用于快速查找
    const currentPaths = new Set(currentEntries.map(e => e.relativePath));
    const cachedPaths = new Set(cache.entries.keys());

    // 检查每个当前条目
    for (const entry of currentEntries) {
      const cachedEntry = cache.entries.get(entry.relativePath);

      if (!cachedEntry) {
        // 新增的条目
        result.added.push(entry);
      } else if (!this.isEntryUnchanged(cachedEntry, entry)) {
        // 变更的条目
        result.changes.push(entry);
      } else {
        // 未变更的条目
        result.unchanged.push(entry.relativePath);
      }
    }

    // 检查删除的条目
    for (const cachedPath of cachedPaths) {
      if (!currentPaths.has(cachedPath)) {
        result.deleted.push(cachedPath);
      }
    }

    // 估算节省时间
    const cachedEntries = result.unchanged.length;
    const scanTimePerEntry = 5; // 估算每个条目扫描需要 5ms
    result.timeSaved = cachedEntries * scanTimePerEntry;

    return result;
  }

  /**
   * 更新缓存
   */
  async updateCache(
    rootPath: string,
    entries: Array<{ relativePath: string; type: 'file' | 'directory'; metadata?: FileMetadata }>
  ): Promise<void> {
    let cache = this.cacheManager.getCache(rootPath);
    if (!cache) {
      cache = this.cacheManager.createCache(rootPath);
    }

    cache.lastScan = Date.now();
    cache.totalFiles = entries.filter(e => e.type === 'file').length;
    cache.totalSize = entries
      .filter(e => e.type === 'file')
      .reduce((sum, e) => sum + (e.metadata?.size || 0), 0);

    for (const entry of entries) {
      if (entry.type === 'file' && entry.metadata) {
        const cacheEntry: CacheEntry = {
          relativePath: entry.relativePath,
          size: entry.metadata.size,
          modifiedTime: entry.metadata.modifiedTime.getTime(),
          hash: entry.metadata.hash,
          cachedAt: Date.now()
        };
        this.cacheManager.setEntry(cache, cacheEntry);
      }
    }
  }

  // ============================================
  // 私有方法
  // ============================================

  /**
   * 列出所有条目
   */
  private async listAllEntries(
    rootPath: string,
    relativePath: string,
    options: DirCompareOptions
  ): Promise<ChangeEntry[]> {
    const entries: ChangeEntry[] = [];
    const currentPath = relativePath ? path.join(rootPath, relativePath) : rootPath;

    try {
      const dirEntries = await fs.promises.readdir(currentPath, { withFileTypes: true });

      for (const dirEntry of dirEntries) {
        const entryRelativePath = relativePath
          ? path.join(relativePath, dirEntry.name)
          : dirEntry.name;

        // 这里简化处理，实际应该应用过滤器
        if (this.shouldExclude(dirEntry.name)) {
          continue;
        }

        if (dirEntry.isDirectory()) {
          entries.push({
            relativePath: entryRelativePath,
            type: 'directory'
          });

          if (options.recursive) {
            const childEntries = await this.listAllEntries(
              rootPath,
              entryRelativePath,
              options
            );
            entries.push(...childEntries);
          }
        } else if (dirEntry.isFile()) {
          const metadata = await getFileMetadata(path.join(currentPath, dirEntry.name), false);
          entries.push({
            relativePath: entryRelativePath,
            type: 'file',
            metadata
          });
        }
      }
    } catch (error) {
      // 忽略无法读取的目录
    }

    return entries;
  }

  /**
   * 检查条目是否未变更
   */
  private isEntryUnchanged(cached: CacheEntry, current: ChangeEntry): boolean {
    if (current.type !== 'file' || !current.metadata) {
      return true; // 目录总是认为未变更（通过子条目判断）
    }

    // 比较文件大小
    if (cached.size !== current.metadata.size) {
      return false;
    }

    // 比较修改时间（允许1秒的误差，因为不同文件系统的精度不同）
    const cachedTime = cached.modifiedTime;
    const currentTime = current.metadata.modifiedTime.getTime();
    const timeDiff = Math.abs(cachedTime - currentTime);
    
    if (timeDiff > 1000) {
      return false;
    }

    // 如果有哈希值，也比较哈希
    if (cached.hash && current.metadata.hash) {
      return cached.hash === current.metadata.hash;
    }

    return true;
  }

  /**
   * 检查是否应该排除
   */
  private shouldExclude(name: string): boolean {
    // 简化处理，实际应该使用 filter.ts 的逻辑
    const excludePatterns = ['node_modules', '.git', '.svn', '__pycache__', '.DS_Store'];
    return excludePatterns.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(name);
      }
      return name === pattern || name.startsWith(pattern + '.');
    });
  }
}

// ============================================
// 便捷函数
// ============================================

/**
 * 执行增量扫描
 */
export async function incrementalScan(
  rootPath: string,
  options: DirCompareOptions,
  cacheManager?: DirectoryCacheManager
): Promise<IncrementalScanResult> {
  const scanner = new IncrementalScanner(cacheManager);
  return scanner.scan(rootPath, options);
}

/**
 * 合并缓存数据和新的扫描结果
 */
export function mergeWithCache(
  changes: ChangeEntry[],
  added: ChangeEntry[],
  unchangedPaths: string[],
  cache: DirectoryCache
): DirTreeNode[] {
  const entryMap = new Map<string, DirTreeNode>();

  // 处理未变更的条目（从缓存恢复）
  for (const relativePath of unchangedPaths) {
    const cachedEntry = cache.entries.get(relativePath);
    if (cachedEntry) {
      const node: DirTreeNode = {
        path: relativePath,
        name: path.basename(relativePath),
        type: 'file',
        metadata: {
          size: cachedEntry.size,
          modifiedTime: new Date(cachedEntry.modifiedTime),
          createdTime: new Date(cachedEntry.cachedAt),
          hash: cachedEntry.hash,
          permissions: '644'
        },
        relativePath
      };
      entryMap.set(relativePath, node);
    }
  }

  // 处理变更的条目
  for (const change of changes) {
    const node: DirTreeNode = {
      path: change.relativePath,
      name: path.basename(change.relativePath),
      type: change.type,
      metadata: change.metadata,
      relativePath: change.relativePath
    };
    entryMap.set(change.relativePath, node);
  }

  // 处理新增的条目
  for (const addition of added) {
    const node: DirTreeNode = {
      path: addition.relativePath,
      name: path.basename(addition.relativePath),
      type: addition.type,
      metadata: addition.metadata,
      relativePath: addition.relativePath
    };
    entryMap.set(addition.relativePath, node);
  }

  // 构建树结构
  return buildTreeFromMap(entryMap);
}

/**
 * 从映射构建树
 */
function buildTreeFromMap(entryMap: Map<string, DirTreeNode>): DirTreeNode[] {
  const roots: DirTreeNode[] = [];
  const dirMap = new Map<string, DirTreeNode>();

  // 首先创建所有目录节点
  for (const [relativePath, node] of entryMap) {
    if (node.type === 'directory') {
      dirMap.set(relativePath, node);
    }
  }

  // 然后构建父子关系
  for (const [relativePath, node] of entryMap) {
    const parentPath = path.dirname(relativePath);

    if (parentPath === '.' || parentPath === relativePath) {
      // 根级条目
      roots.push(node);
    } else {
      // 查找或创建父目录
      let parent = dirMap.get(parentPath);
      if (!parent) {
        parent = {
          path: parentPath,
          name: path.basename(parentPath),
          type: 'directory',
          children: [],
          relativePath: parentPath
        };
        dirMap.set(parentPath, parent);
      }

      if (!parent.children) {
        parent.children = [];
      }
      parent.children.push(node);
    }
  }

  return roots;
}
