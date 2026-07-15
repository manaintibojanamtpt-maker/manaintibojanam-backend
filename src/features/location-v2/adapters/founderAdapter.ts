import type { DeliveryAddressV2 } from '@bhojan/location-core';
import {
  getLocationStoreAddress,
  hydrateLocationStore,
  setLocationStoreAddress,
} from '@bhojan/location-core';
import { setGlobalDeliveryState, type DeliveryAddress, type DeliveryState } from '../../../lib/useDeliveryState';
import type { TenantInfo } from '../../../context/TenantContext';
import { deliveryLocationOrchestrator } from '../DeliveryLocationOrchestrator';

export function founderAddressToLegacy(address: DeliveryAddressV2): DeliveryAddress {
  return {
    id: `v2-${address.coordinates.capturedAt}`,
    label: address.text.shortLabel,
    address: address.text.formatted,
    addressText: address.text.shortLabel,
    fullAddress: address.text.formatted,
    houseNumber: address.text.flat,
    buildingName: address.text.building,
    landmark: address.text.landmark,
    city: address.text.city,
    pincode: address.text.pincode,
    lat: address.coordinates.lat,
    lng: address.coordinates.lng,
    distanceKm: address.serviceability?.distanceKm,
    deliveryFee: address.serviceability?.deliveryFee,
    isDefault: true,
  };
}

export function syncFounderDeliveryStateFromV2(
  address: DeliveryAddressV2,
  currentState: DeliveryState,
): void {
  setGlobalDeliveryState({
    ...currentState,
    selectedAddress: founderAddressToLegacy(address),
  });
}

export function hydrateFounderFromUnifiedStore(currentState: DeliveryState): DeliveryAddressV2 | null {
  const address = hydrateLocationStore() ?? getLocationStoreAddress();
  if (address) {
    syncFounderDeliveryStateFromV2(address, currentState);
  }
  return address;
}

export function persistFounderAddress(address: DeliveryAddressV2, currentState: DeliveryState): void {
  setLocationStoreAddress(address);
  syncFounderDeliveryStateFromV2(address, currentState);
}

export function configureFounderLocationContext(tenantInfo?: TenantInfo | null): void {
  deliveryLocationOrchestrator.setContext(
    tenantInfo?.location
      ? {
          kitchenId: tenantInfo.slug || tenantInfo.id || 'founder',
          kitchenLat: tenantInfo.location.lat,
          kitchenLng: tenantInfo.location.lng,
          deliveryConfig: tenantInfo.deliveryConfig,
        }
      : null,
  );
}

export function getFounderApiBaseUrl(): string {
  return (import.meta.env.VITE_API_URL || 'https://manaintibojanam-backend.onrender.com').replace(/\/$/, '');
}
