import { Command } from 'commander'
import { readFileSync, writeFileSync } from 'fs'
import { computeThreeWayDiff } from '../../diff/three-way'
import type { FileInfo } from '@shared/types'

/**
 * Merge 命令 - 三路合并
 * textdiff merge <base> <left> <right> -o <output>
 * 
 * 参考: TextDiff-Module-Design.md §2.6.3 命令结构
 */
export function registerMergeCommand(program: Command): void {
  program
    .command('merge')
    .description('三路合并冲突解决')
    .argument('<base>', '基准文件路径 (共同祖先)')
    .argument('<left>', '左侧文件路径 (当前分支)')
    .argument('<right>', '右侧文件路径 (要合并的分支)')
    .requiredOption('-o, --output <path>', '合并结果输出文件路径')
    .option('--auto', '自动合并，遇到冲突时失败', false)
    .option('--marker-size <size>', '冲突标记大小', '7')
    .action(async (base: string, left: string, right: string, options: MergeCommandOptions) => {
      try {
        await executeMerge(base, left, right, options)
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error))
        process.exit(1)
      }
    })
}

interface MergeCommandOptions {
  output: string
  auto: boolean
  markerSize: string
}

/**
 * 执行 merge 命令
 */
async function executeMerge(
  basePath: string,
  leftPath: string,
  rightPath: string,
  options: MergeCommandOptions
): Promise<void> {
  // 读取文件内容
  const baseContent = readFileContent(basePath)
  const leftContent = readFileContent(leftPath)
  const rightContent = readFileContent(rightPath)

  // 创建 FileInfo 对象
  const baseFile: FileInfo = {
    path: basePath,
    content: baseContent,
    encoding: 'utf-8',
    lineEnding: 'lf',
    size: baseContent.length,
    mtime: Date.now(),
    language: 'plaintext'
  }

  const leftFile: FileInfo = {
    path: leftPath,
    content: leftContent,
    encoding: 'utf-8',
    lineEnding: 'lf',
    size: leftContent.length,
    mtime: Date.now(),
    language: 'plaintext'
  }

  const rightFile: FileInfo = {
    path: rightPath,
    content: rightContent,
    encoding: 'utf-8',
    lineEnding: 'lf',
    size: rightContent.length,
    mtime: Date.now(),
    language: 'plaintext'
  }

  // 计算三路差异
  const result = await computeThreeWayDiff(baseFile, leftFile, rightFile)

  // 检查是否有冲突
  const hasConflicts = result.conflicts.length > 0

  if (hasConflicts && options.auto) {
    console.error(`合并失败：发现 ${result.conflicts.length} 个冲突`)
    console.error('使用 --auto 模式时遇到冲突会导致失败')
    console.error('请移除 --auto 标志以生成分冲突标记的输出文件')
    process.exit(2)
  }

  // 生成合并输出
  const markerSize = parseInt(options.markerSize, 10)
  const mergedContent = generateMergeOutput(
    baseContent.split('\n'),
    result.conflicts,
    basePath,
    leftPath,
    rightPath,
    markerSize
  )

  // 写入输出文件
  try {
    writeFileSync(options.output, mergedContent, 'utf-8')
  } catch (error) {
    throw new Error(`无法写入输出文件 "${options.output}": ${error instanceof Error ? error.message : String(error)}`)
  }

  // 输出结果信息
  if (hasConflicts) {
    console.log(`合并完成，发现 ${result.conflicts.length} 个冲突`)
    console.log(`冲突已标记在输出文件中: ${options.output}`)
    console.log('请手动解决冲突后保存文件')
    process.exitCode = 1
  } else {
    console.log(`合并成功完成: ${options.output}`)
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
 * 生成合并输出（包含冲突标记）
 */
function generateMergeOutput(
  baseLines: string[],
  conflicts: Array<{
    startLine: number
    endLine: number
    baseContent: string
    leftContent: string
    rightContent: string
  }>,
  basePath: string,
  leftPath: string,
  rightPath: string,
  markerSize: number
): string {
  const leftMarker = '<'.repeat(markerSize)
  const dividerMarker = '='.repeat(markerSize)
  const rightMarker = '>'.repeat(markerSize)

  // 如果没有冲突，直接返回基准内容（因为无冲突时 base=left=right 的公共部分）
  if (conflicts.length === 0) {
    return baseLines.join('\n')
  }

  // 插入冲突标记
  const result: string[] = []
  let currentLine = 0

  for (const conflict of conflicts) {
    // 添加冲突前的内容
    while (currentLine < conflict.startLine) {
      result.push(baseLines[currentLine])
      currentLine++
    }

    // 添加冲突标记和左侧内容
    result.push(`${leftMarker} ${leftPath}`)
    if (conflict.leftContent) {
      result.push(...conflict.leftContent.split('\n'))
    }
    
    // 添加分隔符和基准内容（可选）
    result.push(`${dividerMarker} ${basePath}`)
    if (conflict.baseContent) {
      result.push(...conflict.baseContent.split('\n'))
    }
    
    // 添加右侧内容和结束标记
    result.push(`${rightMarker} ${rightPath}`)
    if (conflict.rightContent) {
      result.push(...conflict.rightContent.split('\n'))
    }

    // 跳过冲突区域的内容
    currentLine = conflict.endLine + 1
  }

  // 添加剩余内容
  while (currentLine < baseLines.length) {
    result.push(baseLines[currentLine])
    currentLine++
  }

  return result.join('\n')
}
