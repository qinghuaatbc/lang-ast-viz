import { Component, ReactNode } from 'react'

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { hasError: boolean; error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="viewer-empty" style={{ color: 'var(--accent-red)' }}>
          ⚠ Component crashed: {this.state.error?.message}
        </div>
      )
    }
    return this.props.children
  }
}
