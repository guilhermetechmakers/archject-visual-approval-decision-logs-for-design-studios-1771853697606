import { Component, type ReactNode } from 'react'
import { reportError } from '@/services/error-reporter'
import { RetryManager } from '@/lib/retry-manager'
import { ServerErrorPage } from './server-error-page'
import type { ErrorContext } from './server-error-page'

interface Props {
  children: ReactNode
  /** Optional fallback route when "Back to dashboard" is clicked */
  safeRoute?: string
}

interface State {
  hasError: boolean
  error: Error | null
  incidentId: string
  errorContext: ErrorContext
}

export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      incidentId: '',
      errorContext: {},
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error): void {
    const route = window.location.pathname + window.location.search
    const url = window.location.href
    const fallbackId = crypto.randomUUID()

    this.setState({
      incidentId: fallbackId,
      errorContext: {
        message: error.message,
        route,
        stackSummary: error.stack?.slice(0, 200),
      },
    })

    reportError({
      route,
      url,
      method: 'GET',
      errorMessage: error.message,
      stackTraceSummary: error.stack,
      tags: ['error-boundary', 'render'],
    }).then((res) => {
      this.setState((prev) => ({
        incidentId: res.incidentId || prev.incidentId,
      }))
    }).catch(() => {
      // Keep fallbackId already set
    })
  }

  handleRetry = (): void => {
    RetryManager.retryPage()
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.incidentId) {
      return (
        <ServerErrorPage
          errorContext={this.state.errorContext}
          incidentId={this.state.incidentId}
          onRetry={this.handleRetry}
          safeRoute={this.props.safeRoute}
        />
      )
    }

    if (this.state.hasError) {
      return (
        <ServerErrorPage
          errorContext={{
            message: this.state.error?.message,
            route: window.location.pathname,
          }}
          incidentId={crypto.randomUUID()}
          onRetry={this.handleRetry}
          safeRoute={this.props.safeRoute}
        />
      )
    }

    return this.props.children
  }
}

/**
 * Setup unhandled promise rejection handler to surface 500 UI.
 * Call once at app bootstrap.
 */
export function setupUnhandledRejectionHandler(): void {
  window.addEventListener('unhandledrejection', (event) => {
    const err = event.reason
    const message = err?.message ?? String(err)
    const stack = err?.stack

    reportError({
      route: window.location.pathname + window.location.search,
      url: window.location.href,
      errorMessage: message,
      stackTraceSummary: stack,
      tags: ['unhandled-rejection'],
    }).then((res) => {
      if (typeof res?.incidentId === 'string') {
        window.dispatchEvent(
          new CustomEvent('archject:server-error', {
            detail: { incidentId: res.incidentId, errorContext: { message, route: window.location.pathname } },
          })
        )
      }
    })

    event.preventDefault()
  })
}
