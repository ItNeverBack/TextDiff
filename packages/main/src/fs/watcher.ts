import chokidar from 'chokidar'
import type { WatchEvent } from '@shared/types'

export type WatchCallback = (event: WatchEvent) => void

// 防抖时间（毫秒）
const DEBOUNCE_MS = 100

/**
 * 文件监听器管理器
 * 使用 chokidar 替代 Node.js 原生 fs.watch，提供更好的跨平台支持
 */
class FileWatcherManager {
  private watchers = new Map<string, chokidar.FSWatcher>()
  private callbacks = new Map<string, Set<WatchCallback>>()
  private debounceTimers = new Map<string, NodeJS.Timeout>()

  /**
   * 开始监听文件
   */
  watch(filepath: string, callback: WatchCallback): () => void {
    // 如果已经存在该文件的监听器，只需添加回调
    if (this.callbacks.has(filepath)) {
      this.callbacks.get(filepath)!.add(callback)
    } else {
      // 创建新的回调集合
      const callbackSet = new Set<WatchCallback>([callback])
      this.callbacks.set(filepath, callbackSet)

      // 创建 chokidar 监听器
      const watcher = chokidar.watch(filepath, {
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 300,
          pollInterval: 100
        }
      })

      watcher.on('change', () => this.handleChange(filepath, 'change'))
      watcher.on('unlink', () => this.handleChange(filepath, 'rename'))

      this.watchers.set(filepath, watcher)
    }

    // 返回取消监听函数
    return () => this.unwatch(filepath, callback)
  }

  /**
   * 处理文件变更事件（带防抖）
   */
  private handleChange(filepath: string, type: 'change' | 'rename'): void {
    // 清除之前的定时器
    const existingTimer = this.debounceTimers.get(filepath)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // 设置新的防抖定时器
    const timer = setTimeout(() => {
      this.debounceTimers.delete(filepath)
      
      const callbacks = this.callbacks.get(filepath)
      if (callbacks) {
        const event: WatchEvent = { type, path: filepath }
        callbacks.forEach(cb => {
          try {
            cb(event)
          } catch (error) {
            console.error(`Error in file watcher callback for ${filepath}:`, error)
          }
        })
      }
    }, DEBOUNCE_MS)

    this.debounceTimers.set(filepath, timer)
  }

  /**
   * 取消特定回调的监听
   */
  private unwatch(filepath: string, callback: WatchCallback): void {
    const callbacks = this.callbacks.get(filepath)
    if (callbacks) {
      callbacks.delete(callback)

      // 如果没有回调了，关闭监听器
      if (callbacks.size === 0) {
        this.closeWatcher(filepath)
      }
    }
  }

  /**
   * 关闭文件的监听器
   */
  private closeWatcher(filepath: string): void {
    const watcher = this.watchers.get(filepath)
    if (watcher) {
      watcher.close().catch(err => {
        console.error(`Error closing watcher for ${filepath}:`, err)
      })
      this.watchers.delete(filepath)
    }

    this.callbacks.delete(filepath)

    // 清除防抖定时器
    const timer = this.debounceTimers.get(filepath)
    if (timer) {
      clearTimeout(timer)
      this.debounceTimers.delete(filepath)
    }
  }

  /**
   * 关闭所有监听器
   */
  closeAll(): void {
    this.watchers.forEach((watcher, filepath) => {
      watcher.close().catch(err => {
        console.error(`Error closing watcher for ${filepath}:`, err)
      })
    })

    this.debounceTimers.forEach(timer => clearTimeout(timer))

    this.watchers.clear()
    this.callbacks.clear()
    this.debounceTimers.clear()
  }
}

// 单例实例
const watcherManager = new FileWatcherManager()

/**
 * 监听单个文件
 * @param filepath 文件路径
 * @param callback 回调函数
 * @returns 取消监听函数
 */
export function watchFile(filepath: string, callback: WatchCallback): () => void {
  return watcherManager.watch(filepath, callback)
}

/**
 * 监听目录
 * @param dirpath 目录路径
 * @param callback 回调函数
 * @returns 取消监听函数
 */
export function watchDirectory(dirpath: string, callback: WatchCallback): () => void {
  const watcher = chokidar.watch(dirpath, {
    persistent: true,
    ignoreInitial: true,
    depth: 99,
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 100
    }
  })

  const handleEvent = (path: string, type: 'change' | 'rename') => {
    const event: WatchEvent = { type, path }
    try {
      callback(event)
    } catch (error) {
      console.error(`Error in directory watcher callback for ${path}:`, error)
    }
  }

  watcher.on('change', (path) => handleEvent(path, 'change'))
  watcher.on('add', (path) => handleEvent(path, 'rename'))
  watcher.on('unlink', (path) => handleEvent(path, 'rename'))
  watcher.on('addDir', (path) => handleEvent(path, 'rename'))
  watcher.on('unlinkDir', (path) => handleEvent(path, 'rename'))

  return () => {
    watcher.close().catch(err => {
      console.error(`Error closing directory watcher for ${dirpath}:`, err)
    })
  }
}

/**
 * 关闭所有文件监听器
 */
export function closeAllWatchers(): void {
  watcherManager.closeAll()
}
