/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './packages/renderer/index.html',
    './packages/renderer/src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        'app-bg': 'var(--bg-app)',
        'surface-bg': 'var(--bg-surface)',
        'elevated-bg': 'var(--bg-elevated)',
        'hover-bg': 'var(--bg-hover)',
        'active-bg': 'var(--bg-active)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'diff-added-bg': 'var(--diff-added-bg)',
        'diff-added-line': 'var(--diff-added-line)',
        'diff-added-text': 'var(--diff-added-text)',
        'diff-deleted-bg': 'var(--diff-deleted-bg)',
        'diff-deleted-line': 'var(--diff-deleted-line)',
        'diff-deleted-text': 'var(--diff-deleted-text)',
        'diff-modified-bg': 'var(--diff-modified-bg)',
        'diff-modified-line': 'var(--diff-modified-line)',
        'diff-modified-text': 'var(--diff-modified-text)',
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      borderRadius: {
        'xs': 'var(--radius-xs)',
        'sm': 'var(--radius-sm)',
        'md': 'var(--radius-md)',
        'lg': 'var(--radius-lg)',
      },
      transitionDuration: {
        'fast': 'var(--transition-fast)',
        'normal': 'var(--transition-normal)',
      },
    },
  },
  plugins: [],
}
