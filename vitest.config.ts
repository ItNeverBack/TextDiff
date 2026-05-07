import { defineConfig } from 'vitest/config'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  test: {
    environment: 'node',
    include: ['packages/**/__tests__/**/*.test.ts', 'packages/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'out'],
    testTimeout: 10000
  },
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'packages/shared/src'),
      '@renderer': resolve(__dirname, 'packages/renderer/src'),
      '@': resolve(__dirname, 'packages/renderer/src')
    }
  }
})
