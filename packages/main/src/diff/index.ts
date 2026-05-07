import type { DiffLine, DiffLineType, DiffResult, DiffOptions, InlineDiffSegment, ThreeWayDiffResult, WhitespaceMode, DiffAlgorithm } from '@shared/types'
import { myersDiff } from './myers'
import { patienceDiff } from './patience'
import { histogramDiff } from './histogram'
import { computeInlineDiff } from './inline'
import { buildChunks } from './chunk-builder'
import { calculateStats } from './stats-calculator'
import { preprocessContent, preprocessLinesForComparison } from '../ignore'

export { myersDiff, patienceDiff, histogramDiff, computeInlineDiff, buildChunks, calculateStats }

// Export Worker Pool for large file processing
export {
  getWorkerPool,
  computeDiffWithWorkerPool,
  type WorkerTask,
  type WorkerProgress,
  type WorkerResult,
  type WorkerError,
  type WorkerMessage,
  type ProgressCallback
} from './worker'

// Week 12: Export cache and incremental diff
export {
  computeDiffWithCache,
  computeDiffFromFiles,
  clearDiffCache,
  getDiffCacheStats
} from './cache'

export {
  computeIncrementalDiff,
  computeSmartDiff,
  mergePartialDiffResult,
  type IncrementalDiffOptions
} from './incremental'

// Export diff sync functionality
export {
  syncDiff,
  syncAllDiffs,
  type SyncDirection,
  type SyncOptions,
  type SyncResult
} from './sync'

// §2.1.3 DiffEngine 核心接口
export interface DiffEngine {
  compute(left: string, right: string, options: DiffOptions): Promise<DiffResult>
  computeInline(leftLine: string, rightLine: string): InlineDiffSegment[]
  computeThreeWay(base: string, left: string, right: string): Promise<ThreeWayDiffResult>
}

/**
 * 根据算法类型选择合适的 diff 算法
 * @param algorithm 算法类型
 * @returns diff 函数
 */
function getDiffAlgorithm(algorithm: DiffAlgorithm): (a: string[], b: string[]) => DiffOp[] {
  switch (algorithm) {
    case 'patience':
      return patienceDiff
    case 'histogram':
      return histogramDiff
    case 'myers':
    default:
      return myersDiff
  }
}

/**
 * 计算文本差异 - 使用 DiffOptions 的部分字段
 * 提供默认值以兼容不同的调用场景
 * 
 * §2.1.4 DiffEngine 处理流程
 * 1. 使用 IgnoreRuleEngine 进行预处理（空白符、大小写、行尾符、正则过滤）
 * 2. 使用选择的算法（Myers/Patience/Histogram）计算行级差异
 * 3. 构建 DiffLine 数组
 * 4. 对替换行计算字符级内联差异
 * 5. 构建 DiffChunk
 * 6. 计算统计数据
 */
export async function computeDiff(
  left: string,
  right: string,
  options: Partial<DiffOptions> = {}
): Promise<DiffResult> {
  const {
    ignoreWhitespace = 'none' as WhitespaceMode,
    ignoreCase = false,
    ignoreLineEndings = true,
    ignorePatterns = [] as string[],
    ignoreComments = false,
    commentPrefixes = [] as string[],
    algorithm = 'myers' as DiffAlgorithm,
    contextLines = 3
  } = options

  // §2.4.3 IgnoreRuleEngine - 使用新的预处理器进行预处理
  const leftPreprocessResult = preprocessContent(left, {
    ignoreWhitespace,
    ignoreCase,
    ignoreLineEndings,
    ignorePatterns,
    ignoreComments,
    commentPrefixes
  })

  const rightPreprocessResult = preprocessContent(right, {
    ignoreWhitespace,
    ignoreCase,
    ignoreLineEndings,
    ignorePatterns,
    ignoreComments,
    commentPrefixes
  })

  // 对过滤后的行进行比较前的额外预处理
  const processedLeft = preprocessLinesForComparison(
    leftPreprocessResult.filtered,
    { ignoreWhitespace, ignoreCase, ignoreLineEndings }
  )
  const processedRight = preprocessLinesForComparison(
    rightPreprocessResult.filtered,
    { ignoreWhitespace, ignoreCase, ignoreLineEndings }
  )

  // §2.1.2 选择并执行 diff 算法
  const diffFn = getDiffAlgorithm(algorithm)
  const rawDiffOps = diffFn(processedLeft, processedRight)
  
  // 合并相邻的 delete + insert 为 replace
  const diffOps = mergeReplaceOperations(rawDiffOps)

  // 构建差异行（使用原始内容）
  const diffLines = buildDiffLines(
    leftPreprocessResult.filtered,
    rightPreprocessResult.filtered,
    diffOps
  )

  // 计算内联差异（字符级）
  for (const line of diffLines) {
    if (line.type === 'replace') {
      line.inlineDiff = computeInlineDiff(line.leftContent, line.rightContent)
    }
  }

  // 构建差异块
  const chunks = buildChunks(diffLines, contextLines)

  // 计算统计信息
  const stats = calculateStats(diffLines, chunks)

  return {
    lines: diffLines,
    chunks,
    stats,
    computedAt: Date.now()
  }
}

interface DiffOp {
  type: DiffLineType
  leftIndex: number
  rightIndex: number
}

function buildDiffLines(
  leftLines: string[],
  rightLines: string[],
  diffOps: DiffOp[]
): DiffLine[] {
  const result: DiffLine[] = []

  for (const op of diffOps) {
    const line: DiffLine = {
      leftLineNo: null,
      rightLineNo: null,
      type: op.type,
      leftContent: '',
      rightContent: ''
    }

    switch (op.type) {
      case 'equal':
        line.leftLineNo = op.leftIndex + 1
        line.rightLineNo = op.rightIndex + 1
        line.leftContent = leftLines[op.leftIndex]
        line.rightContent = rightLines[op.rightIndex]
        break
      case 'delete':
        line.leftLineNo = op.leftIndex + 1
        line.leftContent = leftLines[op.leftIndex]
        break
      case 'insert':
        line.rightLineNo = op.rightIndex + 1
        line.rightContent = rightLines[op.rightIndex]
        break
      case 'replace':
        line.leftLineNo = op.leftIndex + 1
        line.rightLineNo = op.rightIndex + 1
        line.leftContent = leftLines[op.leftIndex]
        line.rightContent = rightLines[op.rightIndex]
        break
    }

    result.push(line)
  }

  return result
}

/**
 * 合并相邻的 delete + insert 为 replace
 */
function mergeReplaceOperations(ops: DiffOp[]): DiffOp[] {
  const result: DiffOp[] = []

  for (let i = 0; i < ops.length; i++) {
    const op = ops[i]

    // 将相邻的 delete + insert 合并为 replace
    if (op.type === 'delete' && i + 1 < ops.length) {
      const nextOp = ops[i + 1]
      if (nextOp.type === 'insert') {
        result.push({
          type: 'replace',
          leftIndex: op.leftIndex,
          rightIndex: nextOp.rightIndex
        })
        i++ // 跳过下一个 insert
        continue
      }
    }

    result.push(op)
  }

  return result
}
