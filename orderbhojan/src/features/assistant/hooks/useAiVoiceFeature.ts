import { useFeatureFlag } from '@/featureFlags';

/** Voice capture for consumer AI — OFF by default; not cascaded by FF_OB_FIRESTORE. */
export function useAiVoiceFeature(): boolean {
  return useFeatureFlag('FF_OB_AI_VOICE');
}
