import { useFeatureFlag } from '@/featureFlags';

/** Post-order AI assist — OFF by default; also requires FF_OB_AI_ASSISTANT for network. */
export function useAiPostOrderFeature(): boolean {
  return useFeatureFlag('FF_OB_AI_POST_ORDER');
}
