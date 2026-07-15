import { useCallback } from 'react';
import { getLocationStoreAddress } from '@bhojan/location-core';
import { useAuth } from '@/shared/providers/AuthProvider';
import { LOCATION_ERROR_CODES, LocationError } from '../domain/location.errors';
import type { GeoCoordinates } from '../domain/location.types';
import type { SavedAddressInput } from '../domain/location.schema';
import {
  createSavedAddress,
  fetchSavedAddresses,
  hydrateGuestSessionLocation,
  loadRecentLocationEntries,
  markDefaultAddress,
  removeSavedAddress,
} from '../application/locationService';
import {
  applyObRecentLocation,
  applyObSavedAddress,
  captureObGpsLocationDraft,
  confirmObLocationDraft,
} from '../application/obLocationFlowService';
import { useLocationSessionStore } from '../store/locationSessionStore';
import { useLocationGeocodeEnabled } from './useLocationFeature';
import { hydrateObLocationFromV2, persistObLocation } from '../unifiedLocationSync';

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
    try {
      const addresses = await fetchSavedAddresses(sessionUser.uid);
      setSavedAddresses(addresses);
    } catch {
      setSavedAddresses([]);
    }
  }, [sessionUser]);

  const requestCurrentLocation = useCallback(async () => {
    const store = locationStore();
    store.setUiStatus('loading');
    store.setUiError(null);
    store.setPermissionState('prompting');
    try {
      await captureObGpsLocationDraft(geocodeEnabled);
      store.setPermissionState('granted');
      store.setRecentLocations(loadRecentLocationEntries());
      store.setSelectorOpen(false);
      store.setUiStatus('ready');
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
    await applyObSavedAddress(saved, geocodeEnabled);
    store.setRecentLocations(loadRecentLocationEntries());
    store.setSelectorOpen(false);
  }, [geocodeEnabled]);

  const selectRecentLocation = useCallback(async (entryId: string) => {
    const store = locationStore();
    const entry = store.recentLocations.find((e) => e.id === entryId);
    if (!entry) return;
    await applyObRecentLocation(entry.coordinates, entry.displayLabel, geocodeEnabled);
    store.setSelectorOpen(false);
  }, [geocodeEnabled]);

  const saveNewAddress = useCallback(
    async (input: SavedAddressInput) => {
      if (!sessionUser?.uid || !isAuthenticated) {
        throw new LocationError(LOCATION_ERROR_CODES.FIRESTORE_UNAVAILABLE, 'Sign in to save addresses');
      }
      const saved = await createSavedAddress(sessionUser.uid, input);
      await refreshSavedAddresses();
      await applyObSavedAddress(saved, geocodeEnabled);
      locationStore().setSelectorOpen(false);
    },
    [geocodeEnabled, isAuthenticated, refreshSavedAddresses, sessionUser],
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
    const fromV2 = hydrateObLocationFromV2();
    const guest = hydrateGuestSessionLocation();
    const { activeLocation, setActiveLocation, setRecentLocations } = locationStore();
    if (fromV2 && !activeLocation) {
      setActiveLocation(fromV2);
    } else if (guest && !activeLocation) {
      setActiveLocation(persistObLocation(guest));
    }
    setRecentLocations(loadRecentLocationEntries());
  }, []);

  const setManualSession = useCallback(
    async (coordinates: GeoCoordinates, label: string) => {
      const store = locationStore();
      await applyObRecentLocation(coordinates, label, geocodeEnabled);
      store.setRecentLocations(loadRecentLocationEntries());
      store.setSelectorOpen(false);
    },
    [geocodeEnabled],
  );

  const openSelector = useCallback(() => {
    const store = locationStore();
    store.setWizardOpen(false);
    store.setConfirmationOpen(false);
    store.setSelectorOpen(true);
  }, []);

  const closeSelector = useCallback(() => {
    locationStore().setSelectorOpen(false);
    locationStore().resetUi();
  }, []);

  const openWizard = useCallback(() => {
    const store = locationStore();
    store.setSelectorOpen(false);
    store.setConfirmationOpen(true);
  }, []);

  const closeWizard = useCallback(() => {
    locationStore().setWizardOpen(false);
  }, []);

  const openConfirmation = useCallback(() => {
    const store = locationStore();
    store.setSelectorOpen(false);
    store.setWizardOpen(false);
    store.setConfirmationOpen(true);
  }, []);

  const closeConfirmation = useCallback(() => {
    locationStore().setConfirmationOpen(false);
  }, []);

  const confirmAddress = useCallback((input: { flat?: string; building?: string; landmark?: string }) => {
    confirmObLocationDraft(input);
    locationStore().setConfirmationOpen(false);
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
    openWizard,
    closeWizard,
    openConfirmation,
    closeConfirmation,
    confirmAddress,
  };
}

export function useObV2Address() {
  return getLocationStoreAddress();
}
