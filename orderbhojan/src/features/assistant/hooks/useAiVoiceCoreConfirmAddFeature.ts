import { useFeatureFlag } from '@/featureFlags';

/**
 * Phase 1.3b — live voice-core confirm/add executor.
 * OFF by default for instant rollback to decideVoiceCartTurn + OB apply.
 */
export function useAiVoiceCoreConfirmAddFeature(): boolean {
  return useFeatureFlag('FF_OB_AI_VOICE_CORE_CONFIRM_ADD');
}
