import type { ReactNode } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  MapPin,
  RefreshCw,
  Search,
  Store,
  UtensilsCrossed,
  WifiOff,
} from 'lucide-react';
import { MarketplaceUxStateView } from '@bhojan/storefront-design-system/marketplace/MarketplaceUxStateView';

export function OrderBhojanRestaurantUxShell({ children }: { readonly children: ReactNode }) {
  return <div className="min-h-screen bg-[#030303] px-4 py-12 text-white">{children}</div>;
}

export interface OrderBhojanRestaurantRetryStateProps {
  readonly onRetry: () => void;
  readonly offline?: boolean;
}

export function OrderBhojanRestaurantErrorState({ onRetry, offline = false }: OrderBhojanRestaurantRetryStateProps) {
  if (offline) {
    return (
      <MarketplaceUxStateView
        role="alert"
        title="You appear to be offline"
        description="Reconnect to load this restaurant."
        icon={<WifiOff className="h-10 w-10 text-amber-400/80" aria-hidden />}
        primaryLabel="Retry"
        onPrimary={onRetry}
      />
    );
  }

  return (
    <MarketplaceUxStateView
      role="alert"
      title="Restaurant unavailable"
      description="We could not load this restaurant. Check your connection and try again."
      icon={<AlertCircle className="h-10 w-10 text-red-400/80" aria-hidden />}
      primaryLabel="Retry"
      onPrimary={onRetry}
    />
  );
}

export function OrderBhojanRestaurantMaintenanceState({ onRetry }: { readonly onRetry?: () => void }) {
  return (
    <MarketplaceUxStateView
      role="status"
      title="Restaurant temporarily unavailable"
      description="We are performing maintenance. Please try again shortly."
      icon={<AlertTriangle className="h-10 w-10 text-amber-400/80" aria-hidden />}
      primaryLabel={onRetry ? 'Retry' : undefined}
      onPrimary={onRetry}
    />
  );
}

export interface OrderBhojanRestaurantClosedBannerProps {
  readonly label: string;
  readonly onBrowse?: () => void;
}

export function OrderBhojanRestaurantClosedBanner({ label, onBrowse }: OrderBhojanRestaurantClosedBannerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto max-w-3xl px-4 pb-4"
    >
      <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-center">
        <p className="text-sm font-semibold text-amber-100">{label}</p>
        <p className="mt-1 text-xs text-amber-100/70">Ordering is paused until the kitchen reopens.</p>
        {onBrowse ? (
          <button
            type="button"
            onClick={onBrowse}
            className="mt-3 text-xs font-semibold text-[#FF7A00] underline-offset-2 hover:underline touch-manipulation"
          >
            Browse other kitchens
          </button>
        ) : null}
      </div>
    </div>
  );
}

export interface OrderBhojanMenuRetryStateProps {
  readonly onRetry: () => void;
  readonly offline?: boolean;
}

export function OrderBhojanMenuErrorState({ onRetry, offline = false }: OrderBhojanMenuRetryStateProps) {
  if (offline) {
    return (
      <MarketplaceUxStateView
        role="alert"
        title="You appear to be offline"
        description="Reconnect to load this menu."
        icon={<WifiOff className="h-10 w-10 text-amber-400/80" aria-hidden />}
        primaryLabel="Retry"
        onPrimary={onRetry}
      />
    );
  }

  return (
    <MarketplaceUxStateView
      role="alert"
      title="Menu unavailable"
      description="We could not load this menu. Check your connection and try again."
      icon={<AlertCircle className="h-10 w-10 text-red-400/80" aria-hidden />}
      primaryLabel="Retry"
      onPrimary={onRetry}
    />
  );
}

export function OrderBhojanMenuEmptyState({
  onBack,
}: {
  readonly onBack?: () => void;
}) {
  return (
    <MarketplaceUxStateView
      role="status"
      title="Menu is empty"
      description="This kitchen has not published any dishes yet. Check back later."
      icon={<UtensilsCrossed className="h-10 w-10 text-white/30" aria-hidden />}
      primaryLabel={onBack ? 'Back to restaurant' : undefined}
      onPrimary={onBack}
    />
  );
}

export function OrderBhojanMenuSearchEmptyState({
  query,
  onClear,
}: {
  readonly query?: string;
  readonly onClear?: () => void;
}) {
  return (
    <MarketplaceUxStateView
      role="status"
      title="No dishes match your search"
      description={
        query
          ? `No menu items found for "${query}". Try another name or browse categories.`
          : 'Try another search term or browse categories.'
      }
      icon={<Search className="h-10 w-10 text-white/30" aria-hidden />}
      primaryLabel={onClear ? 'Clear search' : undefined}
      onPrimary={onClear}
      compact
    />
  );
}

export function OrderBhojanRestaurantPermissionState({
  onRetry,
}: {
  readonly onRetry?: () => void;
}) {
  return (
    <MarketplaceUxStateView
      role="alert"
      title="Permission required"
      description="Enable the required permissions to view this restaurant."
      icon={<MapPin className="h-10 w-10 text-[#FF7A00]" aria-hidden />}
      primaryLabel={onRetry ? 'Retry' : undefined}
      onPrimary={onRetry}
    />
  );
}

export function OrderBhojanRestaurantNotFoundState({
  onBrowse,
}: {
  readonly onBrowse?: () => void;
}) {
  return (
    <MarketplaceUxStateView
      role="status"
      title="Restaurant not found"
      description="This kitchen may have moved or is no longer available on OrderBhojan."
      icon={<Store className="h-10 w-10 text-white/30" aria-hidden />}
      primaryLabel={onBrowse ? 'Browse kitchens' : undefined}
      onPrimary={onBrowse}
    />
  );
}

export function OrderBhojanRestaurantLoadingState({
  message = 'Loading restaurant…',
}: {
  readonly message?: string;
}) {
  return <MarketplaceUxStateView loading loadingMessage={message} title="" />;
}

export function OrderBhojanMenuLoadingState({ message = 'Loading menu…' }: { readonly message?: string }) {
  return <MarketplaceUxStateView loading loadingMessage={message} title="" />;
}

export function OrderBhojanRestaurantOfflineState({ onRetry }: { readonly onRetry: () => void }) {
  return (
    <MarketplaceUxStateView
      role="alert"
      title="You appear to be offline"
      description="Reconnect to browse this restaurant and menu."
      icon={<WifiOff className="h-10 w-10 text-amber-400/80" aria-hidden />}
      primaryLabel="Retry"
      onPrimary={onRetry}
    />
  );
}

export function OrderBhojanRestaurantRetryInlineState({
  message,
  onRetry,
}: {
  readonly message: string;
  readonly onRetry: () => void;
}) {
  return (
    <MarketplaceUxStateView
      compact
      role="alert"
      title="Could not refresh"
      description={message}
      icon={<RefreshCw className="h-8 w-8 text-white/40" aria-hidden />}
      primaryLabel="Retry"
      onPrimary={onRetry}
    />
  );
}
