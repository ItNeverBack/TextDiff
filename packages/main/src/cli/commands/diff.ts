import { Command } from 'commander'
import { readFileSync } from 'fs'
import { computeDiff } from '../../diff'
import { outputUnifiedDiff, outputSideBySideDiff } from '../output'
import type { DiffOptions, WhitespaceMode, DiffAlgorithm } from '@shared/types'

/**
 * Diff 命令 - 输出文本差异到 stdout
 * textdiff diff <file1> <file2> [--ignore-whitespace] [--ignore-case] [--output]
 * 
 * 参考: TextDiff-DevPlan.md §2.8.1 CLI 模块
 */
export function registerDiffCommand(program: Command): void {
  program
    .command('diff')
    .description('对比两个文件并输出差异到标准输出')
    .argument('<file1>', '左侧文件路径')
    .argument('<file2>', '右侧文件路径')
    .option('-w, --ignore-whitespace <mode>', '忽略空白符 (none|leading-trailing|all)', 'none')
    .option('-i, --ignore-case', '忽略大小写差异', false)
    .option('-l, --ignore-line-endings', '忽略行尾符差异 (CRLF vs LF)', true)
    .option('-o, --output <format>', '输出格式 (unified|side-by-side)', 'unified')
    .option('--context <lines>', '上下文行数', '3')
    .option('--algorithm <algo>', '差异算法 (myers|patience|histogram)', 'myers')
    .action(async (file1: string, file2: string, options: DiffCommandOptions) => {
      try {
        await executeDiff(file1, file2, options)
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error))
        process.exit(1)
      }
    })
}

interface DiffCommandOptions {
  ignoreWhitespace: string
  ignoreCase: boolean
  ignoreLineEndings: boolean
  output: 'unified' | 'side-by-side'
  context: string
  algorithm: string
}

/**
 * 执行 diff 命令
 */
async function executeDiff(
  file1: string,
  file2: string,
  options: DiffCommandOptions
): Promise<void> {
  // 读取文件内容
  const leftContent = readFileContent(file1)
  const rightContent = readFileContent(file2)

  // 构建 diff 选项
  const diffOptions: Partial<DiffOptions> = {
    ignoreWhitespace: validateWhitespaceMode(options.ignoreWhitespace),
    ignoreCase: options.ignoreCase,
    ignoreLineEndings: options.ignoreLineEndings,
    algorithm: validateAlgorithm(options.algorithm),
    contextLines: parseInt(options.context, 10)
  }

  // 计算差异
  const result = await computeDiff(leftContent, rightContent, diffOptions)

  // 输出结果
  if (options.output === 'side-by-side') {
    console.log(outputSideBySideDiff(result, file1, file2))
  } else {
    console.log(outputUnifiedDiff(result, file1, file2))
  }

  // 根据是否有差异设置退出码
  const hasDifferences = result.stats.insertedLines > 0 || 
                         result.stats.deletedLines > 0 || 
                         result.stats.modifiedLines > 0
  
  if (hasDifferences) {
    process.exitCode = 1
  }
}

/**
 * 读取文件内容
 */
function readFileContent(path: string): string {
  try {
    return readFileSync(path, 'utf-8')
  } catch (error) {
    throw new Error(`无法读取文件 "${path}": ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * 验证空白符处理模式
 */
function validateWhitespaceMode(mode: string): WhitespaceMode {
  const validModes: WhitespaceMode[] = ['none', 'leading-trailing', 'all']
  if (validModes.includes(mode as WhitespaceMode)) {
    return mode as WhitespaceMode
  }
  console.warn(`无效的空白符处理模式 "${mode}"，使用默认值 "none"`)
  return 'none'
}

/**
 * 验证差异算法
 */
function validateAlgorithm(algo: string): DiffAlgorithm {
  const validAlgos: DiffAlgorithm[] = ['myers', 'patience', 'histogram']
  if (validAlgos.includes(algo as DiffAlgorithm)) {
    return algo as DiffAlgorithm
  }
  console.warn(`无效的算法 "${algo}"，使用默认值 "myers"`)
  return 'myers'
}
