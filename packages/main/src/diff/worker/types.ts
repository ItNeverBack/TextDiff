import type { DiffOptions, DiffResult } from '@shared/types'

/**
 * Worker 通信类型定义
 */

// Worker 任务
export interface WorkerTask {
  id: string
  left: string
  right: string
  options: DiffOptions
}

// Worker 进度更新
export interface WorkerProgress {
  type: 'progress'
  taskId: string
  stage: 'preprocessing' | 'computing' | 'building' | 'complete'
  percent: number
  message?: string
}

// Worker 结果
export interface WorkerResult {
  type: 'result'
  taskId: string
  result: DiffResult
}

// Worker 错误
export interface WorkerError {
  type: 'error'
  taskId: string
  error: string
}

export type WorkerMessage = WorkerProgress | WorkerResult | WorkerError

// 进度回调函数类型
export type ProgressCallback = (progress: WorkerProgress) => void
