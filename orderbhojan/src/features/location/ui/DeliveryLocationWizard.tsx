import { useState } from 'react';
import { LocateFixed } from 'lucide-react';
import BottomSheet from '@bhojan/storefront-design-system/layout/BottomSheet';
import { GlassCard } from '@bhojan/storefront-design-system/primitives/GlassCard';
import { SoftButton } from '@bhojan/storefront-design-system/primitives/SoftButton';
import { TextFieldView } from '@bhojan/storefront-design-system/primitives/TextFieldView';
import { useRestaurantContextStore } from '@/features/restaurant/store/restaurantContextStore';
import { useLocationGeocodeEnabled } from '../hooks/useLocationFeature';
import { useLocationActions } from '../hooks/useLocationActions';
import { useLocationSessionStore } from '../store/locationSessionStore';
import {
  applySessionLocation,
  detectCurrentCoordinates,
  resolveLocationLabel,
} from '../application/locationService';
import { checkServiceability } from '../infrastructure/marketplaceLocationClient';
import type { GeoCoordinates } from '../domain/location.types';
import { LOCATION_ERROR_CODES, LocationError } from '../domain/location.errors';

type WizardStep = 'detect' | 'form' | 'out_of_bounds';

interface DistancePreview {
  readonly distanceKm?: number;
  readonly message?: string;
}

function buildDeliveryLabel(
  areaLabel: string,
  house: string,
  building: string,
  landmark: string,
): string {
  const parts = [house.trim(), building.trim(), landmark.trim(), areaLabel.trim()].filter(Boolean);
  return parts.join(', ');
}

function DeliveryLocationWizardContent({ onClose }: { readonly onClose: () => void }) {
  const geocodeEnabled = useLocationGeocodeEnabled();
  const restaurantId = useRestaurantContextStore((state) => state.restaurantId);

  const [step, setStep] = useState<WizardStep>('detect');
  const [detecting, setDetecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [areaLabel, setAreaLabel] = useState('');
  const [coordinates, setCoordinates] = useState<GeoCoordinates | null>(null);
  const [distancePreview, setDistancePreview] = useState<DistancePreview | null>(null);
  const [house, setHouse] = useState('');
  const [building, setBuilding] = useState('');
  const [landmark, setLandmark] = useState('');

  const applyCoordinates = async (coords: GeoCoordinates) => {
    setDetecting(true);
    setError(null);
    try {
      const label = await resolveLocationLabel(coords, geocodeEnabled);
      const serviceability = await checkServiceability({
        lat: coords.lat,
        lng: coords.lng,
        restaurantId: restaurantId ?? undefined,
      });
      setCoordinates(coords);
      setAreaLabel(label);
      if (!serviceability.delivery) {
        setDistancePreview({
          distanceKm: serviceability.distanceKm,
          message: serviceability.message,
        });
        setStep('out_of_bounds');
        return;
      }
      setDistancePreview({
        distanceKm: serviceability.distanceKm,
        message: serviceability.message,
      });
      setStep('form');
    } catch (cause) {
      const message =
        cause instanceof LocationError
          ? cause.message
          : cause instanceof Error
            ? cause.message
            : 'Could not detect location';
      setError(message);
    } finally {
      setDetecting(false);
    }
  };

  const handleDetect = async () => {
    try {
      const coords = await detectCurrentCoordinates();
      await applyCoordinates(coords);
    } catch (cause) {
      const message =
        cause instanceof LocationError
          ? cause.message
          : cause instanceof Error
            ? cause.message
            : 'Could not detect location';
      if (cause instanceof LocationError && cause.code === LOCATION_ERROR_CODES.PERMISSION_DENIED) {
        setError('Location permission denied. Allow GPS access or pick a saved address.');
      } else {
        setError(message);
      }
    }
  };

  const handleConfirm = async () => {
    if (!coordinates) return;
    if (!house.trim() || !landmark.trim()) {
      setError('House / flat number and landmark are required.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const displayLabel = buildDeliveryLabel(areaLabel, house, building, landmark);
      const location = await applySessionLocation(coordinates, displayLabel, { geocodeEnabled });
      useLocationSessionStore.getState().setActiveLocation({
        ...location,
        serviceability: {
          status: 'serviceable',
          message: distancePreview?.message,
          distanceKm: distancePreview?.distanceKm,
          checkedAt: new Date().toISOString(),
        },
      });
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save delivery location');
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet isOpen onClose={onClose} title="Confirm delivery location" panelClassName="bg-[#120e0c] text-white">
      <div className="flex flex-col gap-4">
        {step === 'detect' ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-white/70">
              Use your current location, then add flat, building, and landmark — same flow as the founder storefront.
            </p>
            <SoftButton type="button" fullWidth disabled={detecting} onClick={() => void handleDetect()}>
              <LocateFixed className="h-4 w-4" aria-hidden />
              {detecting ? 'Detecting location…' : 'Auto detect my location'}
            </SoftButton>
          </div>
        ) : null}

        {step === 'out_of_bounds' ? (
          <div role="alert">
            <GlassCard hoverEffect={false} className="!rounded-2xl !p-4">
            <p className="text-base font-bold text-white">Location not serviceable</p>
            <p className="mt-2 text-sm text-white/70">
              {distancePreview?.message ??
                'This kitchen does not deliver to the selected location right now.'}
            </p>
            <SoftButton type="button" tone="ghost" fullWidth className="mt-4" onClick={() => setStep('detect')}>
              Try another location
            </SoftButton>
            </GlassCard>
          </div>
        ) : null}

        {step === 'form' && coordinates ? (
          <div className="flex flex-col gap-4">
            <GlassCard hoverEffect={false} className="!rounded-2xl !p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-white/50">Delivering to</p>
              <p className="mt-1 text-sm font-bold text-white">{areaLabel}</p>
              <div className="mt-2 space-y-1">
                {distancePreview?.distanceKm != null ? (
                  <p className="text-xs text-white/60">Distance: {distancePreview.distanceKm.toFixed(1)} km</p>
                ) : null}
                {distancePreview?.message ? (
                  <p className="text-xs text-white/60">{distancePreview.message}</p>
                ) : null}
              </div>
            </GlassCard>

            <TextFieldView
              label="House / Flat No."
              value={house}
              onChange={(event) => setHouse(event.target.value)}
              placeholder="e.g. 402, Block B"
            />
            <TextFieldView
              label="Building / Apartment"
              value={building}
              onChange={(event) => setBuilding(event.target.value)}
              placeholder="e.g. Green Valley Residency"
            />
            <TextFieldView
              label="Landmark"
              value={landmark}
              onChange={(event) => setLandmark(event.target.value)}
              placeholder="Near main gate, opposite park"
            />

            <SoftButton type="button" fullWidth disabled={saving} onClick={() => void handleConfirm()}>
              {saving ? 'Saving…' : 'Confirm & proceed'}
            </SoftButton>
          </div>
        ) : null}

        {error ? (
          <p className="text-sm text-red-400" role="alert">{error}</p>
        ) : null}
      </div>
    </BottomSheet>
  );
}

export function DeliveryLocationWizard() {
  const open = useLocationSessionStore((state) => state.wizardOpen);
  const { closeWizard } = useLocationActions();
  if (!open) return null;
  return <DeliveryLocationWizardContent onClose={closeWizard} />;
}
