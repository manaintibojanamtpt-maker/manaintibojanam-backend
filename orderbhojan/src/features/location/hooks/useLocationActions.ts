import { useCallback } from 'react';
import { getLocationStoreAddress } from '@bhojan/location-core';
import { bootstrapCustomerSession } from '@/features/auth/application/profileBootstrapService';
import { upsertCustomerSavedAddress } from '@/features/auth/infrastructure/customerRepository';
import type { AuthSessionUser } from '@/features/auth/domain/auth.types';
import { useAuth } from '@/shared/providers/AuthProvider';
import { LOCATION_ERROR_CODES, LocationError } from '../domain/location.errors';
import type { GeoCoordinates } from '../domain/location.types';
import { savedAddressInputSchema, type SavedAddressInput } from '../domain/location.schema';
import {
  fetchSavedAddresses,
  hydrateGuestSessionLocation,
  loadRecentLocationEntries,
  markDefaultAddress,
  removeSavedAddress,
  updateSavedAddress,
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
  sessionUser: AuthSessionUser,
  options: { force?: boolean; updatingSavedAddressId?: string },
  refreshSavedAddresses: () => Promise<boolean>,
): Promise<void> {
  const address = getLocationStoreAddress();
  if (!address) {
    return;
  }

  const savedInput = v2ToSavedAddressInput(address);
  const parsed = savedAddressInputSchema.safeParse(savedInput);
  if (!parsed.success) {
    if (import.meta.env.DEV) {
      console.warn('[OrderBhojan] Skipped saved-address persist — invalid address payload', parsed.error.flatten());
    }
    return;
  }

  await bootstrapCustomerSession(sessionUser);

  if (options.updatingSavedAddressId) {
    await updateSavedAddress(uid, options.updatingSavedAddressId, parsed.data);
    await refreshSavedAddresses();
    return;
  }

  const store = locationStore();
  if (!options.force && isDuplicateSavedAddress(store.savedAddresses, parsed.data)) {
    return;
  }

  await upsertCustomerSavedAddress(sessionUser, parsed.data);
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

  const refreshSavedAddresses = useCallback(async (): Promise<boolean> => {
    const { setSavedAddresses, savedAddresses } = locationStore();
    if (!sessionUser?.uid || sessionUser.provider === 'guest') {
      setSavedAddresses([]);
      return true;
    }
    try {
      const addresses = await fetchSavedAddresses(sessionUser.uid);
      setSavedAddresses(addresses);
      return true;
    } catch {
      // Keep cached addresses on native resume / offline refresh failures.
      if (savedAddresses.length === 0) {
        setSavedAddresses([]);
      }
      return false;
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
      await bootstrapCustomerSession(sessionUser);
      const saved = await upsertCustomerSavedAddress(sessionUser, input);
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
        // Keep the selector open while GPS runs so the user never drops onto a blank homepage.
        activeStore.setPendingSavedAddress(true);
        activeStore.setSelectorOpen(true);
        activeStore.setPermissionState('prompting');
        await captureObGpsLocationDraft(geocodeEnabled);
        activeStore.setPermissionState('granted');
        activeStore.setRecentLocations(loadRecentLocationEntries());
        activeStore.setUiStatus('ready');
        // Hand off to flat confirmation once draft is ready.
        activeStore.setSelectorOpen(false);
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
    const store = locationStore();
    store.setSelectorOpen(false);
    // Preserve timeout/permission errors in the header; only clear transient loading.
    if (store.uiStatus === 'loading' && !store.locationCaptureInFlight) {
      store.setUiStatus(store.activeLocation ? 'ready' : 'idle');
    }
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
      const isUpdatingSaved = store.activeLocation?.kind === 'saved';
      const updatingSavedAddressId = isUpdatingSaved ? store.activeLocation?.savedAddressId : undefined;
      const forcePersist = store.pendingSavedAddress || !isUpdatingSaved;
      confirmObLocationDraft(input);

      if (sessionUser?.uid && isAuthenticated && sessionUser.provider !== 'guest') {
        try {
          await persistConfirmedAddressForUser(
            sessionUser.uid,
            sessionUser,
            { force: forcePersist, updatingSavedAddressId },
            refreshSavedAddresses,
          );
        } catch (error) {
          if (import.meta.env.DEV) {
            console.warn('[OrderBhojan] Saved-address persist failed after confirmation', error);
          }
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
