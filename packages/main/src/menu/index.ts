/**
 * TextDiff 应用菜单配置 (Electron Menu API)
 * 参考: TextDiff-DevPlan.md Week 13 应用菜单配置
 * 适配 Linux 桌面环境
 */

import { Menu, MenuItemConstructorOptions, app } from 'electron'
import { BrowserWindow } from 'electron'

/**
 * 创建应用菜单
 * @param mainWindow 主窗口实例
 * @param i18n 国际化函数
 * @returns 菜单实例
 */
export function createApplicationMenu(
  mainWindow: BrowserWindow,
  i18n: (key: string) => string
): Menu {
  const isMac = process.platform === 'darwin'

  const template: MenuItemConstructorOptions[] = [
    // 文件菜单
    {
      label: i18n('menu.file'),
      submenu: [
        {
          label: i18n('menu.file.openPair'),
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            mainWindow.webContents.send('menu:open-file-pair')
          }
        },
        {
          label: i18n('menu.file.openLeft'),
          accelerator: 'CmdOrCtrl+L',
          click: () => {
            mainWindow.webContents.send('menu:open-left-file')
          }
        },
        {
          label: i18n('menu.file.openRight'),
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            mainWindow.webContents.send('menu:open-right-file')
          }
        },
        { type: 'separator' },
        {
          label: i18n('menu.file.pasteText'),
          accelerator: 'CmdOrCtrl+Shift+V',
          click: () => {
            mainWindow.webContents.send('menu:paste-text')
          }
        },
        { type: 'separator' },
        {
          label: i18n('menu.file.openDirectoryDiff'),
          accelerator: 'CmdOrCtrl+Shift+D',
          click: () => {
            mainWindow.webContents.send('menu:open-directory-diff')
          }
        },
        { type: 'separator' },
        {
          label: i18n('menu.file.saveSession'),
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow.webContents.send('menu:save-session')
          }
        },
        // Linux 和 Windows 的退出选项
        ...(!isMac ? [
          { type: 'separator' as const },
          {
            label: i18n('menu.quit'),
            accelerator: 'CmdOrCtrl+Q',
            click: () => {
              app.quit()
            }
          }
        ] : [])
      ]
    },

    // 编辑菜单
    {
      label: i18n('menu.edit'),
      submenu: [
        {
          label: i18n('menu.edit.swapFiles'),
          click: () => {
            mainWindow.webContents.send('menu:swap-files')
          }
        },
        { type: 'separator' },
        {
          label: i18n('menu.edit.collapseUnchanged'),
          accelerator: 'CmdOrCtrl+Shift+C',
          click: () => {
            mainWindow.webContents.send('menu:toggle-collapse')
          }
        }
      ]
    },

    // 视图菜单
    {
      label: i18n('menu.view'),
      submenu: [
        {
          label: i18n('menu.view.splitView'),
          accelerator: 'CmdOrCtrl+1',
          click: () => {
            mainWindow.webContents.send('menu:view-mode', 'split')
          }
        },
        {
          label: i18n('menu.view.unifiedView'),
          accelerator: 'CmdOrCtrl+2',
          click: () => {
            mainWindow.webContents.send('menu:view-mode', 'unified')
          }
        },
        {
          label: i18n('menu.view.directoryView'),
          accelerator: 'CmdOrCtrl+3',
          click: () => {
            mainWindow.webContents.send('menu:view-mode', 'directory')
          }
        },
        {
          label: i18n('menu.view.mergeView'),
          accelerator: 'CmdOrCtrl+4',
          click: () => {
            mainWindow.webContents.send('menu:view-mode', 'merge')
          }
        },
        { type: 'separator' },
        {
          label: i18n('menu.view.toggleTheme'),
          accelerator: 'CmdOrCtrl+Shift+T',
          click: () => {
            mainWindow.webContents.send('menu:toggle-theme')
          }
        },
        // 仅在非生产环境显示开发者工具
        ...(process.env.NODE_ENV === 'development' ? [
          { type: 'separator' as const },
          {
            label: 'Toggle Developer Tools',
            accelerator: isMac ? 'Alt+Command+I' : 'Ctrl+Shift+I',
            click: () => {
              mainWindow.webContents.toggleDevTools()
            }
          }
        ] : [])
      ]
    },

    // 会话菜单
    {
      label: i18n('menu.session'),
      submenu: [
        {
          label: i18n('menu.session.newTab'),
          accelerator: 'CmdOrCtrl+T',
          click: () => {
            mainWindow.webContents.send('menu:new-tab')
          }
        },
        {
          label: i18n('menu.session.closeTab'),
          accelerator: 'CmdOrCtrl+W',
          click: () => {
            mainWindow.webContents.send('menu:close-tab')
          }
        },
        { type: 'separator' },
        {
          label: i18n('menu.session.history'),
          accelerator: 'CmdOrCtrl+H',
          click: () => {
            mainWindow.webContents.send('menu:session-history')
          }
        }
      ]
    },

    // 工具菜单
    {
      label: i18n('menu.tools'),
      submenu: [
        {
          label: i18n('menu.tools.ignoreRules'),
          click: () => {
            mainWindow.webContents.send('menu:ignore-rules')
          }
        },
        { type: 'separator' },
        {
          label: i18n('menu.tools.preferences'),
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            mainWindow.webContents.send('menu:preferences')
          }
        }
      ]
    },

    // 帮助菜单
    {
      label: i18n('menu.help'),
      submenu: [
        {
          label: i18n('menu.help.shortcuts'),
          click: () => {
            mainWindow.webContents.send('menu:shortcuts')
          }
        },
        { type: 'separator' },
        {
          label: i18n('menu.help.about'),
          click: () => {
            mainWindow.webContents.send('menu:about')
          }
        }
      ]
    }
  ]

  // macOS 特殊处理：第一个菜单是应用名称
  if (isMac) {
    template.unshift({
      label: app.getName(),
      submenu: [
        {
          label: i18n('menu.help.about'),
          click: () => {
            mainWindow.webContents.send('menu:about')
          }
        },
        { type: 'separator' },
        {
          label: i18n('menu.tools.preferences'),
          accelerator: 'Command+,',
          click: () => {
            mainWindow.webContents.send('menu:preferences')
          }
        },
        { type: 'separator' },
        {
          label: i18n('menu.quit'),
          accelerator: 'Command+Q',
          click: () => {
            app.quit()
          }
        }
      ]
    })
  }

  return Menu.buildFromTemplate(template)
}

/**
 * 设置应用菜单
 * @param mainWindow 主窗口实例
 * @param language 当前语言
 */
export function setApplicationMenu(
  mainWindow: BrowserWindow,
  language: 'zh-CN' | 'en-US' = 'zh-CN'
): void {
  // 简化的 i18n 函数（实际应用中应从 locale 文件加载）
  const i18n = (key: string): string => {
    const messages: Record<string, Record<string, string>> = {
      'zh-CN': {
        'menu.file': '文件',
        'menu.file.openPair': '打开文件对...',
        'menu.file.openLeft': '打开左侧文件',
        'menu.file.openRight': '打开右侧文件',
        'menu.file.pasteText': '粘贴文本对比',
        'menu.file.openDirectoryDiff': '打开目录对比',
        'menu.file.saveSession': '保存会话',
        'menu.edit': '编辑',
        'menu.edit.swapFiles': '交换左右文件',
        'menu.edit.collapseUnchanged': '折叠相同区域',
        'menu.view': '视图',
        'menu.view.splitView': '双栏对比',
        'menu.view.unifiedView': '统一视图',
        'menu.view.directoryView': '目录对比',
        'menu.view.mergeView': '三路合并',
        'menu.view.toggleTheme': '切换主题',
        'menu.session': '会话',
        'menu.session.newTab': '新建对比',
        'menu.session.closeTab': '关闭当前标签',
        'menu.session.history': '会话历史',
        'menu.tools': '工具',
        'menu.tools.ignoreRules': '忽略规则设置',
        'menu.tools.preferences': '首选项',
        'menu.help': '帮助',
        'menu.help.shortcuts': '快捷键',
        'menu.help.about': '关于 TextDiff',
        'menu.quit': '退出'
      },
      'en-US': {
        'menu.file': 'File',
        'menu.file.openPair': 'Open File Pair...',
        'menu.file.openLeft': 'Open Left File',
        'menu.file.openRight': 'Open Right File',
        'menu.file.pasteText': 'Paste Text to Compare',
        'menu.file.openDirectoryDiff': 'Open Directory Comparison',
        'menu.file.saveSession': 'Save Session',
        'menu.edit': 'Edit',
        'menu.edit.swapFiles': 'Swap Left and Right Files',
        'menu.edit.collapseUnchanged': 'Collapse Unchanged Regions',
        'menu.view': 'View',
        'menu.view.splitView': 'Split View',
        'menu.view.unifiedView': 'Unified View',
        'menu.view.directoryView': 'Directory View',
        'menu.view.mergeView': 'Three-Way Merge',
        'menu.view.toggleTheme': 'Toggle Theme',
        'menu.session': 'Session',
        'menu.session.newTab': 'New Comparison',
        'menu.session.closeTab': 'Close Current Tab',
        'menu.session.history': 'Session History',
        'menu.tools': 'Tools',
        'menu.tools.ignoreRules': 'Ignore Rules',
        'menu.tools.preferences': 'Preferences',
        'menu.help': 'Help',
        'menu.help.shortcuts': 'Keyboard Shortcuts',
        'menu.help.about': 'About TextDiff',
        'menu.quit': 'Quit'
      }
    }

    return messages[language]?.[key] || key
  }

  const menu = createApplicationMenu(mainWindow, i18n)
  Menu.setApplicationMenu(menu)
}
