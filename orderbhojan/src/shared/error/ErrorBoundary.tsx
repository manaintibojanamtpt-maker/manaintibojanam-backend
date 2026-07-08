import React from 'react';
import {
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  ErrorState,
} from '@bhojan/design-system';
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
        <div style={{ display: 'flex', minHeight: '50vh', alignItems: 'center', justifyContent: 'center', padding: 'var(--bds-space-6)' }}>
          <Card style={{ maxWidth: '32rem', width: '100%' }}>
            <CardHeader>
              <CardTitle>{this.props.fallbackTitle ?? 'Something went wrong'}</CardTitle>
              <CardDescription>
                {this.state.error?.message ?? 'An unexpected error occurred.'}
              </CardDescription>
            </CardHeader>
            <Button onClick={this.handleReset}>Try again</Button>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export function AppErrorFallback({ title, description, onRetry }: { title: string; description?: string; onRetry?: () => void }) {
  return <ErrorState title={title} description={description} onRetry={onRetry} />;
}
