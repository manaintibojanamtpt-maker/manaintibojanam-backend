import { useLocationSessionStore } from '../store/locationSessionStore';

export function useActiveLocation() {
  return useLocationSessionStore((s) => s.activeLocation);
}

export function useLocationUiState() {
  return useLocationSessionStore((s) => ({
    uiStatus: s.uiStatus,
    uiError: s.uiError,
    permissionState: s.permissionState,
  }));
}

export function useSavedAddressesList() {
  return useLocationSessionStore((s) => s.savedAddresses);
}

export function useRecentLocationsList() {
  return useLocationSessionStore((s) => s.recentLocations);
}
