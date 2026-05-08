import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { join } from 'path'
import { registerIpcHandlers } from './ipc'
import { runCli, getCliFiles, clearCliFiles, setupSingleInstance } from './cli'
import { setApplicationMenu } from './menu'

/**
 * TextDiff 主进程入口
 * 
 * 支持两种模式：
 * 1. CLI 模式: textdiff diff/merge <args> → 执行命令后退出
 * 2. GUI 模式: textdiff [file1] [file2]   → 启动 Electron 窗口
 * 
 * 参考: TextDiff-DevPlan.md §2.8.1 CLI 模块
 * 参考: docs/Week8-Review-Report.md 修复建议
 */

let mainWindow: BrowserWindow | null = null
let isQuitting = false

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

/**
 * 检测是否为纯 CLI 模式（不需要启动 Electron）
 */
function isPureCliMode(): boolean {
  const args = process.argv.slice(2)
  
  if (args.length === 0) return false
  
  // 如果有 diff/merge 子命令，是纯 CLI 模式
  const pureCliCommands = ['diff', 'merge']
  return pureCliCommands.includes(args[0])
}

/**
 * 检测是否为 GUI 模式（带文件参数）
 */
function isGuiModeWithFiles(): boolean {
  const args = process.argv.slice(2)
  
  // 有参数但不是纯 CLI 命令，则是 GUI 模式带文件
  if (args.length === 0) return false
  
  const pureCliCommands = ['diff', 'merge']
  return !pureCliCommands.includes(args[0])
}

/**
 * 保存 CLI 传入的文件路径
 */
function saveCliFiles(): void {
  const args = process.argv.slice(2)
  
  if (args.length >= 1) {
    const leftFile = args[0]
    const rightFile = args[1] // 可能 undefined
    
    // 过滤掉选项参数
    const cleanArgs = [leftFile, rightFile].filter((arg): arg is string => 
      typeof arg === 'string' && !arg.startsWith('-')
    )
    
    if (cleanArgs.length > 0) {
      // 使用 global 存储，供 GUI 启动后读取
      global.cliFiles = {
        left: cleanArgs[0],
        right: cleanArgs[1]
      }
    }
  }
}

/**
 * 创建主窗口
 */
async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    show: false,
    frame: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  })

    // macOS 保留原生菜单栏（系统标准行为），其他平台隐藏原生菜单（使用自定义 MenuBar）
    if (process.platform === 'darwin') {
      setApplicationMenu(mainWindow, 'zh-CN')
    } else {
      mainWindow.setMenuBarVisibility(false)
    }

    // 监听语言切换事件（使用 invoke/handle 模式）
    ipcMain.handle('app:setLanguage', (_event, language: 'zh-CN' | 'en-US') => {
      if (mainWindow) {
        setApplicationMenu(mainWindow, language)
      }
    })

    // 监听渲染进程确认关闭
    ipcMain.on('app:close-confirmed', () => {
      if (mainWindow) {
        isQuitting = true
        mainWindow.close()
      }
    })

    mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
    
    // 窗口显示后，检查是否有 CLI 传入的文件需要打开
    const cliFiles = getCliFiles()
    if (cliFiles && mainWindow) {
      mainWindow.webContents.send('cli:open-files', cliFiles)
      clearCliFiles()
    }
  })

  mainWindow.on('close', (event) => {
    if (isQuitting) return
    if (!mainWindow) return

    event.preventDefault()
    mainWindow.webContents.send('app:check-unsaved')
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  if (isDev) {
    const rendererPort = process.env.ELECTRON_RENDERER_PORT || 5173
    await mainWindow.loadURL(`http://localhost:${rendererPort}`)
    // 开发者工具可通过 F12 手动打开，不再自动打开
  } else {
    await mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // 注册 F12 快捷键打开开发者工具
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12') {
      mainWindow?.webContents.toggleDevTools()
      event.preventDefault()
    }
  })
}

/**
 * 启动 CLI 模式（纯命令行，无 GUI）
 */
async function startCliMode(): Promise<void> {
  try {
    runCli()
  } catch (error) {
    console.error('CLI Error:', error)
    process.exit(1)
  }
}

/**
 * 启动 GUI 模式
 */
async function startGuiMode(): Promise<void> {
  // 设置单实例锁
  if (!setupSingleInstance()) {
    app.quit()
    return
  }

  // 如果有文件参数，保存起来
  if (isGuiModeWithFiles()) {
    saveCliFiles()
  }

  app.whenReady().then(() => {
    registerIpcHandlers()
    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
      }
    })
  })

  app.on('window-all-closed', () => {
    isQuitting = false
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}

// 主入口逻辑
if (isPureCliMode()) {
  // CLI 模式：不启动 Electron，执行命令后退出
  startCliMode()
} else {
  // GUI 模式：启动 Electron 窗口
  startGuiMode()
}

// Extend global for CLI files storage
declare global {
  // eslint-disable-next-line no-var
  var cliFiles: { left?: string; right?: string } | undefined
}
