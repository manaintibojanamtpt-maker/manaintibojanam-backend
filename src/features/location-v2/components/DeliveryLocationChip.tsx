import { MapPin } from 'lucide-react';
import { getLocationShortLabel } from '@bhojan/location-core';
import { UseCurrentLocationButton } from './UseCurrentLocationButton';

type DeliveryLocationChipProps = {
  addressLabel?: string;
  onUseCurrentLocation?: () => void;
  locating?: boolean;
  onOpenSelector?: () => void;
  className?: string;
};

export function DeliveryLocationChip({
  addressLabel,
  onUseCurrentLocation,
  locating = false,
  onOpenSelector,
  className = '',
}: DeliveryLocationChipProps) {
  const label = addressLabel || getLocationShortLabel();

  return (
    <div className={`inline-flex max-w-full items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={onOpenSelector}
        className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-xs font-semibold text-white/90"
      >
        <MapPin className="h-3.5 w-3.5 shrink-0 text-[#FF7A00]" />
        <span className="truncate">{label}</span>
      </button>
      {onUseCurrentLocation ? (
        <UseCurrentLocationButton onClick={onUseCurrentLocation} loading={locating} />
      ) : null}
    </div>
  );
}

export default DeliveryLocationChip;
