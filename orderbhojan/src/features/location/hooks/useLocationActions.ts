import { useCallback } from 'react';
import { useAuth } from '@/shared/providers/AuthProvider';
import { LOCATION_ERROR_CODES, LocationError } from '../domain/location.errors';
import type { CustomerLocation, GeoCoordinates } from '../domain/location.types';
import type { SavedAddressInput } from '../domain/location.schema';
import {
  applySessionLocation,
  createSavedAddress,
  detectCurrentCoordinates,
  fetchSavedAddresses,
  hydrateGuestSessionLocation,
  loadRecentLocationEntries,
  markDefaultAddress,
  previewServiceability,
  removeSavedAddress,
} from '../application/locationService';
import { useLocationSessionStore } from '../store/locationSessionStore';
import { useLocationGeocodeEnabled } from './useLocationFeature';

export function useLocationActions() {
  const geocodeEnabled = useLocationGeocodeEnabled();
  const { sessionUser, isAuthenticated } = useAuth();
  const store = useLocationSessionStore();

  const refreshSavedAddresses = useCallback(async () => {
    if (!sessionUser?.uid || sessionUser.provider === 'guest') {
      store.setSavedAddresses([]);
      return;
    }
    const addresses = await fetchSavedAddresses(sessionUser.uid);
    store.setSavedAddresses(addresses);
  }, [sessionUser, store]);

  const requestCurrentLocation = useCallback(async () => {
    store.setUiStatus('loading');
    store.setUiError(null);
    store.setPermissionState('prompting');
    try {
      const coordinates = await detectCurrentCoordinates();
      store.setPermissionState('granted');
      const location = await previewServiceability(coordinates, geocodeEnabled);
      const applied = await applySessionLocation(location.coordinates, location.displayLabel, { geocodeEnabled });
      store.setActiveLocation({ ...applied, serviceability: location.serviceability });
      store.setRecentLocations(loadRecentLocationEntries());
      store.setSelectorOpen(false);
    } catch (error) {
      const mapped =
        error instanceof LocationError
          ? { code: error.code, message: error.message, retryable: error.retryable }
          : { code: 'LOCATION_UNAVAILABLE', message: 'Could not detect location', retryable: true };
      store.setPermissionState(mapped.code === 'LOCATION_PERMISSION_DENIED' ? 'denied' : 'unavailable');
      store.setUiError(mapped);
      store.setUiStatus('error');
    }
  }, [geocodeEnabled, store]);

  const selectSavedAddress = useCallback(
    async (addressId: string) => {
      const saved = store.savedAddresses.find((a) => a.id === addressId);
      if (!saved) return;
      const location: CustomerLocation = {
        kind: 'saved',
        coordinates: saved.address.coordinates,
        displayLabel: saved.customLabel ?? saved.label,
        savedAddressId: saved.id,
      };
      store.setActiveLocation(location);
      store.setSelectorOpen(false);
    },
    [store],
  );

  const selectRecentLocation = useCallback(
    async (entryId: string) => {
      const entry = store.recentLocations.find((e) => e.id === entryId);
      if (!entry) return;
      const applied = await applySessionLocation(entry.coordinates, entry.displayLabel, { geocodeEnabled });
      store.setActiveLocation(applied);
      store.setSelectorOpen(false);
    },
    [geocodeEnabled, store],
  );

  const saveNewAddress = useCallback(
    async (input: SavedAddressInput) => {
      if (!sessionUser?.uid || !isAuthenticated) {
        throw new LocationError(LOCATION_ERROR_CODES.FIRESTORE_UNAVAILABLE, 'Sign in to save addresses');
      }
      const saved = await createSavedAddress(sessionUser.uid, input);
      await refreshSavedAddresses();
      store.setActiveLocation({
        kind: 'saved',
        coordinates: saved.address.coordinates,
        displayLabel: saved.customLabel ?? saved.label,
        savedAddressId: saved.id,
      });
      store.setSelectorOpen(false);
    },
    [isAuthenticated, refreshSavedAddresses, sessionUser, store],
  );

  const deleteAddress = useCallback(
    async (addressId: string) => {
      if (!sessionUser?.uid) return;
      await removeSavedAddress(sessionUser.uid, addressId);
      await refreshSavedAddresses();
    },
    [refreshSavedAddresses, sessionUser],
  );

  const setDefault = useCallback(
    async (addressId: string) => {
      if (!sessionUser?.uid) return;
      await markDefaultAddress(sessionUser.uid, addressId);
      await refreshSavedAddresses();
    },
    [refreshSavedAddresses, sessionUser],
  );

  const hydrate = useCallback(() => {
    const guest = hydrateGuestSessionLocation();
    if (guest && !store.activeLocation) {
      store.setActiveLocation(guest);
    }
    store.setRecentLocations(loadRecentLocationEntries());
  }, [store]);

  const setManualSession = useCallback(
    async (coordinates: GeoCoordinates, label: string) => {
      const applied = await applySessionLocation(coordinates, label, { geocodeEnabled });
      store.setActiveLocation(applied);
      store.setRecentLocations(loadRecentLocationEntries());
      store.setSelectorOpen(false);
    },
    [geocodeEnabled, store],
  );

  return {
    requestCurrentLocation,
    selectSavedAddress,
    selectRecentLocation,
    saveNewAddress,
    deleteAddress,
    setDefault,
    refreshSavedAddresses,
    hydrate,
    setManualSession,
    openSelector: () => store.setSelectorOpen(true),
    closeSelector: () => store.setSelectorOpen(false),
  };
}
