/**
 * Phase 1.3 canary prep — dual-run / mismatch telemetry (no PII).
 * Counts voice-core vs OB executor outcomes without removing the OB path.
 */
import { recordVoiceTelemetry } from '@/features/assistant/domain/voiceOrderingTelemetry';
import { emitVoiceTelemetry } from '@bhojan/voice-core';

export type VoiceCoreDualRunPath = 'confirm' | 'add';

export type VoiceCoreDualRunOutcome =
  | 'attempt'
  | 'voice_core_success'
  | 'fallback_ob'
  | 'parity_blocked'
  | 'parity_mismatch';

const COUNTER_KEY: Record<
  VoiceCoreDualRunPath,
  Record<VoiceCoreDualRunOutcome, Parameters<typeof recordVoiceTelemetry>[0]>
> = {
  confirm: {
    attempt: 'voiceCoreConfirmAttempt',
    voice_core_success: 'voiceCoreConfirmSuccess',
    fallback_ob: 'voiceCoreConfirmFallbackOb',
    parity_blocked: 'voiceCoreConfirmParityBlocked',
    parity_mismatch: 'voiceCoreParityMismatch',
  },
  add: {
    attempt: 'voiceCoreAddAttempt',
    voice_core_success: 'voiceCoreAddSuccess',
    fallback_ob: 'voiceCoreAddFallbackOb',
    parity_blocked: 'voiceCoreAddParityBlocked',
    parity_mismatch: 'voiceCoreParityMismatch',
  },
};

export function recordVoiceCoreDualRun(event: {
  readonly path: VoiceCoreDualRunPath;
  readonly outcome: VoiceCoreDualRunOutcome;
  /** Machine reason only — never user text / emails / dish free-text. */
  readonly reason?: string;
  readonly sessionId?: string;
}): void {
  const key = COUNTER_KEY[event.path][event.outcome];
  recordVoiceTelemetry(key);

  if (typeof console !== 'undefined' && typeof console.debug === 'function') {
    console.debug(
      `[voice-core-dual-run] path=${event.path} outcome=${event.outcome}` +
        (event.reason ? ` reason=${event.reason}` : ''),
    );
  }

  if (event.sessionId) {
    emitVoiceTelemetry({
      type: 'tool_called',
      sessionId: event.sessionId,
      tool: `dual_run_${event.path}`,
      callId: `dr_${event.path}_${event.outcome}`,
      ok:
        event.outcome === 'voice_core_success' ||
        event.outcome === 'attempt' ||
        event.outcome === 'parity_blocked',
      ...(event.reason ? { code: event.reason } : {}),
    });
  }
}
