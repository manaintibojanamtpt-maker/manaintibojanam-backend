import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { logIncident } from '../../lib/monitoring';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    
    // Log to Monitoring System
    logIncident('system_errors', {
      error: error.message,
      stackTrace: error.stack || errorInfo.componentStack,
      route: window.location.pathname,
      browser: navigator.userAgent,
      device: window.innerWidth < 768 ? 'Mobile' : 'Desktop',
      timestamp: new Date().toISOString()
    });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
          <div className="bg-[#111] border border-white/10 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="text-red-500" size={32} />
            </div>
            <h1 className="text-2xl font-black text-white mb-2">Something went wrong.</h1>
            <p className="text-gray-400 text-sm mb-8 leading-relaxed">
              We've encountered an unexpected error. Our engineering team has been automatically notified and is looking into it.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw size={18} />
              Reload Page
            </button>
            <div className="mt-6 pt-6 border-t border-white/5">
              <p className="text-xs text-gray-500 font-mono break-all text-left">
                {this.state.error?.message}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
