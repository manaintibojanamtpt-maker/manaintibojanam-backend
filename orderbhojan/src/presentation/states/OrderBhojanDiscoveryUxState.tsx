import type { ReactNode } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  MapPin,
  RefreshCw,
  Search,
  UtensilsCrossed,
  WifiOff,
} from 'lucide-react';
import { MarketplaceUxStateView } from '@bhojan/storefront-design-system/marketplace/MarketplaceUxStateView';

export type OrderBhojanDiscoveryUxVariant =
  | 'loading'
  | 'error'
  | 'retry'
  | 'empty'
  | 'no-results'
  | 'no-restaurants'
  | 'offline'
  | 'network-failure'
  | 'timeout'
  | 'maintenance'
  | 'location-disabled'
  | 'permission-denied'
  | 'load-more-error'
  | 'custom';

const PRESETS: Record<
  Exclude<OrderBhojanDiscoveryUxVariant, 'custom' | 'loading'>,
  { title: string; description: string; icon: ReactNode; role: 'alert' | 'status' }
> = {
  error: {
    title: 'Something went wrong',
    description: 'Please check your connection and try again.',
    icon: <AlertCircle className="h-10 w-10 text-red-400/80" aria-hidden />,
    role: 'alert',
  },
  retry: {
    title: 'Could not load content',
    description: 'Tap retry to try again.',
    icon: <RefreshCw className="h-10 w-10 text-white/40" aria-hidden />,
    role: 'alert',
  },
  empty: {
    title: 'Nothing here yet',
    description: 'Check back later for updates.',
    icon: <UtensilsCrossed className="h-10 w-10 text-white/30" aria-hidden />,
    role: 'status',
  },
  'no-results': {
    title: 'No results found',
    description: 'Try a different search term or browse popular picks.',
    icon: <Search className="h-10 w-10 text-white/30" aria-hidden />,
    role: 'status',
  },
  'no-restaurants': {
    title: 'No kitchens nearby',
    description: 'Try updating your location or clearing filters.',
    icon: <UtensilsCrossed className="h-10 w-10 text-white/30" aria-hidden />,
    role: 'status',
  },
  offline: {
    title: 'You appear to be offline',
    description: 'Reconnect to browse kitchens and search.',
    icon: <WifiOff className="h-10 w-10 text-amber-400/80" aria-hidden />,
    role: 'alert',
  },
  'network-failure': {
    title: 'Network error',
    description: 'We could not reach the server. Check your connection and retry.',
    icon: <WifiOff className="h-10 w-10 text-red-400/80" aria-hidden />,
    role: 'alert',
  },
  timeout: {
    title: 'Request timed out',
    description: 'The server took too long to respond. Please try again.',
    icon: <AlertTriangle className="h-10 w-10 text-amber-400/80" aria-hidden />,
    role: 'alert',
  },
  maintenance: {
    title: 'Marketplace unavailable',
    description: 'We are performing maintenance. Please try again shortly.',
    icon: <AlertCircle className="h-10 w-10 text-white/40" aria-hidden />,
    role: 'status',
  },
  'location-disabled': {
    title: 'Location unavailable',
    description: 'Set your delivery location to see kitchens near you.',
    icon: <MapPin className="h-10 w-10 text-[#FF7A00]" aria-hidden />,
    role: 'status',
  },
  'permission-denied': {
    title: 'Location permission denied',
    description: 'Enable location access or enter your address manually.',
    icon: <MapPin className="h-10 w-10 text-[#FF7A00]" aria-hidden />,
    role: 'alert',
  },
  'load-more-error': {
    title: 'Could not load more',
    description: 'Something went wrong while loading additional kitchens.',
    icon: <AlertCircle className="h-10 w-10 text-red-400/80" aria-hidden />,
    role: 'alert',
  },
};

export interface OrderBhojanDiscoveryUxStateProps {
  readonly variant: OrderBhojanDiscoveryUxVariant;
  readonly title?: string;
  readonly description?: string;
  readonly primaryLabel?: string;
  readonly onPrimary?: () => void;
  readonly secondaryLabel?: string;
  readonly onSecondary?: () => void;
  readonly loadingMessage?: string;
  readonly compact?: boolean;
  readonly role?: 'alert' | 'status';
}

export function OrderBhojanDiscoveryUxState({
  variant,
  title,
  description,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  loadingMessage = 'Loading…',
  compact = false,
  role,
}: OrderBhojanDiscoveryUxStateProps) {
  if (variant === 'loading') {
    return (
      <MarketplaceUxStateView
        loading
        loadingMessage={loadingMessage}
        title=""
        compact={compact}
      />
    );
  }

  const preset = variant === 'custom' ? null : PRESETS[variant];
  const resolvedTitle = title ?? preset?.title ?? 'Something went wrong';
  const resolvedDescription = description ?? preset?.description ?? '';
  const resolvedRole = role ?? preset?.role ?? 'status';
  const icon = preset?.icon ?? <AlertCircle className="h-10 w-10 text-red-400/80" aria-hidden />;

  return (
    <MarketplaceUxStateView
      title={resolvedTitle}
      description={resolvedDescription}
      icon={icon}
      role={resolvedRole}
      primaryLabel={primaryLabel}
      onPrimary={onPrimary}
      secondaryLabel={secondaryLabel}
      onSecondary={onSecondary}
      compact={compact}
    />
  );
}
