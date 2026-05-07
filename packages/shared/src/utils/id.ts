export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`
}

export function generateChunkId(): string {
  return `chunk-${generateId()}`
}

export function generateSessionId(): string {
  return `session-${generateId()}`
}

export function generateConflictId(): string {
  return `conflict-${generateId()}`
}
