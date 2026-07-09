import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // You can log the error to an external service here
    // console.error('Uncaught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-sky-50 p-6 dark:bg-slate-950">
          <div className="max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-glow dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Something went wrong</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">An unexpected error occurred. Please try refreshing the page.</p>
            <pre className="mt-4 max-h-40 overflow-auto text-xs text-left bg-slate-50 p-3 rounded text-slate-700 dark:bg-slate-950 dark:text-slate-200">{String(this.state.error)}</pre>
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => window.location.reload()}
                className="rounded-3xl bg-gradient-to-r from-sky-500 to-cyan-400 px-5 py-2 text-sm font-semibold text-white shadow-lg"
              >
                Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
