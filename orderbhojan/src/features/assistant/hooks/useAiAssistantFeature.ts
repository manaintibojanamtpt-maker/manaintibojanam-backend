import { useFeatureFlag } from '@/featureFlags';

/** Consumer AI assistant flag — OFF by default; not cascaded by FF_OB_FIRESTORE. */
export function useAiAssistantFeature(): boolean {
  return useFeatureFlag('FF_OB_AI_ASSISTANT');
}
