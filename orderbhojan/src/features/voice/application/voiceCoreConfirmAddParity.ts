/**
 * Phase 1.3b parity gates — decide when live confirm/add may use voice-core.
 * OB decideVoiceCartTurn remains the router; this only gates the executor.
 */
import type { CartPlanValidationResult } from '@/features/assistant/domain/cartPlanContract';

export type VoiceCoreConfirmParityResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string };

/**
 * Dual-run guard before voice-core confirm apply.
 * Never returns ok when pending plans disagree (prevents double-apply drift).
 */
export function canUseVoiceCoreConfirmApply(input: {
  readonly liveFlagEnabled: boolean;
  readonly adapterReady: boolean;
  readonly earlyRouteKind: string;
  readonly pending: CartPlanValidationResult | null | undefined;
  readonly adapterPending: CartPlanValidationResult | null | undefined;
}): VoiceCoreConfirmParityResult {
  if (!input.liveFlagEnabled) return { ok: false, reason: 'flag_off' };
  if (!input.adapterReady) return { ok: false, reason: 'adapter_not_ready' };
  if (input.earlyRouteKind !== 'apply_validated_confirm') {
    return { ok: false, reason: 'not_confirm_route' };
  }
  const pending = input.pending;
  const adapterPending = input.adapterPending;
  if (!pending || !adapterPending) return { ok: false, reason: 'missing_pending' };
  if (pending.status !== 'validated' || pending.valid !== true) {
    return { ok: false, reason: 'pending_not_validated' };
  }
  if (adapterPending.status !== 'validated' || adapterPending.valid !== true) {
    return { ok: false, reason: 'adapter_pending_not_validated' };
  }
  if (pending.conversationId !== adapterPending.conversationId) {
    return { ok: false, reason: 'parity_conversation_mismatch' };
  }
  return { ok: true };
}

export function canUseVoiceCoreCartAdd(input: {
  readonly liveFlagEnabled: boolean;
  readonly adapterReady: boolean;
}): VoiceCoreConfirmParityResult {
  if (!input.liveFlagEnabled) return { ok: false, reason: 'flag_off' };
  if (!input.adapterReady) return { ok: false, reason: 'adapter_not_ready' };
  return { ok: true };
}
