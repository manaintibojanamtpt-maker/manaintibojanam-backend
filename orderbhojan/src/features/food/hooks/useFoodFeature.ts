import { useFeatureFlag } from '@/featureFlags';

export function useFoodFeatureEnabled(): boolean {
  return useFeatureFlag('FF_OB_MENU');
}
