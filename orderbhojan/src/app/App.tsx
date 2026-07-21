import { AppRouter } from '@/app/routes/AppRouter';
import { ErrorBoundary } from '@/shared/error/ErrorBoundary';
import { AppProviders } from '@/shared/providers/AppProviders';
import { MarketplaceAuthBinding } from '@/app/MarketplaceAuthBinding';
import { ObTrustDebugStrip } from '@/presentation/debug/ObTrustDebugStrip';

export function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <MarketplaceAuthBinding />
        <AppRouter />
        <ObTrustDebugStrip />
      </AppProviders>
    </ErrorBoundary>
  );
}
