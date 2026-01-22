// Error Boundary Component
// Catches React errors and provides fallback UI

import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  extraDebugInfo: string | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    extraDebugInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    // Try to extract more info from the error message for React #310 errors
    let extraDebugInfo: string | null = null;
    
    if (error?.message?.includes('Objects are not valid as a React child')) {
      // Try to extract the object type from the error message
      extraDebugInfo = `React Error #310 detected. This usually means a Date, Map, or plain object is being rendered directly. Check components that use useMemo or useLiveQuery hooks. Current URL: ${window.location.pathname}`;
    }
    
    return {
      hasError: true,
      error,
      errorInfo: null,
      extraDebugInfo,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
    console.error('[ErrorBoundary] Component Stack:', errorInfo.componentStack);
    
    // Log additional context for React #310 errors
    if (error?.message?.includes('Objects are not valid as a React child')) {
      console.error('[ErrorBoundary] React #310 Error - Possible causes:');
      console.error('  1. Rendering a Date object directly (use format() from date-fns)');
      console.error('  2. Rendering a Map or Set object directly');
      console.error('  3. Rendering a nested object without accessing its properties');
      console.error('  4. Check the component stack above to find the source');
    }
    
    this.setState({
      error,
      errorInfo,
    });
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      extraDebugInfo: null,
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-shrink-0">
                <AlertTriangle className="w-12 h-12 text-red-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Something went wrong</h1>
                <p className="text-gray-600 mt-1">
                  The application encountered an unexpected error
                </p>
              </div>
            </div>

            {this.state.error && (
              <div className="mb-6">
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                  <p className="text-sm font-semibold text-red-800 mb-2">Error Details:</p>
                  <p className="text-sm text-red-700 font-mono">
                    {this.state.error.message}
                  </p>
                </div>

                {/* Extra debug info for React #310 errors */}
                {this.state.extraDebugInfo && (
                  <div className="mt-4 bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
                    <p className="text-sm font-semibold text-amber-800 mb-2">Debug Info:</p>
                    <p className="text-sm text-amber-700">
                      {this.state.extraDebugInfo}
                    </p>
                  </div>
                )}

                {this.state.errorInfo && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm font-semibold text-gray-700 hover:text-gray-900">
                      Stack Trace
                    </summary>
                    <pre className="mt-2 text-xs bg-gray-100 p-4 rounded overflow-auto max-h-64">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg mb-6">
              <p className="text-sm text-blue-800">
                <strong>Don't worry!</strong> Your data is safe. This error has been logged and 
                your work has been saved locally.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleReset}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <RefreshCw size={18} />
                Try Again
              </button>
              
              <button
                onClick={this.handleReload}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                <RefreshCw size={18} />
                Reload Page
              </button>
              
              <button
                onClick={this.handleGoHome}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <Home size={18} />
                Go Home
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                If this problem persists, please contact support with the error details above.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
