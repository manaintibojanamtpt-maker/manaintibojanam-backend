import { OrderBhojanDiscoveryOfflineNotice, OrderBhojanDiscoveryUxState } from '@/presentation/states';

export type ExperienceEmptyVariant =
  | 'no-restaurants'
  | 'no-internet'
  | 'no-address'
  | 'permission-denied'
  | 'search-empty';

const VARIANT_MAP: Record<
  ExperienceEmptyVariant,
  { variant: 'no-restaurants' | 'offline' | 'location-disabled' | 'permission-denied' | 'no-results'; title?: string; description?: string }
> = {
  'no-restaurants': { variant: 'no-restaurants' },
  'no-internet': { variant: 'offline' },
  'no-address': { variant: 'location-disabled' },
  'permission-denied': { variant: 'permission-denied' },
  'search-empty': { variant: 'no-results' },
};

/** Shim — delegates to Founder DS presentation states (Phase 6 / 2D). */
export function ExperienceEmptyState({
  variant,
  onAction,
  actionLabel = 'Try again',
}: {
  variant: ExperienceEmptyVariant;
  onAction?: () => void;
  actionLabel?: string;
}) {
  const mapped = VARIANT_MAP[variant];
  return (
    <OrderBhojanDiscoveryUxState
      variant={mapped.variant}
      title={mapped.title}
      description={mapped.description}
      primaryLabel={onAction ? actionLabel : undefined}
      onPrimary={onAction}
    />
  );
}

/** Shim — delegates to Founder DS offline notice (Phase 6 / 2D). */
export function ExperienceOfflineState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="space-y-4">
      <OrderBhojanDiscoveryOfflineNotice onRetry={onRetry} />
      <OrderBhojanDiscoveryUxState
        variant="offline"
        primaryLabel={onRetry ? 'Retry' : undefined}
        onPrimary={onRetry}
      />
    </div>
  );
}
