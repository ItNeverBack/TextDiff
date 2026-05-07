import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  IncrementalScanner,
  incrementalScan,
  mergeWithCache
} from '../../incremental';
import {
  DirectoryCacheManager,
  DirectoryCache,
  CacheEntry
} from '../../cache';
import type { DirCompareOptions, FileMetadata } from '@shared/types';

// Mock getFileMetadata to avoid actual file system calls
vi.mock('../../scanner', async () => {
  return {
    getFileMetadata: vi.fn()
  };
});

import { getFileMetadata } from '../../scanner';

describe('IncrementalScanner', () => {
  let scanner: IncrementalScanner;
  let cacheManager: DirectoryCacheManager;

  beforeEach(() => {
    cacheManager = new DirectoryCacheManager({ enabled: true });
    scanner = new IncrementalScanner(cacheManager);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('基本扫描', () => {
    it('should return empty result when no cache exists', async () => {
      const options: DirCompareOptions = {
        compareMode: 'name',
        filters: [],
        recursive: true,
        useHash: false,
        parallel: true,
        workerCount: 2
      };

      const result = await scanner.scan('/test/path', options);

      expect(result.usedCache).toBe(false);
      expect(result.changes).toHaveLength(0);
      expect(result.added).toHaveLength(0);
      expect(result.deleted).toHaveLength(0);
    });

    it('should detect new files', async () => {
      const mockGetFileMetadata = vi.mocked(getFileMetadata);

      // Mock file metadata for new file
      mockGetFileMetadata.mockResolvedValue({
        size: 100,
        modifiedTime: new Date('2024-01-01'),
        createdTime: new Date('2024-01-01'),
        permissions: '644'
      } as FileMetadata);

      // 创建空缓存
      const cache = cacheManager.createCache('/test/path');

      const options: DirCompareOptions = {
        compareMode: 'name',
        filters: [],
        recursive: false,
        useHash: false,
        parallel: true,
        workerCount: 2
      };

      // Manually add the current file entry to simulate it existing in filesystem
      // by mocking the internal listAllEntries to return our test file
      const mockEntries = [
        {
          relativePath: 'new-file.txt',
          type: 'file' as const,
          metadata: {
            size: 100,
            modifiedTime: new Date('2024-01-01'),
            createdTime: new Date('2024-01-01'),
            permissions: '644'
          }
        }
      ];

      // Use reflection to access private method for testing
      const scannerAny = scanner as any;
      scannerAny.listAllEntries = vi.fn().mockResolvedValue(mockEntries);

      const result = await scanner.scan('/test/path', options, cache);

      expect(result.usedCache).toBe(true);
      expect(result.added).toHaveLength(1);
      expect(result.added[0].relativePath).toBe('new-file.txt');
    });

    it('should detect deleted files', async () => {
      // Mock listAllEntries to return empty (simulating deleted files)
      const scannerAny = scanner as any;
      scannerAny.listAllEntries = vi.fn().mockResolvedValue([]);

      // 创建带有条目的缓存
      const cache = cacheManager.createCache('/test/path');
      const entry: CacheEntry = {
        relativePath: 'deleted-file.txt',
        size: 100,
        modifiedTime: Date.now(),
        cachedAt: Date.now()
      };
      cacheManager.setEntry(cache, entry);

      const options: DirCompareOptions = {
        compareMode: 'name',
        filters: [],
        recursive: false,
        useHash: false,
        parallel: true,
        workerCount: 2
      };

      const result = await scanner.scan('/test/path', options, cache);

      expect(result.usedCache).toBe(true);
      expect(result.deleted).toHaveLength(1);
      expect(result.deleted[0]).toBe('deleted-file.txt');
    });

    it('should detect changed files', async () => {
      const modifiedTime = new Date('2024-01-01');
      const newModifiedTime = new Date('2024-02-01');

      // Mock listAllEntries to return file with different metadata
      const scannerAny = scanner as any;
      scannerAny.listAllEntries = vi.fn().mockResolvedValue([
        {
          relativePath: 'changed-file.txt',
          type: 'file' as const,
          metadata: {
            size: 200, // Different size
            modifiedTime: newModifiedTime,
            createdTime: newModifiedTime,
            permissions: '644'
          }
        }
      ]);

      // 创建带有旧条目的缓存
      const cache = cacheManager.createCache('/test/path');
      const entry: CacheEntry = {
        relativePath: 'changed-file.txt',
        size: 100, // 旧大小
        modifiedTime: modifiedTime.getTime(), // 旧时间
        cachedAt: Date.now()
      };
      cacheManager.setEntry(cache, entry);

      const options: DirCompareOptions = {
        compareMode: 'name',
        filters: [],
        recursive: false,
        useHash: false,
        parallel: true,
        workerCount: 2
      };

      const result = await scanner.scan('/test/path', options, cache);

      expect(result.usedCache).toBe(true);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].relativePath).toBe('changed-file.txt');
    });

    it('should detect unchanged files', async () => {
      const modifiedTime = new Date('2024-01-01');

      // Mock listAllEntries to return file with same metadata
      const scannerAny = scanner as any;
      scannerAny.listAllEntries = vi.fn().mockResolvedValue([
        {
          relativePath: 'unchanged-file.txt',
          type: 'file' as const,
          metadata: {
            size: 100,
            modifiedTime: modifiedTime,
            createdTime: modifiedTime,
            permissions: '644'
          }
        }
      ]);

      // 创建带有相同条目的缓存
      const cache = cacheManager.createCache('/test/path');
      const entry: CacheEntry = {
        relativePath: 'unchanged-file.txt',
        size: 100,
        modifiedTime: modifiedTime.getTime(),
        cachedAt: Date.now()
      };
      cacheManager.setEntry(cache, entry);

      const options: DirCompareOptions = {
        compareMode: 'name',
        filters: [],
        recursive: false,
        useHash: false,
        parallel: true,
        workerCount: 2
      };

      const result = await scanner.scan('/test/path', options, cache);

      expect(result.usedCache).toBe(true);
      expect(result.unchanged).toHaveLength(1);
      expect(result.unchanged[0]).toBe('unchanged-file.txt');
      expect(result.changes).toHaveLength(0);
    });
  });

  describe('缓存更新', () => {
    it('should update cache with new entries', async () => {
      const entries = [
        {
          relativePath: 'file1.txt',
          type: 'file' as const,
          metadata: {
            size: 100,
            modifiedTime: new Date(),
            createdTime: new Date(),
            permissions: '644'
          }
        },
        {
          relativePath: 'file2.txt',
          type: 'file' as const,
          metadata: {
            size: 200,
            modifiedTime: new Date(),
            createdTime: new Date(),
            permissions: '644'
          }
        }
      ];

      await scanner.updateCache('/test/path', entries);

      const cache = cacheManager.getCache('/test/path');
      expect(cache).toBeDefined();
      expect(cache?.entries.size).toBe(2);
      expect(cache?.totalFiles).toBe(2);
      expect(cache?.totalSize).toBe(300);
    });
  });

  describe('便捷函数', () => {
    it('should call incrementalScan correctly', async () => {
      // Mock listAllEntries to return empty
      const scannerAny = scanner as any;
      scannerAny.listAllEntries = vi.fn().mockResolvedValue([]);

      const options: DirCompareOptions = {
        compareMode: 'name',
        filters: [],
        recursive: false,
        useHash: false,
        parallel: true,
        workerCount: 2
      };

      const result = await incrementalScan('/test/path', options, cacheManager);

      expect(result).toBeDefined();
      expect(result.usedCache).toBe(false);
    });
  });

  describe('mergeWithCache', () => {
    it('should merge changes with cached data', () => {
      const cache = cacheManager.createCache('/test/path');
      const entry: CacheEntry = {
        relativePath: 'cached-file.txt',
        size: 100,
        modifiedTime: Date.now(),
        hash: 'abc123',
        cachedAt: Date.now()
      };
      cacheManager.setEntry(cache, entry);

      const changes: Array<{
        relativePath: string;
        type: 'file' | 'directory';
        metadata?: { size: number; modifiedTime: Date; hash?: string };
      }> = [];
      const added = [
        {
          relativePath: 'new-file.txt',
          type: 'file' as const,
          metadata: { size: 200, modifiedTime: new Date() }
        }
      ];
      const unchangedPaths = ['cached-file.txt'];

      const result = mergeWithCache(changes, added, unchangedPaths, cache);

      expect(result).toHaveLength(2);
    });
  });

  describe('性能估算', () => {
    it('should estimate time saved correctly', async () => {
      const modifiedTime = new Date('2024-01-01');

      // Mock 10 unchanged files
      const mockEntries = Array.from({ length: 10 }, (_, i) => ({
        relativePath: `file${i}.txt`,
        type: 'file' as const,
        metadata: {
          size: 100,
          modifiedTime: modifiedTime,
          createdTime: modifiedTime,
          permissions: '644'
        }
      }));

      const scannerAny = scanner as any;
      scannerAny.listAllEntries = vi.fn().mockResolvedValue(mockEntries);

      // 创建缓存
      const cache = cacheManager.createCache('/test/path');
      for (let i = 0; i < 10; i++) {
        const entry: CacheEntry = {
          relativePath: `file${i}.txt`,
          size: 100,
          modifiedTime: modifiedTime.getTime(),
          cachedAt: Date.now()
        };
        cacheManager.setEntry(cache, entry);
      }

      const options: DirCompareOptions = {
        compareMode: 'name',
        filters: [],
        recursive: false,
        useHash: false,
        parallel: true,
        workerCount: 2
      };

      const result = await scanner.scan('/test/path', options, cache);

      // 10 个未变更的文件 * 5ms = 50ms 节省时间
      expect(result.timeSaved).toBeGreaterThan(0);
      expect(result.unchanged).toHaveLength(10);
    });
  });
});
