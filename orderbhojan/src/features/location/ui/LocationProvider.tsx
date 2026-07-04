import React, { useEffect } from 'react';
import { useAuth } from '@/shared/providers/AuthProvider';
import { useLocationActions } from '../hooks/useLocationActions';
import { useLocationFeatureEnabled } from '../hooks/useLocationFeature';
import { hydrateGuestSessionLocation, loadRecentLocationEntries } from '../application/locationService';
import { useLocationSessionStore } from '../store/locationSessionStore';

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const enabled = useLocationFeatureEnabled();
  const { sessionUser, isAuthenticated } = useAuth();
  const { refreshSavedAddresses, hydrate } = useLocationActions();
  const setRecentLocations = useLocationSessionStore((s) => s.setRecentLocations);
  const setActiveLocation = useLocationSessionStore((s) => s.setActiveLocation);
  const activeLocation = useLocationSessionStore((s) => s.activeLocation);

  useEffect(() => {
    if (!enabled) return;
    hydrate();
    setRecentLocations(loadRecentLocationEntries());
    const guest = hydrateGuestSessionLocation();
    if (guest && !activeLocation) {
      setActiveLocation(guest);
    }
  }, [enabled, hydrate, setActiveLocation, setRecentLocations, activeLocation]);

  useEffect(() => {
    if (!enabled || !isAuthenticated || !sessionUser?.uid) return;
    void refreshSavedAddresses();
  }, [enabled, isAuthenticated, refreshSavedAddresses, sessionUser?.uid]);

  return <>{children}</>;
}
