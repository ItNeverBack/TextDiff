import { parentPort } from 'worker_threads'
import { computeDiff } from '../index'
import type { DiffOptions, DiffResult } from '@shared/types'

/**
 * Diff Worker 线程脚本
 * 在 Worker 线程中执行大文件的差异计算，避免阻塞主进程
 * 
 * 参考: TextDiff-DevPlan.md §2.8.2 Worker Pool
 * 参考: TextDiff-Module-Design.md §2.1.5 大文件处理
 */

// Worker 任务类型
interface WorkerTask {
  id: string
  left: string
  right: string
  options: DiffOptions
}

// Worker 进度更新
interface WorkerProgress {
  type: 'progress'
  taskId: string
  stage: 'preprocessing' | 'computing' | 'building' | 'complete'
  percent: number
  message?: string
}

// Worker 结果
interface WorkerResult {
  type: 'result'
  taskId: string
  result: DiffResult
  error?: string
}

// Worker 错误
interface WorkerError {
  type: 'error'
  taskId: string
  error: string
}

type WorkerMessage = WorkerProgress | WorkerResult | WorkerError

/**
 * 发送消息到主线程
 */
function sendMessage(message: WorkerMessage): void {
  if (parentPort) {
    parentPort.postMessage(message)
  }
}

/**
 * 发送进度更新
 */
function sendProgress(
  taskId: string,
  stage: WorkerProgress['stage'],
  percent: number,
  message?: string
): void {
  sendMessage({
    type: 'progress',
    taskId,
    stage,
    percent,
    message
  })
}

/**
 * 执行差异计算任务
 */
async function executeTask(task: WorkerTask): Promise<void> {
  const { id, left, right, options } = task
  
  try {
    // 预处理阶段
    sendProgress(id, 'preprocessing', 10, '预处理文本内容...')
    
    // 计算阶段 - 使用自定义 computeDiff 以支持进度回调
    sendProgress(id, 'computing', 30, '计算行级差异...')
    
    // 构建结果阶段
    sendProgress(id, 'building', 80, '构建差异结果...')
    
    const result = await computeDiff(left, right, options)
    
    // 完成
    sendProgress(id, 'complete', 100, '完成')
    
    sendMessage({
      type: 'result',
      taskId: id,
      result
    })
  } catch (error) {
    sendMessage({
      type: 'error',
      taskId: id,
      error: error instanceof Error ? error.message : String(error)
    })
  }
}

// 监听来自主线程的消息
if (parentPort) {
  parentPort.on('message', (task: WorkerTask) => {
    if (!task.id) {
      sendMessage({
        type: 'error',
        taskId: 'unknown',
        error: 'Invalid task: missing task ID'
      })
      return
    }
    
    executeTask(task)
  })
}

// 导出类型供主线程使用
export type { WorkerTask, WorkerProgress, WorkerResult, WorkerError, WorkerMessage }
