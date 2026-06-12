import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
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
    console.error('Uncaught error:', error, errorInfo);
    
    // Check if it's a ChunkLoadError or Failed to fetch dynamically imported module
    if (
      error.name === 'ChunkLoadError' ||
      error.message.includes('dynamically imported module') ||
      error.message.includes('Importing a module script failed')
    ) {
      console.log('Chunk load error detected, forcing hard reload to fetch new app version...');
      // Force a hard reload from the server to bypass cache
      window.location.reload();
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#1a1410] text-white p-4 text-center">
          <div>
            <h1 className="text-2xl font-bold text-[#ff6b35] mb-4">Updating App...</h1>
            <p className="text-gray-400 mb-6">We're downloading the latest version.</p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-[#ff6b35] hover:bg-[#ff9f1c] text-white font-bold py-3 px-8 rounded-full transition-colors"
            >
              Refresh Now
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
