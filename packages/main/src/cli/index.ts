#!/usr/bin/env node
import { Command } from 'commander'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { registerGuiCommand } from './commands/gui'
import { registerDiffCommand } from './commands/diff'
import { registerMergeCommand } from './commands/merge'

/**
 * CLI 入口模块
 * 
 * 命令结构:
 * textdiff [file1] [file2]           # 启动 GUI 并打开指定文件
 * textdiff diff <file1> <file2>      # 输出文本差异到 stdout
 * textdiff merge <base> <left> <right> -o <output>  # 三路合并
 * 
 * 选项:
 * --ignore-whitespace <mode>  # none | leading-trailing | all
 * --ignore-case               # 忽略大小写
 * --ignore-line-endings       # 忽略行尾符差异
 * -o, --output <format>      # unified | side-by-side
 * --auto                      # 自动合并，冲突时失败
 * 
 * 参考: TextDiff-Module-Design.md §2.6 CLI 模块
 * 参考: TextDiff-DevPlan.md §2.8.1 CLI 模块
 */

const __dirname = dirname(fileURLToPath(import.meta.url))

function getVersion(): string {
  try {
    const pkgPath = resolve(__dirname, '../../../package.json')
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
    return pkg.version || '0.0.0'
  } catch {
    return '0.0.0'
  }
}

const program = new Command()

program
  .name('textdiff')
  .description('专业文本对比工具 - Professional text comparison tool')
  .version(getVersion(), '-v, --version', '显示版本号')
  .helpOption('-h, --help', '显示帮助信息')
  .configureHelp({
    sortSubcommands: true,
    sortOptions: true
  })

// 注册命令
registerGuiCommand(program)
registerDiffCommand(program)
registerMergeCommand(program)

// 自定义帮助文本
program.addHelpText('after', `
示例:
  $ textdiff                          # 启动 GUI
  $ textdiff file1.txt file2.txt      # 启动 GUI 并打开文件
  $ textdiff diff a.txt b.txt         # 输出 unified diff
  $ textdiff diff a.txt b.txt -o side-by-side  # 并排输出
  $ textdiff merge base.txt left.txt right.txt -o result.txt  # 三路合并

Git 集成:
  git config --global diff.tool textdiff
  git config --global difftool.textdiff.cmd 'textdiff diff "$LOCAL" "$REMOTE"'
`)

/**
 * 解析命令行参数并执行
 * 注意：CLI 模式不启动 Electron GUI
 */
export function runCli(): void {
  program.parse()
}

/**
 * 程序化运行 CLI（用于测试）
 */
export async function runCliAsync(args: string[]): Promise<void> {
  program.parse(args)
}

export { program }
export * from './commands/gui'
export * from './commands/diff'
export * from './commands/merge'
export * from './output'
