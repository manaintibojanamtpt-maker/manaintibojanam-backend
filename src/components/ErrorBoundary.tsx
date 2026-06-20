import React, { Component, ErrorInfo, ReactNode } from 'react';
import { TelemetryService } from '../core/reliability/TelemetryService';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    TelemetryService.logCritical(`React Render Error: ${error.message}`, {
      stack: errorInfo.componentStack,
      route: window.location.pathname
    });
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex flex-col items-center justify-center p-6 text-center bg-red-500/10 rounded-2xl border border-red-500/20 my-4 mx-2">
          <div className="w-12 h-12 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Something went wrong</h2>
          <p className="text-gray-400 text-sm mb-6 max-w-sm">We encountered an issue displaying this section. Our team has been notified.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-white/10 hover:bg-white/20 text-white font-semibold py-2 px-6 rounded-xl transition-colors"
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
