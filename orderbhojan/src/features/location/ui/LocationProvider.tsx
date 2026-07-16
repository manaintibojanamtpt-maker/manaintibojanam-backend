import React, { useEffect, useState } from 'react';
import { getLocationStoreAddress, subscribeLocationStore } from '@bhojan/location-core';
import { AddressConfirmationSheet } from '@bhojan/location-v2/components/AddressConfirmationSheet';
import { useAuth } from '@/shared/providers/AuthProvider';
import { useLocationActions } from '../hooks/useLocationActions';
import { useLocationFeatureEnabled } from '../hooks/useLocationFeature';
import { useLocationSessionStore } from '../store/locationSessionStore';
import { LocationSelectorSheet } from './LocationSelectorSheet';
import { DeliveryLocationWizard } from './DeliveryLocationWizard';

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const enabled = useLocationFeatureEnabled();
  const { sessionUser, isAuthenticated } = useAuth();
  const { refreshSavedAddresses, hydrate, confirmAddress, closeConfirmation } = useLocationActions();
  const confirmationOpen = useLocationSessionStore((s) => s.confirmationOpen);
  const [v2Address, setV2Address] = useState(() => getLocationStoreAddress());

  useEffect(() => subscribeLocationStore(setV2Address), []);

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
          <AddressConfirmationSheet
            open={confirmationOpen}
            address={v2Address}
            onClose={closeConfirmation}
            onConfirm={(input) => void confirmAddress(input)}
          />
        </>
      ) : null}
    </>
  );
}
