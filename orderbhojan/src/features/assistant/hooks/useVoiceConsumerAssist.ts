import { useCallback } from 'react';
import { useAuth } from '@/shared/providers/AuthProvider';
import { runVoiceConsumerAssist, type VoiceConsumerAssistResult } from '../application/runVoiceConsumerAssist';
import { getAssistantApiClient } from '../infrastructure/assistantApiClient';
import { useAiAssistantFeature } from './useAiAssistantFeature';
import { useAiVoiceFeature } from './useAiVoiceFeature';

export interface UseVoiceConsumerAssistResult {
  readonly assistantEnabled: boolean;
  readonly voiceEnabled: boolean;
  /** True only when both assistant + voice flags are ON. */
  readonly enabled: boolean;
  /**
   * Capture speech and send transcript to consumer assist.
   * Throws when either flag is OFF (no mic / no network).
   * Does not apply cart plans.
   */
  readonly askWithVoice: (options?: {
    conversationId?: string;
    signal?: AbortSignal;
  }) => Promise<VoiceConsumerAssistResult>;
}

export function useVoiceConsumerAssist(): UseVoiceConsumerAssistResult {
  const assistantEnabled = useAiAssistantFeature();
  const voiceEnabled = useAiVoiceFeature();
  const { getIdToken } = useAuth();

  const askWithVoice = useCallback(
    async (options?: {
      conversationId?: string;
      signal?: AbortSignal;
    }): Promise<VoiceConsumerAssistResult> => {
      return runVoiceConsumerAssist({
        assistantEnabled,
        voiceEnabled,
        client: getAssistantApiClient(),
        getIdToken,
        conversationId: options?.conversationId,
        signal: options?.signal,
      });
    },
    [assistantEnabled, voiceEnabled, getIdToken],
  );

  return {
    assistantEnabled,
    voiceEnabled,
    enabled: assistantEnabled && voiceEnabled,
    askWithVoice,
  };
}
