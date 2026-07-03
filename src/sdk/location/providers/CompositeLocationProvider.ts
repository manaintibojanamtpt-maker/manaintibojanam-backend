/**
 * LocationSDK — composite LocationProvider from provider registry (M2 PR-7).
 * Bridges specialized providers to legacy LocationProvider surface (PR-2).
 */

import type { LocationProvider } from './LocationProvider';
import type { LocationProviderKind } from '../types/branded';
import type { LocationProviderRegistry } from './types';

function resolveCompositeKind(registry: LocationProviderRegistry): LocationProviderKind {
  const geocodingKind = registry.getGeocoding().kind;
  const browserKind = registry.getBrowser().kind;

  if (geocodingKind === 'stub' && browserKind === 'stub') {
    return 'stub';
  }
  if (geocodingKind === 'nominatim') {
    return 'nominatim';
  }
  if (browserKind === 'browser') {
    return 'browser';
  }
  if (geocodingKind === 'cache') {
    return 'cache';
  }
  return 'stub';
}

export function createCompositeLocationProvider(registry: LocationProviderRegistry): LocationProvider {
  const geocoding = registry.getGeocoding();
  const browser = registry.getBrowser();

  return {
    kind: resolveCompositeKind(registry),
    searchAddress: (query, options) => geocoding.searchAddress(query, options),
    forwardGeocode: (input) => geocoding.forwardGeocode(input),
    reverseGeocode: (point) => geocoding.reverseGeocode(point),
    detectCurrentLocation: (options) => browser.detectCurrentLocation(options),
  };
}
