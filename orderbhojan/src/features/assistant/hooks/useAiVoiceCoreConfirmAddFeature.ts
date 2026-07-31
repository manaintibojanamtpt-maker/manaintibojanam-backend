import { useMemo } from 'react';
import { useFeatureFlag } from '@/featureFlags';
import { useAuth } from '@/shared/providers/AuthProvider';
import { isVoiceCoreConfirmAddEnabledForClient } from '@/features/voice/application/voiceCoreConfirmAddRollout';

/**
 * Progressive live voice-core confirm/add for this client.
 * Kill switch FF_OB_AI_VOICE_CORE_CONFIRM_ADD must be ON, then internal email
 * and/or sticky percent cohort (VITE_OB_VOICE_CORE_CONFIRM_ADD_PCT) must match.
 * OFF / not in cohort → decideVoiceCartTurn + OB apply remain authoritative.
 */
export function useAiVoiceCoreConfirmAddFeature(): boolean {
  const master = useFeatureFlag('FF_OB_AI_VOICE_CORE_CONFIRM_ADD');
  const { user } = useAuth();
  return useMemo(
    () =>
      master &&
      isVoiceCoreConfirmAddEnabledForClient({
        userEmail: user?.email,
        userId: user?.uid,
      }),
    [master, user?.email, user?.uid],
  );
}
