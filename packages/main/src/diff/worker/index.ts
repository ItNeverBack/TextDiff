import { Worker } from 'worker_threads'
import { join } from 'path'
import * as fs from 'fs'
import { LARGE_FILE_THRESHOLD } from '@shared/constants'
import type { DiffOptions, DiffResult } from '@shared/types'
import type { WorkerTask, WorkerMessage, WorkerResult, WorkerError, WorkerProgress, ProgressCallback } from './types'
import { computeDiff } from '../index'

/**
 * Worker Pool 管理器
 * 
 * 大文件处理策略：
 * - 文件总大小 > 5MB 时自动使用 Worker 线程
 * - 否则在主线程同步计算
 * 
 * 参考: TextDiff-DevPlan.md §2.8.2 Worker Pool
 * 参考: TextDiff-Module-Design.md §2.1.5 大文件处理
 */

// Worker 池配置
const WORKER_POOL_SIZE = 2 // 最大并发 Worker 数量
const MAX_RETRY_COUNT = 3  // 最大重试次数

/**
 * 获取 Worker 脚本路径
 * 在开发环境使用 .ts 文件，生产环境使用编译后的 .js 文件
 */
function getWorkerScriptPath(): string | null {
  const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_RENDERER_PORT

  // 处理测试环境或非 Electron 环境（process.resourcesPath 不存在）
  if (!process.resourcesPath) {
    const devPath = join(__dirname, 'diff-worker.js')
    return fs.existsSync(devPath) ? devPath : null
  }

  if (isDev) {
    // 开发环境：使用 ts-node 或直接引用 ts 文件
    const devPath = join(__dirname, 'diff-worker.js')
    return fs.existsSync(devPath) ? devPath : null
  }

  // 生产环境：使用 electron-builder 打包后的路径
  // 注意：electron-vite 将 worker 文件打包到 out/main/diff-worker.js
  const prodPath = join(process.resourcesPath, 'app.asar', 'out', 'main', 'diff-worker.js')
  return fs.existsSync(prodPath) ? prodPath : null
}

interface PendingTask {
  id: string
  task: WorkerTask
  resolve: (result: DiffResult) => void
  reject: (error: Error) => void
  onProgress?: ProgressCallback
}

class DiffWorkerPool {
  private workers: Worker[] = []
  private busyWorkers: Map<Worker, string> = new Map() // Worker -> taskId
  private pendingTasks: PendingTask[] = []
  private taskCounter = 0
  private retryCount = 0
  private workerPath: string | null = null
  private initialized = false

  constructor() {
    // 延迟初始化，不在构造函数中创建 Worker
  }

  /**
   * 初始化 Worker 池（延迟初始化）
   */
  private initialize(): void {
    if (this.initialized) return
    this.initialized = true

    this.workerPath = getWorkerScriptPath()
    if (this.workerPath) {
      this.initializeWorkers()
    } else {
      console.warn('[WorkerPool] Worker script not found, falling back to main thread computation')
    }
  }

  /**
   * 初始化 Worker 池
   */
  private initializeWorkers(): void {
    if (!this.workerPath) return
    
    for (let i = 0; i < WORKER_POOL_SIZE; i++) {
      this.createWorker()
    }
  }

  /**
   * 创建新的 Worker
   */
  private createWorker(): Worker | null {
    if (!this.workerPath) return null
    
    if (this.retryCount >= MAX_RETRY_COUNT) {
      console.error('[WorkerPool] Max retry count reached, stopping worker creation')
      return null
    }

    try {
      const worker = new Worker(this.workerPath)
      
      worker.on('message', (message: WorkerMessage) => {
        this.handleWorkerMessage(worker, message)
      })

      worker.on('error', (error) => {
        console.error('[WorkerPool] Worker error:', error)
        this.recycleWorker(worker)
      })

      worker.on('exit', (code) => {
        if (code !== 0) {
          console.error(`[WorkerPool] Worker stopped with exit code ${code}`)
          this.removeWorker(worker)
          this.retryCount++
          // 如果 Worker 异常退出且未达到最大重试次数，创建新的 Worker
          if (this.workers.length < WORKER_POOL_SIZE && this.retryCount < MAX_RETRY_COUNT) {
            this.createWorker()
          }
        }
      })

      this.workers.push(worker)
      return worker
    } catch (error) {
      console.error('[WorkerPool] Failed to create worker:', error)
      this.retryCount++
      return null
    }
  }

  /**
   * 处理 Worker 消息
   */
  private handleWorkerMessage(worker: Worker, message: WorkerMessage): void {
    const taskId = 'taskId' in message ? message.taskId : null
    
    if (!taskId) return

    const pendingTask = this.pendingTasks.find(t => t.id === taskId)
    
    switch (message.type) {
      case 'progress':
        if (pendingTask?.onProgress) {
          pendingTask.onProgress(message as WorkerProgress)
        }
        break
        
      case 'result':
        this.recycleWorker(worker)
        this.removePendingTask(taskId)
        const resultMessage = message as WorkerResult
        pendingTask?.resolve(resultMessage.result)
        this.processNextTask()
        break
        
      case 'error':
        this.recycleWorker(worker)
        this.removePendingTask(taskId)
        const errorMessage = message as WorkerError
        pendingTask?.reject(new Error(errorMessage.error))
        this.processNextTask()
        break
    }
  }

  /**
   * 回收 Worker（标记为可用）
   */
  private recycleWorker(worker: Worker): void {
    this.busyWorkers.delete(worker)
  }

  /**
   * 移除 Worker
   */
  private removeWorker(worker: Worker): void {
    const index = this.workers.indexOf(worker)
    if (index > -1) {
      this.workers.splice(index, 1)
    }
    this.busyWorkers.delete(worker)
  }

  /**
   * 移除待处理任务
   */
  private removePendingTask(taskId: string): void {
    const index = this.pendingTasks.findIndex(t => t.id === taskId)
    if (index > -1) {
      this.pendingTasks.splice(index, 1)
    }
  }

  /**
   * 获取可用的 Worker
   */
  private getAvailableWorker(): Worker | null {
    for (const worker of this.workers) {
      if (!this.busyWorkers.has(worker)) {
        return worker
      }
    }
    return null
  }

  /**
   * 处理下一个待处理任务
   */
  private processNextTask(): void {
    const nextTask = this.pendingTasks.find(t => {
      // 找到还没有被处理的任务（即还没有分配给 Worker 的任务）
      return !Array.from(this.busyWorkers.values()).includes(t.id)
    })

    if (nextTask) {
      this.executeTaskInWorker(nextTask)
    }
  }

  /**
   * 在 Worker 中执行任务
   */
  private executeTaskInWorker(pendingTask: PendingTask): void {
    const worker = this.getAvailableWorker()
    if (!worker) {
      // 没有可用 Worker，等待
      return
    }

    this.busyWorkers.set(worker, pendingTask.id)
    worker.postMessage(pendingTask.task)
  }

  /**
   * 提交差异计算任务
   * 
   * 如果文件大小超过阈值且 Worker 可用，使用 Worker 线程
   * 否则在主线程同步计算
   */
  async computeDiff(
    left: string,
    right: string,
    options: DiffOptions,
    onProgress?: ProgressCallback
  ): Promise<DiffResult> {
    const totalSize = left.length + right.length
    
    // 只有在文件较大时才尝试初始化 Worker
    if (totalSize > LARGE_FILE_THRESHOLD) {
      this.initialize() // 延迟初始化
    }
    
    // 只有在 Worker 可用且文件较大时才使用 Worker
    if (totalSize > LARGE_FILE_THRESHOLD && this.workers.length > 0) {
      return this.submitToWorker(left, right, options, onProgress)
    }
    
    // 小文件或 Worker 不可用，同步计算
    return computeDiff(left, right, options)
  }

  /**
   * 提交任务到 Worker
   */
  private submitToWorker(
    left: string,
    right: string,
    options: DiffOptions,
    onProgress?: ProgressCallback
  ): Promise<DiffResult> {
    return new Promise((resolve, reject) => {
      this.taskCounter++
      const taskId = `task-${this.taskCounter}-${Date.now()}`
      
      const task: WorkerTask = {
        id: taskId,
        left,
        right,
        options
      }

      const pendingTask: PendingTask = {
        id: taskId,
        task,
        resolve,
        reject,
        onProgress
      }

      this.pendingTasks.push(pendingTask)
      this.executeTaskInWorker(pendingTask)
    })
  }

  /**
   * 关闭所有 Worker
   */
  terminate(): void {
    for (const worker of this.workers) {
      worker.terminate()
    }
    this.workers = []
    this.busyWorkers.clear()
    this.pendingTasks = []
  }
}

// 导出单例实例（延迟初始化）
let workerPoolInstance: DiffWorkerPool | null = null

export function getWorkerPool(): DiffWorkerPool {
  if (!workerPoolInstance) {
    workerPoolInstance = new DiffWorkerPool()
  }
  return workerPoolInstance
}

// 为了保持兼容性，导出 computeDiffWithWorkerPool 函数
export async function computeDiffWithWorkerPool(
  left: string,
  right: string,
  options: DiffOptions,
  onProgress?: ProgressCallback
): Promise<DiffResult> {
  const pool = getWorkerPool()
  return pool.computeDiff(left, right, options, onProgress)
}

// 导出类型
export type { WorkerTask, WorkerProgress, WorkerResult, WorkerError, WorkerMessage, ProgressCallback }
