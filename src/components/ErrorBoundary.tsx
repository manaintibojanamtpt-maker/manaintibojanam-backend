import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);

    const chunkFailedMessage = /Failed to fetch dynamically imported module|Importing a module script failed/i;
    const isChunkError = error.name === 'ChunkLoadError' || chunkFailedMessage.test(error.message);
    
    if (isChunkError) {
      if (!sessionStorage.getItem('chunk_failed_reloaded')) {
        sessionStorage.setItem('chunk_failed_reloaded', 'true');
        console.log('Chunk load failed. Attempting to reload window to fetch new assets...');
        window.location.reload();
        return;
      }
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    sessionStorage.removeItem('chunk_failed_reloaded');
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[100dvh] bg-[#070504] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#120d0a] rounded-[2.5rem] p-10 shadow-2xl border border-[#ff6b35]/20 text-center relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-[#ff6b35]/10 blur-[50px] rounded-full pointer-events-none"></div>

            <div className="w-20 h-20 bg-[#ff6b35]/10 border border-[#ff6b35]/20 rounded-3xl flex items-center justify-center mx-auto mb-6 text-[#ff6b35] relative z-10">
              <AlertTriangle size={40} />
            </div>
            
            <h1 className="text-2xl md:text-3xl font-black text-white mb-4 tracking-tight relative z-10">
              Update Interrupted
            </h1>
            
            <p className="text-[#b9ada1] font-medium mb-8 text-sm md:text-base leading-relaxed relative z-10">
              We encountered a missing asset while applying the latest improvements. Please refresh to load the new version.
            </p>

            <div className="grid grid-cols-1 gap-4 relative z-10">
              <button
                onClick={this.handleReset}
                className="flex items-center justify-center gap-3 bg-gradient-to-r from-[#ff6b35] to-[#ff9f1c] text-white px-8 py-4 rounded-2xl font-black shadow-[0_10px_20px_rgba(255,107,53,0.3)] hover:opacity-90 transition-all active:scale-95"
              >
                <RefreshCcw size={20} />
                Refresh App
              </button>
              <a
                href="/"
                className="flex items-center justify-center gap-3 bg-white/5 border border-white/10 text-white px-8 py-4 rounded-2xl font-black hover:bg-white/10 transition-all active:scale-95"
              >
                <Home size={20} />
                Back to Home
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
