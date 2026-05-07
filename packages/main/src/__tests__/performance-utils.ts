/**
 * 性能基准测试工具
 * Week 12 - 性能测试
 * 
 * 用于测试：
 * - Diff 计算性能
 * - 大文件滚动性能（60fps）
 * - 内存占用
 */

export interface PerformanceMetrics {
  /** 操作名称 */
  operation: string
  /** 执行时间（毫秒） */
  duration: number
  /** 内存使用增量（MB） */
  memoryDelta: number
  /** 时间戳 */
  timestamp: number
}

export interface ScrollPerformanceMetrics {
  /** 滚动距离 */
  scrollDistance: number
  /** 滚动持续时间 */
  duration: number
  /** 平均帧率 */
  averageFps: number
  /** 最小帧率 */
  minFps: number
  /** 掉帧次数 */
  droppedFrames: number
}

/**
 * 性能测量类
 */
export class PerformanceBenchmark {
  private metrics: PerformanceMetrics[] = []
  private startTime: number = 0
  private startMemory: number = 0

  /**
   * 开始测量
   */
  start(): void {
    this.startTime = performance.now()
    this.startMemory = this.getMemoryUsage()
  }

  /**
   * 结束测量并记录
   */
  end(operation: string): PerformanceMetrics {
    const duration = performance.now() - this.startTime
    const memoryDelta = this.getMemoryUsage() - this.startMemory
    
    const metric: PerformanceMetrics = {
      operation,
      duration,
      memoryDelta,
      timestamp: Date.now()
    }
    
    this.metrics.push(metric)
    return metric
  }

  /**
   * 获取当前内存使用（MB）
   */
  private getMemoryUsage(): number {
    if (performance.memory) {
      return performance.memory.usedJSHeapSize / 1024 / 1024
    }
    return 0
  }

  /**
   * 获取所有指标
   */
  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics]
  }

  /**
   * 清空指标
   */
  clear(): void {
    this.metrics = []
  }

  /**
   * 获取统计摘要
   */
  getSummary(): {
    totalOperations: number
    totalDuration: number
    averageDuration: number
    totalMemoryDelta: number
  } {
    const totalDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0)
    const totalMemoryDelta = this.metrics.reduce((sum, m) => sum + m.memoryDelta, 0)
    
    return {
      totalOperations: this.metrics.length,
      totalDuration,
      averageDuration: this.metrics.length > 0 ? totalDuration / this.metrics.length : 0,
      totalMemoryDelta
    }
  }
}

/**
 * 滚动性能测量
 */
export class ScrollPerformanceTester {
  private frames: number[] = []
  private rafId: number | null = null
  private isRunning = false

  /**
   * 开始测量滚动性能
   */
  startMeasurement(): void {
    this.frames = []
    this.isRunning = true
    this.measureFrame()
  }

  /**
   * 停止测量
   */
  stopMeasurement(): ScrollPerformanceMetrics {
    this.isRunning = false
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
    }

    return this.calculateMetrics()
  }

  /**
   * 测量单个帧
   */
  private measureFrame = (): void => {
    if (!this.isRunning) return
    
    this.frames.push(performance.now())
    
    // 保持最多 60 帧的数据
    if (this.frames.length > 60) {
      this.frames.shift()
    }
    
    this.rafId = requestAnimationFrame(this.measureFrame)
  }

  /**
   * 计算性能指标
   */
  private calculateMetrics(): ScrollPerformanceMetrics {
    if (this.frames.length < 2) {
      return {
        scrollDistance: 0,
        duration: 0,
        averageFps: 0,
        minFps: 0,
        droppedFrames: 0
      }
    }

    const frameDurations: number[] = []
    let droppedFrames = 0
    
    for (let i = 1; i < this.frames.length; i++) {
      const duration = this.frames[i] - this.frames[i - 1]
      frameDurations.push(duration)
      
      // 超过 33.33ms（约 30fps）认为是掉帧
      if (duration > 33.33) {
        droppedFrames++
      }
    }

    const avgFrameDuration = frameDurations.reduce((a, b) => a + b, 0) / frameDurations.length
    const maxFrameDuration = Math.max(...frameDurations)
    
    return {
      scrollDistance: 0, // 需要外部传入
      duration: this.frames[this.frames.length - 1] - this.frames[0],
      averageFps: 1000 / avgFrameDuration,
      minFps: 1000 / maxFrameDuration,
      droppedFrames
    }
  }
}

/**
 * 生成测试数据
 */
export function generateTestContent(
  lineCount: number,
  pattern: 'sequential' | 'random' | 'repeated' = 'sequential'
): string {
  const lines: string[] = []
  
  for (let i = 0; i < lineCount; i++) {
    switch (pattern) {
      case 'sequential':
        lines.push(`Line ${i + 1}: This is a test line with some content ${i % 10}`)
        break
      case 'random':
        lines.push(`Line ${i + 1}: ${Math.random().toString(36).substring(7)}`)
        break
      case 'repeated':
        lines.push(`Line ${i + 1}: Repeated content pattern ${i % 5}`)
        break
    }
  }
  
  return lines.join('\n')
}

/**
 * 生成大文件（用于测试）
 */
export function generateLargeFile(
  lineCount: number,
  modifications: { line: number; content: string }[] = []
): { original: string; modified: string } {
  const originalLines: string[] = []
  const modifiedLines: string[] = []
  
  for (let i = 0; i < lineCount; i++) {
    const line = `Line ${i + 1}: This is line content with index ${i}`
    originalLines.push(line)
    modifiedLines.push(line)
  }
  
  // 应用修改
  for (const mod of modifications) {
    if (mod.line >= 0 && mod.line < lineCount) {
      modifiedLines[mod.line] = mod.content
    }
  }
  
  return {
    original: originalLines.join('\n'),
    modified: modifiedLines.join('\n')
  }
}

/**
 * 性能测试场景
 */
export const PERFORMANCE_THRESHOLDS = {
  /** Diff 计算时间阈值（毫秒）- 10万行文件 */
  diffComputeTime: 2000,
  /** 重新 Diff 时间阈值（毫秒） */
  rediffTime: 500,
  /** 最小可接受帧率 */
  minFps: 60,
  /** 最大内存占用（MB） */
  maxMemory: 200
}

/**
 * 运行性能测试套件
 */
export async function runPerformanceTests(): Promise<{
  diffCompute: PerformanceMetrics
  scrollPerformance: ScrollPerformanceMetrics
  passed: boolean
}> {
  const benchmark = new PerformanceBenchmark()
  const scrollTester = new ScrollPerformanceTester()
  
  // 测试 1：Diff 计算性能
  console.log('[PerformanceTest] Testing diff compute performance...')
  benchmark.start()
  
  const { generateLargeFile } = await import('./performance-utils')
  const { computeDiff } = await import('../diff')
  
  const { original, modified } = generateLargeFile(100000, [
    { line: 1000, content: 'Modified line 1000' },
    { line: 50000, content: 'Modified line 50000' }
  ])
  
  await computeDiff(original, modified, { algorithm: 'myers' })
  const diffMetric = benchmark.end('diff-compute-100k')
  
  // 测试 2：滚动性能（模拟）
  console.log('[PerformanceTest] Testing scroll performance...')
  scrollTester.startMeasurement()
  
  // 模拟滚动操作
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  const scrollMetric = scrollTester.stopMeasurement()
  
  // 评估结果
  const passed = 
    diffMetric.duration < PERFORMANCE_THRESHOLDS.diffComputeTime &&
    scrollMetric.averageFps >= PERFORMANCE_THRESHOLDS.minFps
  
  return {
    diffCompute: diffMetric,
    scrollPerformance: scrollMetric,
    passed
  }
}
