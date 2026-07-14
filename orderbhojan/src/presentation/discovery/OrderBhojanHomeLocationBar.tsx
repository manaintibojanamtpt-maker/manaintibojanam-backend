import { MapPin } from 'lucide-react';
import { LocationChip, useLocationFeatureEnabled } from '@/features/location';

export function OrderBhojanHomeLocationBar() {
  const locationEnabled = useLocationFeatureEnabled();

  return (
    <div
      className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white/70 backdrop-blur-md"
      role="region"
      aria-label="Delivery area"
    >
      <MapPin className="h-3.5 w-3.5 shrink-0 text-[#FF7A00]" aria-hidden />
      <span className="shrink-0 font-medium text-white/50">Delivering to</span>
      {locationEnabled ? (
        <LocationChip variant="compact" className="min-w-0 !border-0 !bg-transparent !p-0 !text-white/90 touch-manipulation" />
      ) : (
        <span className="truncate font-semibold text-white/80">Home kitchens near you</span>
      )}
    </div>
  );
}
