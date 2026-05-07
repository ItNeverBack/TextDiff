import type { InlineDiff, InlineDiffSegment } from '@shared/types'

export function computeInlineDiff(leftLine: string, rightLine: string): InlineDiff {
  const left = leftLine.split('')
  const right = rightLine.split('')

  const lcs = computeCharLCS(left, right)

  const leftSegments: InlineDiffSegment[] = []
  const rightSegments: InlineDiffSegment[] = []

  let leftIdx = 0
  let rightIdx = 0
  let lcsIdx = 0

  while (leftIdx < left.length || rightIdx < right.length) {
    if (lcsIdx < lcs.length && leftIdx < left.length && left[leftIdx] === lcs[lcsIdx]) {
      if (rightIdx < right.length && right[rightIdx] === lcs[lcsIdx]) {
        leftSegments.push({ text: left[leftIdx], type: 'equal' })
        rightSegments.push({ text: right[rightIdx], type: 'equal' })
        leftIdx++
        rightIdx++
        lcsIdx++
        continue
      }
    }

    if (leftIdx < left.length && (lcsIdx >= lcs.length || left[leftIdx] !== lcs[lcsIdx])) {
      leftSegments.push({ text: left[leftIdx], type: 'delete' })
      leftIdx++
    }

    if (rightIdx < right.length && (lcsIdx >= lcs.length || right[rightIdx] !== lcs[lcsIdx])) {
      rightSegments.push({ text: right[rightIdx], type: 'insert' })
      rightIdx++
    }
  }

  return {
    left: mergeSegments(leftSegments),
    right: mergeSegments(rightSegments)
  }
}

function computeCharLCS(left: string[], right: string[]): string[] {
  const m = left.length
  const n = right.length

  if (m === 0 || n === 0) return []

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (left[i - 1] === right[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  const lcs: string[] = []
  let i = m
  let j = n

  while (i > 0 && j > 0) {
    if (left[i - 1] === right[j - 1]) {
      lcs.unshift(left[i - 1])
      i--
      j--
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--
    } else {
      j--
    }
  }

  return lcs
}

function mergeSegments(segments: InlineDiffSegment[]): InlineDiffSegment[] {
  if (segments.length === 0) return []

  const merged: InlineDiffSegment[] = [segments[0]]

  for (let i = 1; i < segments.length; i++) {
    const last = merged[merged.length - 1]
    const current = segments[i]

    if (last.type === current.type) {
      last.text += current.text
    } else {
      merged.push(current)
    }
  }

  return merged
}
