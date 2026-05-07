/**
 * Worker Pool 管理器
 * 管理目录扫描和哈希计算的 Worker 线程池
 */
import { Worker } from 'worker_threads';
import * as path from 'path';
import { WorkerPoolConfig, WorkerPoolStats, WorkerInfo, WorkerMessage } from './types';

// ============================================
// 任务封装
// ============================================
interface QueuedTask {
  id: string;
  type: string;
  payload: unknown;
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  timeout?: NodeJS.Timeout;
}

// ============================================
// Worker 包装器
// ============================================
class WorkerWrapper {
  public status: 'idle' | 'busy' | 'error' | 'terminated' = 'idle';
  public currentTask?: string;
  private worker: Worker;

  constructor(
    public id: number,
    private scriptPath: string,
    private onMessage: (message: WorkerMessage) => void,
    private onExit: (code: number) => void
  ) {
    this.worker = new Worker(scriptPath);
    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.worker.on('message', (message: WorkerMessage) => {
      this.onMessage(message);
    });

    this.worker.on('error', (error) => {
      console.error(`Worker ${this.id} error:`, error);
      this.status = 'error';
    });

    this.worker.on('exit', (code) => {
      this.status = 'terminated';
      this.onExit(code);
    });

    // 初始化 Worker
    this.sendMessage({ type: 'init', workerId: this.id });
  }

  sendMessage(message: unknown): void {
    this.worker.postMessage(message);
  }

  assignTask(task: QueuedTask): void {
    this.status = 'busy';
    this.currentTask = task.id;
    this.sendMessage({ type: 'task', task });
  }

  release(): void {
    this.status = 'idle';
    this.currentTask = undefined;
  }

  terminate(): Promise<number> {
    return this.worker.terminate();
  }
}

// ============================================
// Worker Pool 类
// ============================================
export class WorkerPool {
  private workers: WorkerWrapper[] = [];
  private queue: QueuedTask[] = [];
  private config: Required<WorkerPoolConfig>;
  private taskMap = new Map<string, QueuedTask>();
  private scriptPath: string;
  private isShuttingDown = false;

  // 统计
  private stats = {
    completedTasks: 0,
    failedTasks: 0
  };

  constructor(scriptPath: string, config: WorkerPoolConfig = {}) {
    this.scriptPath = scriptPath;
    this.config = {
      workerCount: config.workerCount || this.getDefaultWorkerCount(),
      maxQueueSize: config.maxQueueSize || 1000,
      taskTimeout: config.taskTimeout || 30000,
      idleTimeout: config.idleTimeout || 60000
    };

    this.initializeWorkers();
  }

  // ============================================
  // 初始化
  // ============================================
  private getDefaultWorkerCount(): number {
    // 使用 CPU 核心数减 1，保留一个核心给主线程
    const cpus = require('os').cpus();
    return Math.max(1, cpus.length - 1);
  }

  private initializeWorkers(): void {
    for (let i = 0; i < this.config.workerCount; i++) {
      this.createWorker(i);
    }
  }

  private createWorker(id: number): void {
    try {
      const worker = new WorkerWrapper(
        id,
        this.scriptPath,
        (message) => this.handleWorkerMessage(message),
        (code) => this.handleWorkerExit(id, code)
      );
      this.workers.push(worker);
    } catch (error) {
      console.error(`Failed to create worker ${id}:`, error);
    }
  }

  // ============================================
  // 任务管理
  // ============================================
  async executeTask<T>(type: string, payload: unknown): Promise<T> {
    if (this.isShuttingDown) {
      throw new Error('Worker pool is shutting down');
    }

    // 检查队列长度
    if (this.queue.length >= this.config.maxQueueSize) {
      throw new Error('Task queue is full');
    }

    return new Promise((resolve, reject) => {
      const task: QueuedTask = {
        id: this.generateTaskId(),
        type,
        payload,
        resolve: resolve as (value: unknown) => void,
        reject
      };

      // 设置超时
      task.timeout = setTimeout(() => {
        this.handleTaskTimeout(task.id);
      }, this.config.taskTimeout);

      this.taskMap.set(task.id, task);
      this.queue.push(task);
      this.processQueue();
    });
  }

  executeTasks<T>(tasks: Array<{ type: string; payload: unknown }>): Promise<T[]> {
    return Promise.all(tasks.map(task => this.executeTask<T>(task.type, task.payload)));
  }

  private processQueue(): void {
    if (this.queue.length === 0) return;

    // 找到空闲的 Worker
    const idleWorker = this.workers.find(w => w.status === 'idle');
    if (!idleWorker) return;

    // 取出任务
    const task = this.queue.shift();
    if (!task) return;

    // 分配任务
    idleWorker.assignTask(task);
  }

  private handleTaskTimeout(taskId: string): void {
    const task = this.taskMap.get(taskId);
    if (task) {
      task.reject(new Error('Task timeout'));
      this.taskMap.delete(taskId);
      this.stats.failedTasks++;

      // 终止可能卡住的 Worker
      const worker = this.workers.find(w => w.currentTask === taskId);
      if (worker) {
        worker.terminate().then(() => {
          this.workers = this.workers.filter(w => w.id !== worker.id);
          this.createWorker(worker.id);
        });
      }
    }
  }

  // ============================================
  // Worker 消息处理
  // ============================================
  private handleWorkerMessage(message: WorkerMessage): void {
    switch (message.type) {
      case 'result':
        this.handleTaskResult(message.taskId, message.result);
        break;

      case 'error':
        this.handleTaskError(message.taskId, message.error);
        break;

      case 'progress':
        // 进度更新可以触发回调
        break;

      case 'init':
        // Worker 初始化完成
        break;
    }
  }

  private handleTaskResult(taskId: string, result: unknown): void {
    const task = this.taskMap.get(taskId);
    if (task) {
      // 清除超时
      if (task.timeout) {
        clearTimeout(task.timeout);
      }

      task.resolve(result);
      this.taskMap.delete(taskId);
      this.stats.completedTasks++;

      // 释放 Worker
      const worker = this.workers.find(w => w.currentTask === taskId);
      if (worker) {
        worker.release();
      }

      // 处理下一个任务
      this.processQueue();
    }
  }

  private handleTaskError(taskId: string, error: string): void {
    const task = this.taskMap.get(taskId);
    if (task) {
      // 清除超时
      if (task.timeout) {
        clearTimeout(task.timeout);
      }

      task.reject(new Error(error));
      this.taskMap.delete(taskId);
      this.stats.failedTasks++;

      // 释放 Worker
      const worker = this.workers.find(w => w.currentTask === taskId);
      if (worker) {
        worker.release();
      }

      // 处理下一个任务
      this.processQueue();
    }
  }

  private handleWorkerExit(workerId: number, code: number): void {
    console.log(`Worker ${workerId} exited with code ${code}`);

    // 移除退出的 Worker
    this.workers = this.workers.filter(w => w.id !== workerId);

    // 重新创建 Worker
    if (!this.isShuttingDown) {
      this.createWorker(workerId);
    }
  }

  // ============================================
  // 工具方法
  // ============================================
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ============================================
  // 公共 API
  // ============================================
  getStats(): WorkerPoolStats {
    return {
      totalWorkers: this.workers.length,
      idleWorkers: this.workers.filter(w => w.status === 'idle').length,
      busyWorkers: this.workers.filter(w => w.status === 'busy').length,
      queuedTasks: this.queue.length,
      completedTasks: this.stats.completedTasks,
      failedTasks: this.stats.failedTasks
    };
  }

  getWorkerInfo(): WorkerInfo[] {
    return this.workers.map(w => ({
      id: w.id,
      status: w.status,
      currentTask: w.currentTask
    }));
  }

  async shutdown(): Promise<void> {
    this.isShuttingDown = true;

    // 等待队列中的任务完成或拒绝
    for (const task of this.queue) {
      task.reject(new Error('Worker pool is shutting down'));
    }
    this.queue = [];

    // 终止所有 Worker
    await Promise.all(this.workers.map(w => w.terminate()));
    this.workers = [];
  }
}

// ============================================
// 单例模式：目录扫描 Worker Pool
// ============================================
let scanWorkerPool: WorkerPool | null = null;

export function getScanWorkerPool(): WorkerPool {
  if (!scanWorkerPool) {
    const workerPath = path.join(__dirname, 'scan-worker.js');
    scanWorkerPool = new WorkerPool(workerPath, {
      workerCount: Math.min(4, require('os').cpus().length - 1),
      taskTimeout: 60000
    });
  }
  return scanWorkerPool;
}

// ============================================
// 单例模式：哈希计算 Worker Pool
// ============================================
let hashWorkerPool: WorkerPool | null = null;

export function getHashWorkerPool(): WorkerPool {
  if (!hashWorkerPool) {
    const workerPath = path.join(__dirname, 'hash-worker.js');
    hashWorkerPool = new WorkerPool(workerPath, {
      workerCount: Math.min(4, require('os').cpus().length - 1),
      taskTimeout: 300000 // 大文件哈希可能需要较长时间
    });
  }
  return hashWorkerPool;
}

// ============================================
// 关闭所有 Worker Pool
// ============================================
export async function shutdownAllWorkerPools(): Promise<void> {
  await Promise.all([
    scanWorkerPool?.shutdown(),
    hashWorkerPool?.shutdown()
  ]);
  scanWorkerPool = null;
  hashWorkerPool = null;
}
