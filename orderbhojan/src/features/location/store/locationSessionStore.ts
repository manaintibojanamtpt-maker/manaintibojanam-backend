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
  readonly savedAddresses: SavedAddress[];
  readonly recentLocations: RecentLocationEntry[];
  readonly selectorOpen: boolean;

  setActiveLocation: (location: CustomerLocation | null) => void;
  setPermissionState: (state: GeolocationPermissionState) => void;
  setUiStatus: (status: LocationUiStatus) => void;
  setUiError: (error: LocationUiError | null) => void;
  setSavedAddresses: (addresses: SavedAddress[]) => void;
  setRecentLocations: (entries: RecentLocationEntry[]) => void;
  setSelectorOpen: (open: boolean) => void;
  resetUi: () => void;
}

export const useLocationSessionStore = create<LocationSessionState>()(
  persist(
    (set) => ({
      activeLocation: null,
      permissionState: 'idle',
      uiStatus: 'idle',
      uiError: null,
      savedAddresses: [],
      recentLocations: [],
      selectorOpen: false,

      setActiveLocation: (activeLocation) => set({ activeLocation, uiStatus: activeLocation ? 'ready' : 'idle' }),
      setPermissionState: (permissionState) => set({ permissionState }),
      setUiStatus: (uiStatus) => set({ uiStatus }),
      setUiError: (uiError) => set({ uiError, uiStatus: uiError ? 'error' : 'idle' }),
      setSavedAddresses: (savedAddresses) => set({ savedAddresses }),
      setRecentLocations: (recentLocations) => set({ recentLocations }),
      setSelectorOpen: (selectorOpen) => set({ selectorOpen }),
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
