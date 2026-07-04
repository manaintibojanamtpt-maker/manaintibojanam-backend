import {
  EmptyState,
  ErrorState,
  Icon,
} from '@bhojan/design-system';

export type ExperienceEmptyVariant =
  | 'no-restaurants'
  | 'no-internet'
  | 'no-address'
  | 'permission-denied'
  | 'search-empty';

const COPY: Record<ExperienceEmptyVariant, { title: string; description: string }> = {
  'no-restaurants': {
    title: 'No restaurants nearby',
    description: 'Try changing your delivery address or check back later.',
  },
  'no-internet': {
    title: 'No internet connection',
    description: 'Check your network and pull to refresh when you are back online.',
  },
  'no-address': {
    title: 'Add a delivery address',
    description: 'Set your location to see restaurants that deliver to you.',
  },
  'permission-denied': {
    title: 'Location permission denied',
    description: 'Enable location in settings or enter your address manually.',
  },
  'search-empty': {
    title: 'No results found',
    description: 'Try a different dish, cuisine, or restaurant name.',
  },
};

export function ExperienceEmptyState({
  variant,
  onAction,
  actionLabel = 'Try again',
}: {
  variant: ExperienceEmptyVariant;
  onAction?: () => void;
  actionLabel?: string;
}) {
  const copy = COPY[variant];
  return (
    <EmptyState
      title={copy.title}
      description={copy.description}
      actionLabel={onAction ? actionLabel : undefined}
      onAction={onAction}
      icon={
        <Icon size={40} label={copy.title}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5" />
          <path d="M12 16h.01" />
        </Icon>
      }
    />
  );
}

export function ExperienceOfflineState({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      title="You appear to be offline"
      description="Reconnect to browse restaurants and offers."
      retryLabel="Retry"
      onRetry={onRetry}
    />
  );
}
