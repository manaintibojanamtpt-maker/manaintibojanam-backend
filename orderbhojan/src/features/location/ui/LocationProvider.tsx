import React, { useEffect } from 'react';
import { useAuth } from '@/shared/providers/AuthProvider';
import { useLocationActions } from '../hooks/useLocationActions';
import { useLocationFeatureEnabled } from '../hooks/useLocationFeature';
import { LocationSelectorSheet } from './LocationSelectorSheet';
import { DeliveryLocationWizard } from './DeliveryLocationWizard';

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const enabled = useLocationFeatureEnabled();
  const { sessionUser, isAuthenticated } = useAuth();
  const { refreshSavedAddresses, hydrate } = useLocationActions();

  useEffect(() => {
    if (!enabled) return;
    hydrate();
  }, [enabled, hydrate]);

  useEffect(() => {
    if (!enabled || !isAuthenticated || !sessionUser?.uid) return;
    void refreshSavedAddresses();
  }, [enabled, isAuthenticated, refreshSavedAddresses, sessionUser?.uid]);

  return (
    <>
      {children}
      {enabled ? (
        <>
          <LocationSelectorSheet />
          <DeliveryLocationWizard />
        </>
      ) : null}
    </>
  );
}
