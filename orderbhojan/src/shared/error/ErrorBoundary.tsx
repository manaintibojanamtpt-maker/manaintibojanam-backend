import React from 'react';
import { GlassCard } from '@bhojan/storefront-design-system/primitives/GlassCard';
import { SoftButton } from '@bhojan/storefront-design-system/primitives/SoftButton';
import { MarketplaceUxStateView } from '@bhojan/storefront-design-system/marketplace/MarketplaceUxStateView';
import { logger, trackError } from '@/telemetry';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logger.error('React error boundary caught error', {
      message: error.message,
      componentStack: info.componentStack,
    });
    trackError(error, {
      route: typeof window !== 'undefined' ? window.location.pathname : '',
      componentStack: info.componentStack ?? '',
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50vh] items-center justify-center p-6">
          <GlassCard hoverEffect={false} className="w-full max-w-lg !rounded-[2rem] !p-8">
            <h2 className="text-xl font-extrabold text-white">{this.props.fallbackTitle ?? 'Something went wrong'}</h2>
            <p className="mt-2 text-sm text-white/70">
              {this.state.error?.message ?? 'An unexpected error occurred.'}
            </p>
            <SoftButton type="button" className="mt-4" onClick={this.handleReset}>
              Try again
            </SoftButton>
          </GlassCard>
        </div>
      );
    }

    return this.props.children;
  }
}

export function AppErrorFallback({
  title,
  description,
  onRetry,
}: {
  title: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <MarketplaceUxStateView
      title={title}
      description={description}
      primaryLabel={onRetry ? 'Try again' : undefined}
      onPrimary={onRetry}
    />
  );
}
