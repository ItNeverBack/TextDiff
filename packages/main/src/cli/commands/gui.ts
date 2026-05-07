import { Command } from 'commander'
import { app } from 'electron'

// Extend global to store CLI files
declare global {
  // eslint-disable-next-line no-var
  var cliFiles: { left?: string; right?: string } | undefined
}

/**
 * 主窗口引用 - 由 index.ts 设置
 */
let mainWindowRef: Electron.BrowserWindow | null = null

/**
 * GUI 命令 - 启动 Electron 窗口并打开指定文件
 * textdiff [file1] [file2] → 启动 GUI
 * 
 * 参考: TextDiff-DevPlan.md §2.8.1 CLI 模块
 */
export function registerGuiCommand(program: Command): void {
  program
    .argument('[file1]', '左侧文件路径')
    .argument('[file2]', '右侧文件路径')
    .description('启动 GUI 并打开指定文件进行对比', {
      file1: '左侧文件路径（可选）',
      file2: '右侧文件路径（可选）'
    })
    .action(async (file1?: string, file2?: string) => {
      // 存储文件路径供主窗口使用
      if (file1 || file2) {
        global.cliFiles = { left: file1, right: file2 }
      }

      // 启动应用
      await startApp()
    })
}

/**
 * 设置主窗口引用
 */
export function setMainWindow(window: Electron.BrowserWindow | null): void {
  mainWindowRef = window
}

/**
 * 获取主窗口
 */
function getMainWindow(): Electron.BrowserWindow | null {
  return mainWindowRef
}

/**
 * 在现有窗口中打开文件
 */
export function openFilesInExistingWindow(files: string[]): void {
  const mainWindow = getMainWindow()
  if (!mainWindow) return

  // 通过 IPC 发送文件路径到渲染进程
  mainWindow.webContents.send('cli:open-files', {
    left: files[0] || null,
    right: files[1] || null
  })
}

/**
 * 设置单实例锁处理
 * 在 app.whenReady() 之前调用
 */
export function setupSingleInstance(): boolean {
  const gotTheLock = app.requestSingleInstanceLock()

  if (!gotTheLock) {
    // 如果无法获得锁，说明已有实例在运行，退出
    return false
  }

  // 监听第二个实例启动
  app.on('second-instance', (_event, argv) => {
    const mainWindow = getMainWindow()
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
      
      // 如果提供了文件参数，打开文件
      if (argv.length >= 3) {
        const files = argv.slice(2).filter(arg => !arg.startsWith('-'))
        openFilesInExistingWindow(files)
      }
    }
  })

  return true
}

/**
 * 启动应用
 */
async function startApp(): Promise<void> {
  // 应用启动逻辑在 index.ts 中处理
  // 这里只是确保 app 准备好
  if (!app.isReady()) {
    await app.whenReady()
  }
}

/**
 * 获取 CLI 传入的文件路径
 */
export function getCliFiles(): { left?: string; right?: string } | null {
  return global.cliFiles || null
}

/**
 * 清除 CLI 文件路径
 */
export function clearCliFiles(): void {
  global.cliFiles = undefined
}
