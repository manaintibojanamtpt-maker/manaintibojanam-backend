import type { ConsumerAssistResult, VoiceTranscriptResult } from '../types';

/** Narrow Phase 6 voice-ordering turn result — plans remain non-executable. */
export interface VoiceOrderingTurnResult {
  readonly schemaVersion: '6.0';
  readonly transcript: string;
  readonly intent: string;
  readonly reply: string;
  readonly channel: ConsumerAssistResult['channel'];
  readonly conversationId: string;
  readonly safetyBlocked: boolean;
  readonly needsClarification: boolean;
  readonly confirmationSpoken: boolean;
  readonly voice: VoiceTranscriptResult;
  readonly assist: ConsumerAssistResult;
  readonly sideEffects: [];
  readonly mutatedState: false;
}

const CLARIFICATION_INTENTS = new Set(['out_of_scope', 'general_help']);

/**
 * Map assist output into a voice-ordering turn.
 * Does not execute suggestedHints or cart plans.
 */
export function toVoiceOrderingTurn(params: {
  readonly voice: VoiceTranscriptResult;
  readonly assist: ConsumerAssistResult;
  readonly confirmationSpoken: boolean;
}): VoiceOrderingTurnResult {
  const { voice, assist, confirmationSpoken } = params;
  const needsClarification =
    assist.safetyBlocked ||
    CLARIFICATION_INTENTS.has(assist.intent) ||
    / wh(ich|at)|clarify|did you mean|please (specify|choose)/i.test(assist.reply);

  return {
    schemaVersion: '6.0',
    transcript: voice.transcript,
    intent: assist.intent,
    reply: assist.reply,
    channel: assist.channel,
    conversationId: assist.conversationId,
    safetyBlocked: assist.safetyBlocked,
    needsClarification,
    confirmationSpoken,
    voice,
    assist,
    sideEffects: [],
    mutatedState: false,
  };
}

export function assertVoiceOrderingTurnSafe(result: VoiceOrderingTurnResult): void {
  if (result.sideEffects.length !== 0 || result.mutatedState !== false) {
    throw new Error('Voice ordering turn must not mutate state');
  }
  if (result.assist.sideEffects.length !== 0 || result.assist.mutatedState !== false) {
    throw new Error('Voice ordering assist payload must not mutate state');
  }
}
