import { useEffect, useState } from 'react';
import { ChevronDown, MapPin } from 'lucide-react';
import { getLocationStoreAddress, subscribeLocationStore } from '@bhojan/location-core';
import { Skeleton } from '@bhojan/storefront-design-system/primitives/Skeleton';
import { SoftButton } from '@bhojan/storefront-design-system/primitives/SoftButton';
import { useActiveLocation, useLocationUiState } from '../hooks/useActiveLocation';
import { useLocationActions } from '../hooks/useLocationActions';
import { useLocationSessionStore } from '../store/locationSessionStore';
import { resolveActiveDeliveryLocation } from '../domain/activeDeliveryLocation';
import { hasActiveDeliveryLocation, needsFlatConfirmation } from '../domain/locationReadiness';

const PLACEHOLDER = 'Set your delivery area';
const USE_CURRENT_LABEL = 'Use current location';

interface LocationChipProps {
  readonly className?: string;
  readonly variant?: 'hero' | 'compact';
}

export function LocationChip({ className = '', variant = 'hero' }: LocationChipProps) {
  const active = useActiveLocation();
  const [v2Address, setV2Address] = useState(() => getLocationStoreAddress());
  const { uiStatus, uiError } = useLocationUiState();
  const captureInFlight = useLocationSessionStore((s) => s.locationCaptureInFlight);
  const isDetecting = uiStatus === 'loading' || captureInFlight;
  const { openSelector } = useLocationActions();
  const selectorOpen = useLocationSessionStore((s) => s.selectorOpen);

  useEffect(() => subscribeLocationStore(setV2Address), []);

  const delivery = resolveActiveDeliveryLocation(active);
  const hasCoordsReady = hasActiveDeliveryLocation(active);
  const needsFlat = needsFlatConfirmation(active);
  const areaLabel =
    v2Address?.text?.shortLabel?.trim() ||
    delivery?.text.shortLabel?.trim() ||
    active?.displayLabel?.trim() ||
    undefined;
  const label = isDetecting
    ? 'Detecting location…'
    : needsFlat && areaLabel
      ? `Add flat · ${areaLabel}`
      : areaLabel || PLACEHOLDER;

  const handleClick = () => {
    if (isDetecting) return;
    // Errors stay visible in the chip; open the selector so Retry / Enter manually is available.
    openSelector();
  };

  return (
    <SoftButton
      type="button"
      tone="ghost"
      fullWidth={variant !== 'compact'}
      disabled={isDetecting}
      className={`!justify-start gap-2 min-h-11 touch-manipulation ${variant === 'compact' ? 'w-full max-w-full !px-2 !py-2' : ''} ${className}`.trim()}
      aria-label={
        uiError && uiStatus === 'error'
          ? `Location error: ${uiError.message}`
          : hasCoordsReady
            ? `Delivery location: ${label}`
            : USE_CURRENT_LABEL
      }
      aria-expanded={selectorOpen}
      onClick={handleClick}
    >
      <MapPin className="h-4 w-4 shrink-0 text-[#FF7A00]" aria-hidden />
      {isDetecting ? (
        <Skeleton className="h-4 w-3/5" />
      ) : (
        <span
          className={`truncate text-sm ${
            uiError && uiStatus === 'error'
              ? 'text-red-300/90'
              : hasCoordsReady || Boolean(areaLabel)
                ? 'text-white/90'
                : 'font-semibold text-[#FFB366]'
          }`}
        >
          {uiError && uiStatus === 'error' ? uiError.message : label}
        </span>
      )}
      <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-white/50" aria-hidden />
    </SoftButton>
  );
}
