/**
 * 目录扫描 Worker
 * 在独立线程中执行目录扫描任务
 */
import * as fs from 'fs';
import * as path from 'path';
import { parentPort } from 'worker_threads';
import { createHash } from 'crypto';

// ============================================
// Worker 状态
// ============================================
let workerId = -1;

// ============================================
// 消息处理
// ============================================
if (parentPort) {
  parentPort.on('message', async (message) => {
    try {
      switch (message.type) {
        case 'init':
          workerId = message.workerId;
          sendMessage({ type: 'init', workerId });
          break;

        case 'task':
          const { task } = message;
          await handleTask(task);
          break;

        default:
          sendError(message.task?.id || 'unknown', `Unknown message type: ${message.type}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      sendError(message.task?.id || 'unknown', errorMessage);
    }
  });
}

// ============================================
// 任务处理
// ============================================
async function handleTask(task: { id: string; type: string; payload: unknown }): Promise<void> {
  switch (task.type) {
    case 'scan':
      await handleScanTask(task);
      break;

    case 'hash':
      await handleHashTask(task);
      break;

    default:
      sendError(task.id, `Unknown task type: ${task.type}`);
  }
}

// ============================================
// 扫描任务
// ============================================
async function handleScanTask(task: { id: string; payload: unknown }): Promise<void> {
  const { rootPath, relativePath, options } = task.payload as {
    rootPath: string;
    relativePath: string;
    options: {
      recursive: boolean;
      maxDepth?: number;
      filters: unknown[];
      excludePatterns: string[];
    };
  };

  const currentPath = relativePath ? path.join(rootPath, relativePath) : rootPath;
  const currentDepth = relativePath ? relativePath.split(path.sep).length : 0;

  try {
    // 检查最大深度
    if (options.maxDepth !== undefined && currentDepth >= options.maxDepth) {
      sendResult(task.id, { entries: [], truncated: true });
      return;
    }

    const entries: Array<{
      name: string;
      relativePath: string;
      type: 'file' | 'directory';
      size?: number;
      modifiedTime?: Date;
      hash?: string;
    }> = [];

    const dirEntries = await fs.promises.readdir(currentPath, { withFileTypes: true });

    for (const entry of dirEntries) {
      const entryRelativePath = relativePath
        ? path.join(relativePath, entry.name)
        : entry.name;

      // 检查排除规则
      if (shouldExclude(entry.name, entryRelativePath, options.excludePatterns || [])) {
        continue;
      }

      if (entry.isDirectory()) {
        entries.push({
          name: entry.name,
          relativePath: entryRelativePath,
          type: 'directory'
        });

        // 递归扫描
        if (options.recursive) {
          const childResult = await scanRecursive(rootPath, entryRelativePath, options, currentDepth + 1);
          entries.push(...childResult);
        }
      } else if (entry.isFile()) {
        const stats = await fs.promises.stat(path.join(currentPath, entry.name));
        entries.push({
          name: entry.name,
          relativePath: entryRelativePath,
          type: 'file',
          size: stats.size,
          modifiedTime: stats.mtime
        });
      }
    }

    sendResult(task.id, { entries });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Scan failed';
    sendError(task.id, errorMessage);
  }
}

// ============================================
// 递归扫描
// ============================================
async function scanRecursive(
  rootPath: string,
  relativePath: string,
  options: {
    recursive: boolean;
    maxDepth?: number;
    filters: unknown[];
    excludePatterns: string[];
  },
  depth: number
): Promise<Array<{
  name: string;
  relativePath: string;
  type: 'file' | 'directory';
  size?: number;
  modifiedTime?: Date;
}>> {
  if (options.maxDepth !== undefined && depth >= options.maxDepth) {
    return [];
  }

  const currentPath = path.join(rootPath, relativePath);
  const entries: Array<{
    name: string;
    relativePath: string;
    type: 'file' | 'directory';
    size?: number;
    modifiedTime?: Date;
  }> = [];

  try {
    const dirEntries = await fs.promises.readdir(currentPath, { withFileTypes: true });

    for (const entry of dirEntries) {
      const entryRelativePath = path.join(relativePath, entry.name);

      if (shouldExclude(entry.name, entryRelativePath, options.excludePatterns || [])) {
        continue;
      }

      if (entry.isDirectory()) {
        entries.push({
          name: entry.name,
          relativePath: entryRelativePath,
          type: 'directory'
        });

        const childEntries = await scanRecursive(rootPath, entryRelativePath, options, depth + 1);
        entries.push(...childEntries);
      } else if (entry.isFile()) {
        const stats = await fs.promises.stat(path.join(currentPath, entry.name));
        entries.push({
          name: entry.name,
          relativePath: entryRelativePath,
          type: 'file',
          size: stats.size,
          modifiedTime: stats.mtime
        });
      }
    }
  } catch (error) {
    // 忽略无法读取的目录
  }

  return entries;
}

// ============================================
// 排除规则检查
// ============================================
function shouldExclude(name: string, relativePath: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    // 简单匹配
    if (pattern === name || pattern === relativePath) {
      return true;
    }

    // Glob 匹配（简化版）
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$', 'i');
      if (regex.test(name) || regex.test(relativePath)) {
        return true;
      }
    }
  }
  return false;
}

// ============================================
// 哈希任务
// ============================================
async function handleHashTask(task: { id: string; payload: unknown }): Promise<void> {
  const { filePath, algorithm = 'md5' } = task.payload as {
    filePath: string;
    algorithm?: 'md5' | 'sha256';
  };

  try {
    const hash = await computeFileHash(filePath, algorithm);
    sendResult(task.id, { hash });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Hash computation failed';
    sendError(task.id, errorMessage);
  }
}

// ============================================
// 计算文件哈希
// ============================================
function computeFileHash(filePath: string, algorithm: 'md5' | 'sha256'): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash(algorithm);
    const stream = fs.createReadStream(filePath);

    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

// ============================================
// 辅助函数
// ============================================
function sendMessage(message: unknown): void {
  if (parentPort) {
    parentPort.postMessage(message);
  }
}

function sendResult(taskId: string, result: unknown): void {
  sendMessage({ type: 'result', taskId, result });
}

function sendError(taskId: string, error: string): void {
  sendMessage({ type: 'error', taskId, error });
}

function sendProgress(taskId: string, progress: number, message?: string): void {
  sendMessage({ type: 'progress', taskId, progress, message });
}
