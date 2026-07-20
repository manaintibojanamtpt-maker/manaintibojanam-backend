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
  v2ToSavedAddressInput,
} from '../application/obLocationFlowService';
import { useLocationSessionStore } from '../store/locationSessionStore';
import { useLocationGeocodeEnabled } from './useLocationFeature';
import { hydrateObLocationFromV2, persistObLocation } from '../unifiedLocationSync';

function locationStore() {
  return useLocationSessionStore.getState();
}

let locationCapturePromise: Promise<void> | null = null;

function isDuplicateSavedAddress(
  savedAddresses: ReturnType<typeof locationStore>['savedAddresses'],
  input: SavedAddressInput,
): boolean {
  return savedAddresses.some(
    (entry) =>
      entry.address.formattedAddress === input.address.formattedAddress &&
      Math.abs(entry.address.coordinates.lat - input.address.coordinates.lat) < 0.0001 &&
      Math.abs(entry.address.coordinates.lng - input.address.coordinates.lng) < 0.0001,
  );
}

async function persistConfirmedAddressForUser(
  uid: string,
  options: { force?: boolean; priorSavedAddressId?: string },
  refreshSavedAddresses: () => Promise<void>,
): Promise<void> {
  if (options.priorSavedAddressId && !options.force) {
    return;
  }

  const address = getLocationStoreAddress();
  if (!address) {
    return;
  }

  const savedInput = v2ToSavedAddressInput(address);
  const store = locationStore();
  if (!options.force && isDuplicateSavedAddress(store.savedAddresses, savedInput)) {
    return;
  }

  await createSavedAddress(uid, savedInput);
  await refreshSavedAddresses();
}

async function runLocationCapture(
  capture: () => Promise<void>,
  onError: (error: unknown) => void,
): Promise<void> {
  if (locationCapturePromise) {
    return locationCapturePromise;
  }

  const store = locationStore();
  store.setLocationCaptureInFlight(true);
  store.setUiStatus('loading');
  store.setUiError(null);

  locationCapturePromise = (async () => {
    try {
      await capture();
    } catch (error) {
      onError(error);
    } finally {
      store.setLocationCaptureInFlight(false);
      locationCapturePromise = null;
    }
  })();

  return locationCapturePromise;
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
    return runLocationCapture(
      async () => {
        const store = locationStore();
        store.setPendingSavedAddress(false);
        store.setPermissionState('prompting');
        await captureObGpsLocationDraft(geocodeEnabled);
        store.setPermissionState('granted');
        store.setRecentLocations(loadRecentLocationEntries());
        store.setSelectorOpen(false);
        store.setUiStatus('ready');
      },
      (error) => {
        const store = locationStore();
        const mapped =
          error instanceof LocationError
            ? { code: error.code, message: error.message, retryable: error.retryable }
            : { code: 'LOCATION_UNAVAILABLE', message: 'Could not detect location', retryable: true };
        store.setPermissionState(mapped.code === 'LOCATION_PERMISSION_DENIED' ? 'denied' : 'unavailable');
        store.setUiError(mapped);
        store.setUiStatus('error');
      },
    );
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

  const startAddSavedAddress = useCallback(async () => {
    const store = locationStore();
    if (!sessionUser?.uid || !isAuthenticated) {
      store.setSelectorOpen(true);
      return;
    }

    return runLocationCapture(
      async () => {
        const activeStore = locationStore();
        activeStore.setPendingSavedAddress(true);
        activeStore.setSelectorOpen(false);
        activeStore.setPermissionState('prompting');
        await captureObGpsLocationDraft(geocodeEnabled);
        activeStore.setPermissionState('granted');
        activeStore.setRecentLocations(loadRecentLocationEntries());
        activeStore.setUiStatus('ready');
      },
      (error) => {
        const activeStore = locationStore();
        activeStore.setPendingSavedAddress(false);
        const mapped =
          error instanceof LocationError
            ? { code: error.code, message: error.message, retryable: error.retryable }
            : { code: 'LOCATION_UNAVAILABLE', message: 'Could not detect location', retryable: true };
        activeStore.setPermissionState(mapped.code === 'LOCATION_PERMISSION_DENIED' ? 'denied' : 'unavailable');
        activeStore.setUiError(mapped);
        activeStore.setUiStatus('error');
        activeStore.setSelectorOpen(true);
      },
    );
  }, [geocodeEnabled, isAuthenticated, sessionUser]);

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

  const confirmAddress = useCallback(
    async (input: { flat?: string; building?: string; landmark?: string }) => {
      const store = locationStore();
      const priorSavedAddressId = store.activeLocation?.savedAddressId;
      const forcePersist = store.pendingSavedAddress;
      confirmObLocationDraft(input);

      if (sessionUser?.uid && isAuthenticated && sessionUser.provider !== 'guest') {
        try {
          await persistConfirmedAddressForUser(
            sessionUser.uid,
            { force: forcePersist, priorSavedAddressId },
            refreshSavedAddresses,
          );
        } catch {
          // Session location is still confirmed even if Firestore save fails.
        }
      }

      store.setPendingSavedAddress(false);
      store.setConfirmationOpen(false);
      store.setSelectorOpen(false);
    },
    [isAuthenticated, refreshSavedAddresses, sessionUser],
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
    openSelector,
    closeSelector,
    startAddSavedAddress,
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
