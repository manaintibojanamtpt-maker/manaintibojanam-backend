import { MapPin } from 'lucide-react';
import { GlassCard } from '../primitives/GlassCard';
import { Skeleton } from '../primitives/Skeleton';
import type { CheckoutDeliveryAddressViewModel } from './types';

export interface CheckoutDeliveryAddressViewProps {
  readonly address: CheckoutDeliveryAddressViewModel;
}

export function CheckoutDeliveryAddressView({
  address,
}: CheckoutDeliveryAddressViewProps) {
  return (
    <GlassCard hoverEffect={false} className="!rounded-2xl !p-4" aria-hidden>
      <div className="flex items-start gap-3">
        <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[#e85d04]" aria-hidden />
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
        <span className="soft-btn soft-btn--ghost soft-btn--compact shrink-0">
          <span className="soft-btn__inner">{address.actionLabel}</span>
        </span>
      </div>
    </GlassCard>
  );
}
