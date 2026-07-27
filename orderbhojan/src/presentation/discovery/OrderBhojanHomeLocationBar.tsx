import { MapPin } from 'lucide-react';
import {
  LocationChip,
  resolveActiveDeliveryLocation,
  useActiveLocation,
  useLocationFeatureEnabled,
} from '@/features/location';

export function OrderBhojanHomeLocationBar() {
  const locationEnabled = useLocationFeatureEnabled();
  const activeLocation = useActiveLocation();
  const deliveryLocation = resolveActiveDeliveryLocation(activeLocation);
  const needsLocation = locationEnabled && deliveryLocation == null;
  const modeLabel =
    deliveryLocation?.mode === 'current'
      ? 'Current location'
      : deliveryLocation
        ? 'Delivering to'
        : 'Deliver to';

  return (
    <div
      className={`inline-flex max-w-full min-h-11 items-center gap-2 rounded-full border px-3 py-2 text-xs backdrop-blur-md touch-manipulation ${
        needsLocation
          ? 'border-[#e85d04]/50 bg-[#e85d04]/10 text-[#fff8f0]/90'
          : 'border-[color:var(--mib-border,white/10)] bg-black/40 text-[#c4b5a5]'
      }`}
      role="region"
      aria-label={needsLocation ? 'Set your delivery area to see nearby kitchens' : 'Delivery area'}
    >
      <MapPin className="h-3.5 w-3.5 shrink-0 text-[#e85d04]" aria-hidden />
      <span className="shrink-0 font-medium text-[#c4b5a5]">{modeLabel}</span>
      {locationEnabled ? (
        <LocationChip variant="compact" className="min-w-0 !border-0 !bg-transparent !p-0 !text-white/90 touch-manipulation" />
      ) : (
        <span className="truncate font-semibold text-white/85">Home kitchens near you</span>
      )}
      {needsLocation ? (
        <span className="shrink-0 rounded-full bg-[#e85d04]/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#f4a261]">
          Set area
        </span>
      ) : null}
    </div>
  );
}
