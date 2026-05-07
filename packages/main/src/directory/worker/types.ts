/**
 * Worker 类型定义
 * 目录对比 Worker 的消息类型
 */

// ============================================
// 任务类型
// ============================================
export type WorkerTaskType = 'scan' | 'hash' | 'compare';

// ============================================
// 基础任务接口
// ============================================
export interface WorkerTask {
  id: string;
  type: WorkerTaskType;
  payload: unknown;
}

// ============================================
// 扫描任务
// ============================================
export interface ScanTask extends WorkerTask {
  type: 'scan';
  payload: {
    rootPath: string;
    relativePath: string;
    options: {
      recursive: boolean;
      maxDepth?: number;
      filters: unknown[];
    };
  };
}

// ============================================
// 哈希任务
// ============================================
export interface HashTask extends WorkerTask {
  type: 'hash';
  payload: {
    filePath: string;
    algorithm?: 'md5' | 'sha256';
  };
}

// ============================================
// 对比任务
// ============================================
export interface CompareTask extends WorkerTask {
  type: 'compare';
  payload: {
    leftPath: string;
    rightPath: string;
    compareMode: 'name' | 'size' | 'content' | 'full';
  };
}

// ============================================
// Worker 消息类型
// ============================================
export type WorkerMessage =
  | WorkerInitMessage
  | WorkerTaskMessage
  | WorkerProgressMessage
  | WorkerResultMessage
  | WorkerErrorMessage
  | WorkerExitMessage;

// 初始化消息
export interface WorkerInitMessage {
  type: 'init';
  workerId: number;
}

// 任务消息
export interface WorkerTaskMessage {
  type: 'task';
  task: WorkerTask;
}

// 进度消息
export interface WorkerProgressMessage {
  type: 'progress';
  taskId: string;
  progress: number;
  message?: string;
}

// 结果消息
export interface WorkerResultMessage {
  type: 'result';
  taskId: string;
  result: unknown;
}

// 错误消息
export interface WorkerErrorMessage {
  type: 'error';
  taskId: string;
  error: string;
}

// 退出消息
export interface WorkerExitMessage {
  type: 'exit';
  workerId: number;
  code: number;
}

// ============================================
// Worker 状态
// ============================================
export type WorkerStatus = 'idle' | 'busy' | 'error' | 'terminated';

export interface WorkerInfo {
  id: number;
  status: WorkerStatus;
  currentTask?: string;
}

// ============================================
// Worker 池配置
// ============================================
export interface WorkerPoolConfig {
  /** Worker 数量，默认使用 CPU 核心数 */
  workerCount?: number;
  /** 任务队列最大长度 */
  maxQueueSize?: number;
  /** 任务超时时间（毫秒） */
  taskTimeout?: number;
  /** 空闲 Worker 自动终止时间（毫秒） */
  idleTimeout?: number;
}

// ============================================
// Worker 池统计
// ============================================
export interface WorkerPoolStats {
  totalWorkers: number;
  idleWorkers: number;
  busyWorkers: number;
  queuedTasks: number;
  completedTasks: number;
  failedTasks: number;
}
