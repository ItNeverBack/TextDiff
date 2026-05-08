/**
 * 文件哈希 Worker
 * 在独立线程中计算文件哈希值
 */
import * as fs from 'fs';
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
    case 'hash':
      await handleHashTask(task);
      break;

    case 'batch-hash':
      await handleBatchHashTask(task);
      break;

    default:
      sendError(task.id, `Unknown task type: ${task.type}`);
  }
}

// ============================================
// 单文件哈希任务
// ============================================
async function handleHashTask(task: { id: string; payload: unknown }): Promise<void> {
  const { filePath, algorithm = 'md5', chunkSize = 64 * 1024 } = task.payload as {
    filePath: string;
    algorithm?: 'md5' | 'sha256';
    chunkSize?: number;
  };

  try {
    // 检查文件是否存在
    const stats = await fs.promises.stat(filePath);
    if (!stats.isFile()) {
      throw new Error('Path is not a file');
    }

    const totalSize = stats.size;
    let processedSize = 0;

    const hash = createHash(algorithm);
    const stream = fs.createReadStream(filePath, { highWaterMark: chunkSize });

    stream.on('data', (chunk: Buffer | string) => {
      hash.update(chunk);
      processedSize += typeof chunk === 'string' ? Buffer.byteLength(chunk) : chunk.length;

      // 发送进度（每 10% 或每 1MB）
      if (totalSize > 0) {
        const progress = Math.round((processedSize / totalSize) * 100);
        if (progress % 10 === 0 || chunk.length >= 1024 * 1024) {
          sendProgress(task.id, progress, `Processing ${processedSize}/${totalSize} bytes`);
        }
      }
    });

    await new Promise<void>((resolve, reject) => {
      stream.on('end', () => resolve());
      stream.on('error', reject);
    });

    const hashValue = hash.digest('hex');

    sendResult(task.id, {
      hash: hashValue,
      algorithm,
      filePath,
      size: totalSize,
      processedSize
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Hash computation failed';
    sendError(task.id, errorMessage);
  }
}

// ============================================
// 批量哈希任务
// ============================================
async function handleBatchHashTask(task: { id: string; payload: unknown }): Promise<void> {
  const { filePaths, algorithm = 'md5' } = task.payload as {
    filePaths: string[];
    algorithm?: 'md5' | 'sha256';
  };

  const results: Array<{
    filePath: string;
    hash: string;
    size: number;
    error?: string;
  }> = [];

  let completed = 0;
  const total = filePaths.length;

  for (const filePath of filePaths) {
    try {
      // 发送进度
      const progress = Math.round((completed / total) * 100);
      sendProgress(task.id, progress, `Processing ${completed}/${total} files: ${filePath}`);

      const stats = await fs.promises.stat(filePath);
      if (!stats.isFile()) {
        results.push({ filePath, hash: '', size: 0, error: 'Not a file' });
        continue;
      }

      const hash = await computeFileHash(filePath, algorithm);
      results.push({ filePath, hash, size: stats.size });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      results.push({ filePath, hash: '', size: 0, error: errorMessage });
    }

    completed++;
  }

  sendResult(task.id, {
    results,
    total,
    completed,
    algorithm
  });
}

// ============================================
// 计算文件哈希
// ============================================
async function computeFileHash(filePath: string, algorithm: string): Promise<string> {
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
