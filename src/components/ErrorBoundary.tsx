import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error.message || 'An unexpected error occurred.' };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto my-12 max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-6 text-slate-900">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-red-600" />
            <div>
              <h2 className="text-lg font-bold text-red-950">
                Application Security or Runtime Notice
              </h2>
              <p className="mt-1 font-mono text-xs break-all text-red-900">
                {this.state.errorMessage}
              </p>
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, errorMessage: '' })}
                className="mt-4 rounded-lg bg-red-800 px-4 py-2 text-xs font-semibold text-white hover:bg-red-900"
              >
                Dismiss &amp; Return to FarmFund
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
