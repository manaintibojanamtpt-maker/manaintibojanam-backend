import type { AssistantApiClient } from '../infrastructure/assistantApiClient';
import type { SpeechRecognitionFactory } from '../infrastructure/voiceSpeechCapture';
import {
  speakVoiceConfirmation,
  type SpeechSynthesisFactory,
  type UtteranceFactory,
} from '../infrastructure/voiceSpeechSynthesis';
import {
  assertVoiceOrderingTurnSafe,
  toVoiceOrderingTurn,
  type VoiceOrderingTurnResult,
} from '../domain/voiceOrderingContract';
import { AssistantApiError } from '../types';
import { runVoiceConsumerAssist } from './runVoiceConsumerAssist';

export interface RunVoiceOrderingTurnParams {
  readonly assistantEnabled: boolean;
  readonly voiceEnabled: boolean;
  /** FF_OB_AI_VOICE_TTS — optional spoken confirmation of assistant reply */
  readonly ttsEnabled: boolean;
  readonly client: Pick<AssistantApiClient, 'consumerAssist'>;
  readonly getIdToken: () => Promise<string | null>;
  readonly conversationId?: string;
  readonly signal?: AbortSignal;
  readonly createRecognition?: SpeechRecognitionFactory;
  readonly createSynthesis?: SpeechSynthesisFactory;
  readonly createUtterance?: UtteranceFactory;
  readonly isNative?: () => boolean;
  /** When true and TTS enabled, speak the reply (default true). */
  readonly speakConfirmation?: boolean;
}

/**
 * Phase 6 voice ordering turn:
 * 1) STT → 2) gateway assist (structured intent) → 3) optional TTS confirmation.
 * Never applies cart/checkout side effects.
 */
export async function runVoiceOrderingTurn(
  params: RunVoiceOrderingTurnParams,
): Promise<VoiceOrderingTurnResult> {
  if (!params.assistantEnabled) {
    throw new AssistantApiError({
      code: 'AI_FEATURE_DISABLED',
      message: 'Consumer AI assistant is disabled.',
      retryable: false,
    });
  }
  if (!params.voiceEnabled) {
    throw new AssistantApiError({
      code: 'AI_VOICE_DISABLED',
      message: 'AI voice capture is disabled.',
      retryable: false,
    });
  }

  const { voice, assist } = await runVoiceConsumerAssist({
    assistantEnabled: params.assistantEnabled,
    voiceEnabled: params.voiceEnabled,
    client: params.client,
    getIdToken: params.getIdToken,
    conversationId: params.conversationId,
    signal: params.signal,
    createRecognition: params.createRecognition,
    isNative: params.isNative,
  });

  const shouldSpeak =
    params.ttsEnabled === true && params.speakConfirmation !== false && assist.reply.trim().length > 0;

  let confirmationSpoken = false;
  if (shouldSpeak) {
    await speakVoiceConfirmation({
      text: assist.reply,
      createSynthesis: params.createSynthesis,
      createUtterance: params.createUtterance,
      signal: params.signal,
    });
    confirmationSpoken = true;
  }

  const turn = toVoiceOrderingTurn({
    voice,
    assist,
    confirmationSpoken,
  });
  assertVoiceOrderingTurnSafe(turn);
  return turn;
}
