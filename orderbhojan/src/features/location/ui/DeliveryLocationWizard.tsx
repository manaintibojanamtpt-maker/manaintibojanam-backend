import { useEffect, useState } from 'react';
import {
  BottomSheet,
  Button,
  Card,
  Icon,
  Input,
  Text,
} from '@bhojan/design-system';
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

export function DeliveryLocationWizard() {
  const open = useLocationSessionStore((state) => state.wizardOpen);
  const geocodeEnabled = useLocationGeocodeEnabled();
  const { closeWizard } = useLocationActions();
  const restaurantId = useRestaurantContextStore((state) => state.restaurantId);
  const contextToken = useRestaurantContextStore((state) => state.contextToken);

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

  useEffect(() => {
    if (!open) return;
    setStep('detect');
    setDetecting(false);
    setSaving(false);
    setError(null);
    setAreaLabel('');
    setCoordinates(null);
    setDistancePreview(null);
    setHouse('');
    setBuilding('');
    setLandmark('');
  }, [open]);

  const applyCoordinates = async (coords: GeoCoordinates) => {
    setDetecting(true);
    setError(null);
    try {
      const label = await resolveLocationLabel(coords, geocodeEnabled);
      const serviceability = await checkServiceability({
        lat: coords.lat,
        lng: coords.lng,
        restaurantId: restaurantId ?? undefined,
        contextToken: contextToken ?? undefined,
        orderType: 'delivery',
      });

      if (!serviceability.delivery) {
        setCoordinates(coords);
        setAreaLabel(label);
        setDistancePreview({
          distanceKm: serviceability.distanceKm,
          message: serviceability.message,
        });
        setStep('out_of_bounds');
        return;
      }

      setCoordinates(coords);
      setAreaLabel(label);
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
      closeWizard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save delivery location');
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={closeWizard} title="Confirm delivery location">
      <div className="ob-location-wizard">
        {step === 'detect' ? (
          <div className="ob-location-wizard__detect">
            <Text variant="body">
              Use your current location, then add flat, building, and landmark — same flow as the founder storefront.
            </Text>
            <Button
              variant="primary"
              fullWidth
              className="ob-location-sheet__gps"
              disabled={detecting}
              onClick={() => void handleDetect()}
            >
              <Icon size={18} label="GPS">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
              </Icon>
              {detecting ? 'Detecting location…' : 'Auto detect my location'}
            </Button>
          </div>
        ) : null}

        {step === 'out_of_bounds' ? (
          <Card className="ob-location-wizard__blocked" role="alert">
            <Text variant="subtitle">Location not serviceable</Text>
            <Text variant="bodySm">
              {distancePreview?.message ??
                'This kitchen does not deliver to the selected location right now.'}
            </Text>
            <Button variant="secondary" fullWidth onClick={() => setStep('detect')}>
              Try another location
            </Button>
          </Card>
        ) : null}

        {step === 'form' && coordinates ? (
          <div className="ob-location-wizard__form">
            <Card className="ob-location-wizard__summary">
              <Text variant="microLabel">Delivering to</Text>
              <Text variant="bodySm" style={{ fontWeight: 700 }}>{areaLabel}</Text>
              <div className="ob-location-wizard__metrics">
                {distancePreview?.distanceKm != null ? (
                  <Text variant="caption">Distance: {distancePreview.distanceKm.toFixed(1)} km</Text>
                ) : null}
                {distancePreview?.message ? (
                  <Text variant="caption">{distancePreview.message}</Text>
                ) : null}
              </div>
            </Card>

            <Input
              label="House / Flat No."
              value={house}
              onChange={(event) => setHouse(event.target.value)}
              placeholder="e.g. 402, Block B"
            />
            <Input
              label="Building / Apartment"
              value={building}
              onChange={(event) => setBuilding(event.target.value)}
              placeholder="e.g. Green Valley Residency"
            />
            <Input
              label="Landmark"
              value={landmark}
              onChange={(event) => setLandmark(event.target.value)}
              placeholder="Near main gate, opposite park"
            />

            <Button variant="primary" fullWidth disabled={saving} onClick={() => void handleConfirm()}>
              {saving ? 'Saving…' : 'Confirm & proceed'}
            </Button>
          </div>
        ) : null}

        {error ? (
          <Text variant="caption" role="alert" style={{ color: 'var(--bds-color-error)' }}>
            {error}
          </Text>
        ) : null}
      </div>
    </BottomSheet>
  );
}
