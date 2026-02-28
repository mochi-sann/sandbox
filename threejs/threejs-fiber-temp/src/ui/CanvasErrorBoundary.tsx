import { Component, type ReactNode } from 'react'

interface CanvasErrorBoundaryProps {
  children: ReactNode
}

interface CanvasErrorBoundaryState {
  hasError: boolean
  message: string
}

export class CanvasErrorBoundary extends Component<
  CanvasErrorBoundaryProps,
  CanvasErrorBoundaryState
> {
  public state: CanvasErrorBoundaryState = {
    hasError: false,
    message: '',
  }

  public static getDerivedStateFromError(error: Error): CanvasErrorBoundaryState {
    return {
      hasError: true,
      message: error.message,
    }
  }

  public override render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <div className="loading-overlay" role="alert">
        <p className="loading-title">3Dレンダラーでエラーが発生しました</p>
        <p className="loading-meta">{this.state.message}</p>
      </div>
    )
  }
}
