import { AppRouter } from '@/app/routes/AppRouter';
import { ErrorBoundary } from '@/shared/error/ErrorBoundary';
import { AppProviders } from '@/shared/providers/AppProviders';
import { MarketplaceAuthBinding } from '@/app/MarketplaceAuthBinding';

export function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <MarketplaceAuthBinding />
        <AppRouter />
      </AppProviders>
    </ErrorBoundary>
  );
}
