import { defineConfig } from 'vitest/config'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import react from '@vitejs/plugin-react'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: [
      'packages/**/__tests__/**/*.test.ts',
      'packages/**/__tests__/**/*.test.tsx',
      'packages/**/*.test.ts',
      'packages/**/*.test.tsx'
    ],
    exclude: ['node_modules', 'dist', 'out'],
    testTimeout: 10000,
    environmentMatchGlobs: [
      // renderer 包下的测试使用 jsdom
      ['packages/renderer/**', 'jsdom']
    ],
    setupFiles: ['./packages/renderer/src/__tests__/setup.ts']
  },
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'packages/shared/src'),
      '@renderer': resolve(__dirname, 'packages/renderer/src'),
      '@': resolve(__dirname, 'packages/renderer/src')
    }
  }
})
