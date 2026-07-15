import { useCallback, useEffect, useState } from 'react';
import {
  detectLiveLocation,
  type DeliveryAddressV2,
  hasConfirmedFlat,
  normalizeAddressText,
  setLocationStoreAddress,
  subscribeLocationStore,
  getLocationStoreAddress,
  trackGeolocationFailure,
  trackOutOfRadius,
  trackReverseGeocodeFailure,
  emitLocationTelemetry,
} from '@bhojan/location-core';

export type UnifiedLocationStatus = 'idle' | 'locating' | 'confirming' | 'ready' | 'error';

export type UnifiedLocationDeps = {
  reverseGeocode: (lat: number, lng: number) => Promise<{
    text: DeliveryAddressV2['text'];
    meta: DeliveryAddressV2['meta'];
  }>;
  computeServiceabilityForActiveContext: (
    lat: number,
    lng: number,
  ) => Promise<DeliveryAddressV2['serviceability'] | undefined>;
  persist?: (payload: DeliveryAddressV2) => Promise<void> | void;
  app?: 'founder' | 'marketplace';
};

export function useUnifiedLocation(deps: UnifiedLocationDeps) {
  const [status, setStatus] = useState<UnifiedLocationStatus>('idle');
  const [address, setAddress] = useState<DeliveryAddressV2 | null>(getLocationStoreAddress());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => subscribeLocationStore(setAddress), []);

  const useCurrentLocation = useCallback(async () => {
    setStatus('locating');
    setError(null);

    const gps = await detectLiveLocation();
    if (!gps.ok) {
      trackGeolocationFailure(gps.code, gps.message, deps.app);
      setStatus('error');
      setError(gps.message);
      return;
    }

    try {
      const geo = await deps.reverseGeocode(gps.coords.lat, gps.coords.lng);
      const serviceability = await deps.computeServiceabilityForActiveContext(
        gps.coords.lat,
        gps.coords.lng,
      );

      if (serviceability && !serviceability.isServiceable) {
        trackOutOfRadius(
          serviceability.kitchenId || 'unknown',
          serviceability.distanceKm,
          gps.coords.lat,
          gps.coords.lng,
          deps.app,
        );
      }

      const draft: DeliveryAddressV2 = {
        version: 2,
        coordinates: gps.coords,
        text: geo.text,
        serviceability,
        meta: geo.meta,
      };

      setAddress(draft);
      setStatus('confirming');
      emitLocationTelemetry('location.detect_success', {
        app: deps.app,
        lat: gps.coords.lat,
        lng: gps.coords.lng,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Reverse geocode failed';
      trackReverseGeocodeFailure(message, deps.app);
      setStatus('error');
      setError(message);
    }
  }, [deps]);

  const confirmAddress = useCallback(
    async (input: { flat?: string; building?: string; landmark?: string }) => {
      if (!address) {
        return;
      }

      const finalAddress: DeliveryAddressV2 = {
        ...address,
        text: normalizeAddressText({
          ...address.text,
          flat: input.flat,
          building: input.building || address.text.building,
          landmark: input.landmark || address.text.landmark,
        }),
      };

      setLocationStoreAddress(finalAddress);
      await deps.persist?.(finalAddress);
      setAddress(finalAddress);
      setStatus('ready');
      emitLocationTelemetry('location.confirm_success', { app: deps.app });
    },
    [address, deps],
  );

  const needsFlatConfirmation = Boolean(address && !hasConfirmedFlat(address));

  return {
    status,
    address,
    error,
    needsFlatConfirmation,
    useCurrentLocation,
    confirmAddress,
    setAddress,
    setStatus,
  };
}
