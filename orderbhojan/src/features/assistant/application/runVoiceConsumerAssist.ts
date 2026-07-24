import type { AssistantApiClient } from '../infrastructure/assistantApiClient';
import {
  captureVoiceTranscript,
  type SpeechRecognitionFactory,
} from '../infrastructure/voiceSpeechCapture';
import { resolveConsumerAssistChannel } from '../domain/resolveConsumerAssistChannel';
import {
  AssistantApiError,
  type ConsumerAssistResult,
  type VoiceTranscriptResult,
} from '../types';
import { runConsumerAssist } from './runConsumerAssist';

export interface RunVoiceConsumerAssistParams {
  /** FF_OB_AI_ASSISTANT */
  readonly assistantEnabled: boolean;
  /** FF_OB_AI_VOICE */
  readonly voiceEnabled: boolean;
  readonly client: Pick<AssistantApiClient, 'consumerAssist'>;
  readonly getIdToken: () => Promise<string | null>;
  readonly conversationId?: string;
  readonly signal?: AbortSignal;
  readonly createRecognition?: SpeechRecognitionFactory;
  readonly isNative?: () => boolean;
}

export interface VoiceConsumerAssistResult {
  readonly voice: VoiceTranscriptResult;
  readonly assist: ConsumerAssistResult;
}

/**
 * Phase 5: capture speech → shared consumer assist gateway.
 * No cart/checkout side effects. Flags OFF ⇒ no mic / no network.
 */
export async function runVoiceConsumerAssist(
  params: RunVoiceConsumerAssistParams,
): Promise<VoiceConsumerAssistResult> {
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

  const channel = resolveConsumerAssistChannel(params.isNative);
  const voice = await captureVoiceTranscript({
    createRecognition: params.createRecognition,
    signal: params.signal,
    platform: channel === 'orderbhojan_android' ? 'android' : 'web',
  });

  const assist = await runConsumerAssist({
    enabled: true,
    client: params.client,
    getIdToken: params.getIdToken,
    request: {
      message: voice.transcript,
      conversationId: params.conversationId,
      signal: params.signal,
    },
  });

  return { voice, assist };
}
