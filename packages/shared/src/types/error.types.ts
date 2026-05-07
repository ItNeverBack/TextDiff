export type ErrorCode = 
  | 'FILE_NOT_FOUND'
  | 'FILE_READ_ERROR'
  | 'FILE_WRITE_ERROR'
  | 'ENCODING_DETECTION_FAILED'
  | 'DIFF_COMPUTATION_ERROR'
  | 'SESSION_NOT_FOUND'
  | 'SESSION_SAVE_ERROR'
  | 'INVALID_OPTIONS'
  | 'WORKER_ERROR'
  | 'UNKNOWN_ERROR'

export interface AppError {
  code: ErrorCode
  message: string
  details?: unknown
}

export function createError(code: ErrorCode, message: string, details?: unknown): AppError {
  return { code, message, details }
}

export function isError(error: unknown): error is AppError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error
  )
}
