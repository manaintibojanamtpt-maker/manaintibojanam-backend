import { useEffect, useState } from 'react';
import { ChevronDown, MapPin } from 'lucide-react';
import { getLocationStoreAddress, subscribeLocationStore } from '@bhojan/location-core';
import { Skeleton } from '@bhojan/storefront-design-system/primitives/Skeleton';
import { SoftButton } from '@bhojan/storefront-design-system/primitives/SoftButton';
import { useActiveLocation, useLocationUiState } from '../hooks/useActiveLocation';
import { useLocationActions } from '../hooks/useLocationActions';
import { useLocationSessionStore } from '../store/locationSessionStore';
import { hasActiveDeliveryLocation } from '../domain/locationReadiness';

const PLACEHOLDER = 'Set delivery location';
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
  const { openSelector, requestCurrentLocation } = useLocationActions();
  const selectorOpen = useLocationSessionStore((s) => s.selectorOpen);

  useEffect(() => subscribeLocationStore(setV2Address), []);

  const hasCoordsReady = hasActiveDeliveryLocation(active);
  const label =
    isDetecting
      ? 'Detecting location…'
      : v2Address?.text?.shortLabel?.trim() ||
        (hasCoordsReady ? active?.displayLabel : undefined) ||
        PLACEHOLDER;

  const handleClick = () => {
    if (isDetecting) return;
    if (uiStatus === 'error' && uiError?.retryable) {
      void requestCurrentLocation();
      return;
    }
    openSelector();
  };

  return (
    <SoftButton
      type="button"
      tone="ghost"
      fullWidth={variant !== 'compact'}
      disabled={isDetecting}
      className={`!justify-start gap-2 min-h-11 touch-manipulation ${variant === 'compact' ? 'w-full max-w-full !px-2 !py-2' : ''} ${className}`.trim()}
      aria-label={hasCoordsReady ? `Delivery location: ${label}` : USE_CURRENT_LABEL}
      aria-expanded={selectorOpen}
      onClick={handleClick}
    >
      <MapPin className="h-4 w-4 shrink-0 text-[#FF7A00]" aria-hidden />
      {isDetecting ? (
        <Skeleton className="h-4 w-3/5" />
      ) : (
        <span className="truncate text-sm text-white/90">
          {uiError && uiStatus === 'error' ? uiError.message : label}
        </span>
      )}
      <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-white/50" aria-hidden />
    </SoftButton>
  );
}
