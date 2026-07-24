import { useFeatureFlag } from '@/featureFlags';

/** Optional TTS confirmation for voice ordering — OFF by default. */
export function useAiVoiceTtsFeature(): boolean {
  return useFeatureFlag('FF_OB_AI_VOICE_TTS');
}
