/** Lightweight in-process counters for voice ordering diagnostics (no PII). */

export type VoiceOrderingTelemetryCounters = {
  restaurantResolutionFailures: number;
  menuItemGroundingFailures: number;
  clarificationLoopCount: number;
  planValidateSuccess: number;
  planValidateFail: number;
  confirmApplySuccess: number;
  confirmApplyFail: number;
  invalidConfirmAttempts: number;
  pendingRetained: number;
  pendingWiped: number;
};

const counters: VoiceOrderingTelemetryCounters = {
  restaurantResolutionFailures: 0,
  menuItemGroundingFailures: 0,
  clarificationLoopCount: 0,
  planValidateSuccess: 0,
  planValidateFail: 0,
  confirmApplySuccess: 0,
  confirmApplyFail: 0,
  invalidConfirmAttempts: 0,
  pendingRetained: 0,
  pendingWiped: 0,
};

export function recordVoiceTelemetry(
  key: keyof VoiceOrderingTelemetryCounters,
  delta = 1,
): void {
  counters[key] += delta;
  if (typeof console !== 'undefined' && typeof console.debug === 'function') {
    console.debug(`[voice-telemetry] ${key}=${counters[key]}`);
  }
}

export function getVoiceOrderingTelemetry(): Readonly<VoiceOrderingTelemetryCounters> {
  return { ...counters };
}

export function resetVoiceOrderingTelemetryForTests(): void {
  for (const key of Object.keys(counters) as (keyof VoiceOrderingTelemetryCounters)[]) {
    counters[key] = 0;
  }
}
