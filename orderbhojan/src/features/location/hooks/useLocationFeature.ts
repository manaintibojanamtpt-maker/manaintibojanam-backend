import { useFeatureFlag } from '@/featureFlags';

export function useLocationFeatureEnabled(): boolean {
  return useFeatureFlag('FF_LOCATION_ENABLED');
}

export function useLocationGeocodeEnabled(): boolean {
  return useFeatureFlag('FF_LOCATION_GEOCODE_API');
}

export function useLocationMapEnabled(): boolean {
  return useFeatureFlag('FF_LOCATION_MAP_ENABLED');
}
