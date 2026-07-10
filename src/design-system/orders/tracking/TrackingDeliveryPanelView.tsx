import { MapPin, Navigation } from 'lucide-react';
import { GlassCard } from '../../primitives/GlassCard';
import { SectionHeader } from '../../primitives/SectionHeader';
import { SoftButton } from '../../primitives/SoftButton';
import type { TrackingDeliveryViewModel } from './types';

export function TrackingMapPlaceholderView() {
  return (
    <div
      className="flex h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] text-center"
      aria-hidden
    >
      <MapPin className="h-8 w-8 text-[#FF7A00]/70" />
      <p className="text-sm font-medium text-white/60">Live map updates when courier is on the way</p>
    </div>
  );
}

export interface TrackingDeliveryPanelViewProps {
  readonly delivery: TrackingDeliveryViewModel;
  readonly onOpenTracking?: () => void;
}

export function TrackingDeliveryPanelView({ delivery, onOpenTracking }: TrackingDeliveryPanelViewProps) {
  return (
    <GlassCard hoverEffect={false} className="!rounded-2xl !p-4">
      <SectionHeader title="Delivery partner" align="left" className="!mb-4 !mt-0" />
      <TrackingMapPlaceholderView />
      <div className="mt-4 grid grid-cols-2 gap-3">
        {delivery.partner ? (
          <div>
            <p className="text-xs uppercase tracking-wide text-white/50">Partner</p>
            <p className="font-bold text-white">{delivery.partner}</p>
          </div>
        ) : null}
        {delivery.riderName ? (
          <div>
            <p className="text-xs uppercase tracking-wide text-white/50">Rider</p>
            <p className="font-bold text-white">{delivery.riderName}</p>
          </div>
        ) : null}
        {delivery.riderPhone ? (
          <div className="col-span-2">
            <p className="text-xs uppercase tracking-wide text-white/50">Rider phone</p>
            <a href={`tel:${delivery.riderPhone}`} className="font-semibold text-[#FF7A00]">
              {delivery.riderPhone}
            </a>
          </div>
        ) : null}
      </div>
      {delivery.trackingUrl && onOpenTracking ? (
        <SoftButton type="button" fullWidth className="mt-4" onClick={onOpenTracking}>
          <span className="inline-flex items-center gap-2">
            <Navigation className="h-4 w-4" aria-hidden />
            {delivery.trackButtonLabel}
          </span>
        </SoftButton>
      ) : null}
    </GlassCard>
  );
}
