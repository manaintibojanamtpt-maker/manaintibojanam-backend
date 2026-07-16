import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  CustomerLocation,
  GeolocationPermissionState,
  LocationUiError,
  LocationUiStatus,
  RecentLocationEntry,
  SavedAddress,
} from '../domain/location.types';

interface LocationSessionState {
  readonly activeLocation: CustomerLocation | null;
  readonly permissionState: GeolocationPermissionState;
  readonly uiStatus: LocationUiStatus;
  readonly uiError: LocationUiError | null;
  readonly locationCaptureInFlight: boolean;
  readonly savedAddresses: SavedAddress[];
  readonly recentLocations: RecentLocationEntry[];
  readonly selectorOpen: boolean;
  readonly wizardOpen: boolean;
  readonly confirmationOpen: boolean;
  readonly pendingSavedAddress: boolean;

  setActiveLocation: (location: CustomerLocation | null) => void;
  setPermissionState: (state: GeolocationPermissionState) => void;
  setUiStatus: (status: LocationUiStatus) => void;
  setUiError: (error: LocationUiError | null) => void;
  setLocationCaptureInFlight: (inFlight: boolean) => void;
  setSavedAddresses: (addresses: SavedAddress[]) => void;
  setRecentLocations: (entries: RecentLocationEntry[]) => void;
  setSelectorOpen: (open: boolean) => void;
  setWizardOpen: (open: boolean) => void;
  setConfirmationOpen: (open: boolean) => void;
  setPendingSavedAddress: (pending: boolean) => void;
  resetUi: () => void;
}

export const useLocationSessionStore = create<LocationSessionState>()(
  persist(
    (set) => ({
      activeLocation: null,
      permissionState: 'idle',
      uiStatus: 'idle',
      uiError: null,
      locationCaptureInFlight: false,
      savedAddresses: [],
      recentLocations: [],
      selectorOpen: false,
      wizardOpen: false,
      confirmationOpen: false,
      pendingSavedAddress: false,

      setActiveLocation: (activeLocation) =>
        set((state) => ({
          activeLocation,
          uiStatus: state.locationCaptureInFlight
            ? state.uiStatus
            : activeLocation
              ? 'ready'
              : 'idle',
        })),
      setPermissionState: (permissionState) => set({ permissionState }),
      setUiStatus: (uiStatus) => set({ uiStatus }),
      setUiError: (uiError) =>
        set((state) => ({
          uiError,
          uiStatus: uiError ? 'error' : state.locationCaptureInFlight ? state.uiStatus : 'idle',
        })),
      setLocationCaptureInFlight: (locationCaptureInFlight) => set({ locationCaptureInFlight }),
      setSavedAddresses: (savedAddresses) => set({ savedAddresses }),
      setRecentLocations: (recentLocations) => set({ recentLocations }),
      setSelectorOpen: (selectorOpen) => set({ selectorOpen }),
      setWizardOpen: (wizardOpen: boolean) => set({ wizardOpen }),
      setConfirmationOpen: (confirmationOpen: boolean) => set({ confirmationOpen }),
      setPendingSavedAddress: (pendingSavedAddress: boolean) => set({ pendingSavedAddress }),
      resetUi: () => set({ uiStatus: 'idle', uiError: null }),
    }),
    {
      name: 'ob-location-session-v1',
      partialize: (state) => ({
        activeLocation: state.activeLocation,
        recentLocations: state.recentLocations,
      }),
    },
  ),
);
