import { MapPin } from 'lucide-react';
import { GlassCard } from '../primitives/GlassCard';
import { Skeleton } from '../primitives/Skeleton';
import { SoftButton } from '../primitives/SoftButton';
import type { CheckoutDeliveryAddressViewModel } from './types';

export interface CheckoutDeliveryAddressViewProps {
  readonly address: CheckoutDeliveryAddressViewModel;
  readonly onAction: () => void;
}

export function CheckoutDeliveryAddressView({
  address,
  onAction,
}: CheckoutDeliveryAddressViewProps) {
  return (
    <GlassCard hoverEffect={false} className="!rounded-2xl !p-4" aria-label="Delivery address">
      <div className="flex items-start gap-3">
        <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[#FF7A00]" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/50">
            {address.label}
          </p>
          {address.loading ? (
            <Skeleton className="mt-2 h-4 w-[70%]" />
          ) : (
            <p className="mt-1 text-base text-white">{address.value}</p>
          )}
        </div>
        <SoftButton type="button" tone="ghost" size="compact" onClick={onAction}>
          {address.actionLabel}
        </SoftButton>
      </div>
    </GlassCard>
  );
}
