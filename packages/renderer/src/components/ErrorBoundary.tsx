import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div style={{
            padding: '20px',
            color: 'var(--diff-deleted-text)',
            background: 'var(--diff-deleted-bg)',
            borderRadius: '8px',
            margin: '20px'
          }}>
            <h3>渲染出错</h3>
            <pre style={{ overflow: 'auto', fontSize: '12px' }}>
              {this.state.error?.message}
              {this.state.error?.stack}
            </pre>
          </div>
        )
      )
    }

    return this.props.children
  }
}