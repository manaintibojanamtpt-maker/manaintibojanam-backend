import { useFeatureFlag } from '@/featureFlags';

export function useRestaurantFeatureEnabled(): boolean {
  return useFeatureFlag('FF_OB_RESTAURANT');
}
