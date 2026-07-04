import { useFeatureFlag } from '@/featureFlags';

export function useDiscoveryFeatureEnabled(): boolean {
  return useFeatureFlag('FF_OB_DISCOVERY');
}
