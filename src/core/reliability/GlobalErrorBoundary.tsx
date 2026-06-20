import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { TelemetryService } from './TelemetryService';
import { SelfHealingUtils } from './SelfHealingUtils';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (error.message && (error.message.includes('dynamically imported module') || error.message.includes('Failed to fetch dynamically imported module'))) {
      TelemetryService.logWarn('Chunk load error detected. Attempting recovery.', { context: 'GlobalErrorBoundary' });
      SelfHealingUtils.attemptHardRecovery('chunk_load_error');
    }

    // Log the error to TelemetryService
    if (TelemetryService && TelemetryService.logCritical) {
      TelemetryService.logCritical(error, { 
        context: 'GlobalErrorBoundary',
        route: window.location.pathname 
      });
    } else {
      console.error("Uncaught error:", error, errorInfo);
    }
  }

  private handleReload = () => {
    SelfHealingUtils.attemptHardRecovery('user_manual_reload');
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 font-sans">
          <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-[2rem] p-8 text-center backdrop-blur-xl shadow-2xl">
            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-red-500/20">
              <AlertCircle size={32} className="text-red-400" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-3">We hit a snag</h1>
            <p className="text-white/60 mb-8 font-medium text-sm">
              Something unexpected happened, but your data is safe. Please reload the page to continue.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleReload}
                className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white font-black uppercase tracking-widest text-xs py-4 rounded-xl shadow-[0_8px_16px_rgba(234,88,12,0.3)] active:scale-95 transition-all"
              >
                <RefreshCw size={16} />
                Reload Page
              </button>
              <button
                onClick={() => window.location.href = '/?noredirect=true'}
                className="w-full flex items-center justify-center gap-2 bg-white/5 text-white/80 font-black uppercase tracking-widest text-xs py-4 rounded-xl border border-white/10 active:scale-95 transition-all hover:bg-white/10"
              >
                <Home size={16} />
                Return to Store
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
