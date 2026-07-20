import { MapPin } from 'lucide-react';
import {
  LocationChip,
  hasActiveDeliveryLocation,
  useActiveLocation,
  useLocationFeatureEnabled,
} from '@/features/location';

export function OrderBhojanHomeLocationBar() {
  const locationEnabled = useLocationFeatureEnabled();
  const activeLocation = useActiveLocation();
  const hasDeliveryArea = hasActiveDeliveryLocation(activeLocation);
  const needsLocation = locationEnabled && !hasDeliveryArea;

  return (
    <div
      className={`inline-flex max-w-full min-h-11 items-center gap-2 rounded-full border px-3 py-2 text-xs backdrop-blur-md touch-manipulation ${
        needsLocation
          ? 'border-[#FF7A00]/50 bg-[#FF7A00]/10 text-white/90'
          : 'border-white/10 bg-black/40 text-white/80'
      }`}
      role="region"
      aria-label={needsLocation ? 'Set your delivery area to see nearby kitchens' : 'Delivery area'}
    >
      <MapPin className="h-3.5 w-3.5 shrink-0 text-[#FF7A00]" aria-hidden />
      <span className="shrink-0 font-medium text-white/70">
        {needsLocation ? 'Deliver to' : 'Delivering to'}
      </span>
      {locationEnabled ? (
        <LocationChip variant="compact" className="min-w-0 !border-0 !bg-transparent !p-0 !text-white/90 touch-manipulation" />
      ) : (
        <span className="truncate font-semibold text-white/85">Home kitchens near you</span>
      )}
      {needsLocation ? (
        <span className="shrink-0 rounded-full bg-[#FF7A00]/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#FFB366]">
          Set area
        </span>
      ) : null}
    </div>
  );
}
