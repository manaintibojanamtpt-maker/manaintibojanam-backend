import { useFeatureFlag } from '@/featureFlags';

/** Personalized reorder / favorites guidance — OFF by default; also requires FF_OB_AI_ASSISTANT. */
export function useAiPersonalizationFeature(): boolean {
  return useFeatureFlag('FF_OB_AI_PERSONALIZATION');
}
