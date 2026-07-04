import { useFeatureFlag } from '@/featureFlags';

export function useSearchFeatureEnabled(): boolean {
  return useFeatureFlag('FF_OB_SEARCH');
}
