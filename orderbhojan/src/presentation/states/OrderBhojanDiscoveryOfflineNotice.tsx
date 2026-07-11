import { GlassCard } from '@bhojan/storefront-design-system/primitives/GlassCard';
import { SoftButton } from '@bhojan/storefront-design-system/primitives/SoftButton';
import { WifiOff } from 'lucide-react';

export interface OrderBhojanDiscoveryOfflineNoticeProps {
  readonly onRetry?: () => void;
}

export function OrderBhojanDiscoveryOfflineNotice({ onRetry }: OrderBhojanDiscoveryOfflineNoticeProps) {
  return (
    <div role="alert" aria-live="assertive" className="mb-4">
      <GlassCard hoverEffect={false} className="!rounded-2xl !p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 text-left">
            <WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-white">You appear to be offline</p>
              <p className="text-xs text-white/60">Reconnect to refresh kitchens and search results.</p>
            </div>
          </div>
          {onRetry ? (
            <SoftButton type="button" tone="ghost" size="compact" onClick={onRetry}>
              Retry
            </SoftButton>
          ) : null}
        </div>
      </GlassCard>
    </div>
  );
}
