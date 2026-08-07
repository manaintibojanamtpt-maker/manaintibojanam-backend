import { useFeatureFlag } from '@/featureFlags';

/** Native Android STT bridge — ON via .env.production; Telugu also auto-prefers native when available. */
export function useAiNativeSttFeature(): boolean {
  return useFeatureFlag('FF_OB_AI_NATIVE_STT');
}
