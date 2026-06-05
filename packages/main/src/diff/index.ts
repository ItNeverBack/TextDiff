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

  // 构建差异行（使用原始内容，行号映射回原始文件行号）
  const diffLines = buildDiffLines(
    leftPreprocessResult.filtered,
    rightPreprocessResult.filtered,
    diffOps,
    leftPreprocessResult.indices,
    rightPreprocessResult.indices
  )

  // 将被忽略的行插入到 diffLines 中，标记为 isIgnored: true
  // 这样编辑器可以将这些行显示为灰色
  const diffLinesWithIgnored = insertIgnoredLines(
    diffLines,
    leftPreprocessResult.originalLines,
    rightPreprocessResult.originalLines,
    leftPreprocessResult.ignoredLineIndices,
    rightPreprocessResult.ignoredLineIndices
  )

  // 计算内联差异（字符级）
  for (const line of diffLinesWithIgnored) {
    if (line.type === 'replace' && !line.isIgnored) {
      line.inlineDiff = computeInlineDiff(line.leftContent, line.rightContent)
    }
  }

  // 构建差异块
  const chunks = buildChunks(diffLinesWithIgnored, contextLines)

  // 计算统计信息
  const stats = calculateStats(diffLinesWithIgnored, chunks)

  return {
    lines: diffLinesWithIgnored,
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
  diffOps: DiffOp[],
  leftIndices: number[],
  rightIndices: number[]
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
        line.leftLineNo = leftIndices[op.leftIndex] + 1
        line.rightLineNo = rightIndices[op.rightIndex] + 1
        line.leftContent = leftLines[op.leftIndex]
        line.rightContent = rightLines[op.rightIndex]
        break
      case 'delete':
        line.leftLineNo = leftIndices[op.leftIndex] + 1
        line.leftContent = leftLines[op.leftIndex]
        break
      case 'insert':
        line.rightLineNo = rightIndices[op.rightIndex] + 1
        line.rightContent = rightLines[op.rightIndex]
        break
      case 'replace':
        line.leftLineNo = leftIndices[op.leftIndex] + 1
        line.rightLineNo = rightIndices[op.rightIndex] + 1
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

/**
 * 将被忽略的行（注释行、正则过滤行）插入到 diffLines 中，标记 isIgnored: true
 *
 * diff 算法只看到过滤后的行，所以被忽略的行不在 diffLines 里。
 * 我们按原始行号把它们插入回去，这样编辑器可以显示为灰色。
 *
 * 策略：按左侧原始行号对 diffLines 进行排序，然后在正确位置插入被忽略行。
 * 被忽略行在两侧都显示（leftLineNo 和 rightLineNo 对应各自文件中的行号），
 * 类型为 'equal'，isIgnored: true。
 *
 * 注意：左侧被忽略行和右侧被忽略行是独立插入的——左侧插入 leftLineNo，右侧插入 rightLineNo。
 * 由于忽略规则是对称应用的（相同的注释前缀），实践中同一行内容两侧都会被忽略，
 * 所以我们合并对应的行（按行号顺序贪心匹配）以减少视觉噪音。
 */
function insertIgnoredLines(
  diffLines: DiffLine[],
  leftOriginalLines: string[],
  rightOriginalLines: string[],
  leftIgnoredIndices: Set<number>,
  rightIgnoredIndices: Set<number>
): DiffLine[] {
  if (leftIgnoredIndices.size === 0 && rightIgnoredIndices.size === 0) {
    return diffLines
  }

  // 构建结果数组，在已有的 diffLines 中按行号顺序插入被忽略行
  // diffLines 中的行通过 leftLineNo / rightLineNo 标识位置（1-based）
  // ignoredIndices 是 0-based 的原始行索引

  // 将忽略行转换为 1-based 行号的有序数组
  const leftIgnored = Array.from(leftIgnoredIndices).sort((a, b) => a - b).map(i => i + 1)
  const rightIgnored = Array.from(rightIgnoredIndices).sort((a, b) => a - b).map(i => i + 1)

  // 构建被忽略行列表（DiffLine），贪心配对左右：若左右的行内容相同则合并为一行
  const ignoredLineMap = new Map<string, DiffLine>()

  // 逐一匹配左右忽略行（按行号）
  let li = 0, ri = 0
  const pairedLines: DiffLine[] = []

  while (li < leftIgnored.length || ri < rightIgnored.length) {
    const leftLineNo = li < leftIgnored.length ? leftIgnored[li] : Infinity
    const rightLineNo = ri < rightIgnored.length ? rightIgnored[ri] : Infinity

    const leftContent = leftLineNo !== Infinity ? leftOriginalLines[leftLineNo - 1] : ''
    const rightContent = rightLineNo !== Infinity ? rightOriginalLines[rightLineNo - 1] : ''

    if (leftLineNo === Infinity) {
      // 只有右侧
      pairedLines.push({
        leftLineNo: null,
        rightLineNo: rightLineNo as number,
        type: 'equal',
        leftContent: '',
        rightContent,
        isIgnored: true
      })
      ri++
    } else if (rightLineNo === Infinity) {
      // 只有左侧
      pairedLines.push({
        leftLineNo: leftLineNo as number,
        rightLineNo: null,
        type: 'equal',
        leftContent,
        rightContent: '',
        isIgnored: true
      })
      li++
    } else if (leftContent === rightContent) {
      // 内容相同，合并为一行（两侧均显示）
      pairedLines.push({
        leftLineNo: leftLineNo as number,
        rightLineNo: rightLineNo as number,
        type: 'equal',
        leftContent,
        rightContent,
        isIgnored: true
      })
      li++
      ri++
    } else if (leftLineNo <= rightLineNo) {
      // 左侧行号更小，先插入左侧
      pairedLines.push({
        leftLineNo: leftLineNo as number,
        rightLineNo: null,
        type: 'equal',
        leftContent,
        rightContent: '',
        isIgnored: true
      })
      li++
    } else {
      // 右侧行号更小，先插入右侧
      pairedLines.push({
        leftLineNo: null,
        rightLineNo: rightLineNo as number,
        type: 'equal',
        leftContent: '',
        rightContent,
        isIgnored: true
      })
      ri++
    }
  }

  // 忽略行的 key 用于去重
  for (const line of pairedLines) {
    const key = `L${line.leftLineNo ?? ''}R${line.rightLineNo ?? ''}`
    ignoredLineMap.set(key, line)
  }

  // 把 diffLines 和 ignoredLines 合并，按左侧行号排序（null 排后）
  const allLines: DiffLine[] = [...diffLines, ...ignoredLineMap.values()]

  allLines.sort((a, b) => {
    // 获取代表该行位置的行号（优先用左侧，没有就用右侧）
    const aLine = a.leftLineNo ?? (a.rightLineNo ?? 0)
    const bLine = b.leftLineNo ?? (b.rightLineNo ?? 0)
    if (aLine !== bLine) return aLine - bLine
    // 行号相同时，非忽略行排在忽略行前面
    if (a.isIgnored && !b.isIgnored) return 1
    if (!a.isIgnored && b.isIgnored) return -1
    return 0
  })

  return allLines
}
