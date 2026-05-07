export const LARGE_FILE_THRESHOLD = 5 * 1024 * 1024

export const DIFF_COLORS = {
  light: {
    equal: '#e9ecef',
    insert: '#acf2bd',
    delete: '#fdb8c0',
    replace: '#ffdf5d'
  },
  dark: {
    equal: '#333333',
    insert: '#2ea043',
    delete: '#f85149',
    replace: '#d4a017'
  }
} as const

export const LINE_GUTTER_SYMBOLS = {
  insert: '+',
  delete: '-',
  replace: '~',
  equal: ' '
} as const
