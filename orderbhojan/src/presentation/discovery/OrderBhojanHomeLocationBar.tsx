import { ChevronDown, MapPin } from 'lucide-react';
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
      className="flex min-h-8 max-w-full items-center gap-1.5 overflow-hidden text-[13px] touch-manipulation"
      role="region"
      aria-label={needsLocation ? 'Set your delivery area to see nearby kitchens' : 'Delivery area'}
    >
      <MapPin className="h-3.5 w-3.5 shrink-0 text-[#e85d04]" aria-hidden />
      <span className="shrink-0 text-[11px] font-medium text-white/45">{modeLabel}</span>
      <div className="min-w-0 flex-1 overflow-hidden">
        {locationEnabled ? (
          <LocationChip
            variant="compact"
            className="max-w-full min-w-0 !border-0 !bg-transparent !p-0 !text-[13px] !font-semibold !text-white touch-manipulation"
          />
        ) : (
          <span className="block truncate font-semibold text-white">Home kitchens near you</span>
        )}
      </div>
      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-white/45" aria-hidden />
      {needsLocation ? (
        <span className="shrink-0 rounded-md bg-[#e85d04]/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#f4a261]">
          Set
        </span>
      ) : null}
    </div>
  );
}
