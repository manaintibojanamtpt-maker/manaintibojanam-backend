import { useFeatureFlag } from '@/featureFlags';

/** Native Android STT bridge — OFF by default; falls back to Web Speech. */
export function useAiNativeSttFeature(): boolean {
  return useFeatureFlag('FF_OB_AI_NATIVE_STT');
}
