import { useFeatureFlag } from '@/featureFlags';

/** Phase 4D voice-first customer experience feature flag. */
export function useVoiceFirstFeature(): boolean {
  return useFeatureFlag('FF_OB_VOICE_FIRST_EXPERIENCE');
}
