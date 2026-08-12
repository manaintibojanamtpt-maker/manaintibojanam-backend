import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getVoiceOrderingTelemetry,
  resetVoiceOrderingTelemetryForTests,
} from '../src/features/assistant/domain/voiceOrderingTelemetry.ts';
import { recordVoiceCoreDualRun } from '../src/features/voice/application/voiceCoreDualRunTelemetry.ts';

describe('Phase 1.3 canary dual-run telemetry', () => {
  it('increments confirm/add dual-run counters without PII fields', () => {
    resetVoiceOrderingTelemetryForTests();
    recordVoiceCoreDualRun({ path: 'confirm', outcome: 'attempt' });
    recordVoiceCoreDualRun({
      path: 'confirm',
      outcome: 'parity_mismatch',
      reason: 'parity_conversation_mismatch',
    });
    recordVoiceCoreDualRun({ path: 'add', outcome: 'fallback_ob', reason: 'NEEDS_KITCHEN' });
    recordVoiceCoreDualRun({ path: 'add', outcome: 'voice_core_success' });

    const t = getVoiceOrderingTelemetry();
    assert.equal(t.voiceCoreConfirmAttempt, 1);
    assert.equal(t.voiceCoreParityMismatch, 1);
    assert.equal(t.voiceCoreAddFallbackOb, 1);
    assert.equal(t.voiceCoreAddSuccess, 1);
  });
});
