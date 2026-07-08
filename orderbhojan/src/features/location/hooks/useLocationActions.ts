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

function locationStore() {
  return useLocationSessionStore.getState();
}

export function useLocationActions() {
  const geocodeEnabled = useLocationGeocodeEnabled();
  const { sessionUser, isAuthenticated } = useAuth();

  const refreshSavedAddresses = useCallback(async () => {
    const { setSavedAddresses } = locationStore();
    if (!sessionUser?.uid || sessionUser.provider === 'guest') {
      setSavedAddresses([]);
      return;
    }
    const addresses = await fetchSavedAddresses(sessionUser.uid);
    setSavedAddresses(addresses);
  }, [sessionUser]);

  const requestCurrentLocation = useCallback(async () => {
    const store = locationStore();
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
  }, [geocodeEnabled]);

  const selectSavedAddress = useCallback(async (addressId: string) => {
    const store = locationStore();
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
  }, []);

  const selectRecentLocation = useCallback(async (entryId: string) => {
    const store = locationStore();
    const entry = store.recentLocations.find((e) => e.id === entryId);
    if (!entry) return;
    const applied = await applySessionLocation(entry.coordinates, entry.displayLabel, { geocodeEnabled });
    store.setActiveLocation(applied);
    store.setSelectorOpen(false);
  }, [geocodeEnabled]);

  const saveNewAddress = useCallback(
    async (input: SavedAddressInput) => {
      if (!sessionUser?.uid || !isAuthenticated) {
        throw new LocationError(LOCATION_ERROR_CODES.FIRESTORE_UNAVAILABLE, 'Sign in to save addresses');
      }
      const saved = await createSavedAddress(sessionUser.uid, input);
      await refreshSavedAddresses();
      locationStore().setActiveLocation({
        kind: 'saved',
        coordinates: saved.address.coordinates,
        displayLabel: saved.customLabel ?? saved.label,
        savedAddressId: saved.id,
      });
      locationStore().setSelectorOpen(false);
    },
    [isAuthenticated, refreshSavedAddresses, sessionUser],
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
    const { activeLocation, setActiveLocation, setRecentLocations } = locationStore();
    if (guest && !activeLocation) {
      setActiveLocation(guest);
    }
    setRecentLocations(loadRecentLocationEntries());
  }, []);

  const setManualSession = useCallback(
    async (coordinates: GeoCoordinates, label: string) => {
      const store = locationStore();
      const applied = await applySessionLocation(coordinates, label, { geocodeEnabled });
      store.setActiveLocation(applied);
      store.setRecentLocations(loadRecentLocationEntries());
      store.setSelectorOpen(false);
    },
    [geocodeEnabled],
  );

  const openSelector = useCallback(() => {
    locationStore().setSelectorOpen(true);
  }, []);

  const closeSelector = useCallback(() => {
    locationStore().setSelectorOpen(false);
  }, []);

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
    openSelector,
    closeSelector,
  };
}
