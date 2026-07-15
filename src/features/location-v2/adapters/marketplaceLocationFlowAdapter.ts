import type { DeliveryAddressV2 } from '@bhojan/location-core';
import { deliveryLocationOrchestrator } from '../DeliveryLocationOrchestrator';
import type { UnifiedLocationDeps } from '../useUnifiedLocation';

export type MarketplaceFlowAdapterOptions = {
  apiBaseUrl: string;
  geocodeEnabled: boolean;
  checkServiceability?: (
    lat: number,
    lng: number,
  ) => Promise<DeliveryAddressV2['serviceability'] | undefined>;
  persist?: (address: DeliveryAddressV2) => void | Promise<void>;
};

export function createMarketplaceLocationFlowAdapter(
  options: MarketplaceFlowAdapterOptions,
): UnifiedLocationDeps {
  return {
    app: 'marketplace',
    reverseGeocode: async (lat, lng) => {
      if (!options.geocodeEnabled) {
        const label = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        return {
          text: { formatted: label, shortLabel: label },
          meta: {
            provider: 'nominatim',
            precision: 'approx',
            capturedAt: Date.now(),
          },
        };
      }
      return deliveryLocationOrchestrator.reverseGeocodeViaApi(lat, lng, options.apiBaseUrl);
    },
    computeServiceabilityForActiveContext: async (lat, lng) => {
      const local = deliveryLocationOrchestrator.computeServiceabilityForCoords(lat, lng);
      if (local) {
        return local;
      }
      return options.checkServiceability?.(lat, lng);
    },
    persist: options.persist,
  };
}
