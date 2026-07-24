import { useCallback } from 'react';
import { useAuth } from '@/shared/providers/AuthProvider';
import {
  runVoiceOrderingTurn,
} from '../application/runVoiceOrderingTurn';
import type { VoiceOrderingTurnResult } from '../domain/voiceOrderingContract';
import { getAssistantApiClient } from '../infrastructure/assistantApiClient';
import { useAiAssistantFeature } from './useAiAssistantFeature';
import { useAiVoiceFeature } from './useAiVoiceFeature';
import { useAiVoiceTtsFeature } from './useAiVoiceTtsFeature';

export interface UseVoiceOrderingTurnResult {
  readonly assistantEnabled: boolean;
  readonly voiceEnabled: boolean;
  readonly ttsEnabled: boolean;
  /** True when assistant + voice flags are ON (TTS optional). */
  readonly enabled: boolean;
  /**
   * Full voice ordering turn (STT → intent → optional TTS).
   * Does not apply cart plans or place orders.
   */
  readonly runTurn: (options?: {
    conversationId?: string;
    signal?: AbortSignal;
    speakConfirmation?: boolean;
  }) => Promise<VoiceOrderingTurnResult>;
}

export function useVoiceOrderingTurn(): UseVoiceOrderingTurnResult {
  const assistantEnabled = useAiAssistantFeature();
  const voiceEnabled = useAiVoiceFeature();
  const ttsEnabled = useAiVoiceTtsFeature();
  const { getIdToken } = useAuth();

  const runTurn = useCallback(
    async (options?: {
      conversationId?: string;
      signal?: AbortSignal;
      speakConfirmation?: boolean;
    }): Promise<VoiceOrderingTurnResult> => {
      return runVoiceOrderingTurn({
        assistantEnabled,
        voiceEnabled,
        ttsEnabled,
        client: getAssistantApiClient(),
        getIdToken,
        conversationId: options?.conversationId,
        signal: options?.signal,
        speakConfirmation: options?.speakConfirmation,
      });
    },
    [assistantEnabled, voiceEnabled, ttsEnabled, getIdToken],
  );

  return {
    assistantEnabled,
    voiceEnabled,
    ttsEnabled,
    enabled: assistantEnabled && voiceEnabled,
    runTurn,
  };
}
