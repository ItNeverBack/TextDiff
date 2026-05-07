import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve('packages/shared/src')
      }
    },
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'packages/main/src/index.ts'),
          // 包含 Worker 文件以便打包
          'diff-worker': resolve(__dirname, 'packages/main/src/diff/worker/diff-worker.ts'),
          // CLI 入口
          'cli/index': resolve(__dirname, 'packages/main/src/cli/index.ts')
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve('packages/shared/src')
      }
    },
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'packages/main/src/ipc/preload.ts')
        }
      }
    }
  },
  renderer: {
    root: resolve(__dirname, 'packages/renderer'),
    plugins: [react()],
    resolve: {
      alias: {
        '@shared': resolve('packages/shared/src'),
        '@renderer': resolve('packages/renderer/src')
      }
    },
    build: {
      outDir: resolve(__dirname, 'out/renderer'),
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'packages/renderer/index.html')
        }
      }
    },
    server: {
      fs: {
        allow: [
          resolve(__dirname, 'packages/renderer'),
          resolve(__dirname, 'node_modules'),
        ]
      }
    },
    optimizeDeps: {
      include: ['monaco-editor'],
      exclude: ['@monaco-editor/react']
    },
    worker: {
      format: 'es'
    }
  }
})
