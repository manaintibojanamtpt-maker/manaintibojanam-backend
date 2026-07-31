/**
 * Progressive rollout for live voice-core confirm/add.
 *
 * Kill switch: FF_OB_AI_VOICE_CORE_CONFIRM_ADD (must be true).
 * Cohort:
 *   - internal email allowlist (smallest cohort), and/or
 *   - sticky percentage bucket 0–100 from VITE_OB_VOICE_CORE_CONFIRM_ADD_PCT
 *
 * Instant rollback: set FF_OB_AI_VOICE_CORE_CONFIRM_ADD=false (or pct=0 and empty allowlist).
 * OB executor must remain present while pct < 100 and until parity is proven.
 */
import { isFeatureEnabled, loadFeatureFlags } from '@/featureFlags/flags';
import { useAuthSessionStore } from '@/features/auth/store/authSessionStore';
import { fnv1aHex32, resolveAiCanaryCohortKey } from '@/features/assistant/domain/resolveAiCanaryCohortKey';

const FORCE_STORAGE_KEY = 'ob_voice_core_confirm_add_force';

export type VoiceCoreConfirmAddRolloutDecision = {
  readonly enabled: boolean;
  readonly reason:
    | 'kill_switch_off'
    | 'force_include'
    | 'internal_email'
    | 'percent_bucket'
    | 'not_in_cohort';
  readonly percent: number;
  readonly bucket: number | null;
};

function readRolloutPercent(): number {
  const raw = String(import.meta.env?.VITE_OB_VOICE_CORE_CONFIRM_ADD_PCT ?? '0').trim();
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.floor(n)));
}

function readInternalEmails(): readonly string[] {
  const raw = String(import.meta.env?.VITE_OB_VOICE_CORE_CONFIRM_ADD_INTERNAL_EMAILS ?? '').trim();
  if (!raw) return [];
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

function readForceInclude(): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    return localStorage.getItem(FORCE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function stickyBucket0to99(cohortKey: string): number {
  const hex = fnv1aHex32(`voice-core-confirm-add|${cohortKey}`);
  return Number.parseInt(hex.slice(0, 8), 16) % 100;
}

export function evaluateVoiceCoreConfirmAddRollout(input: {
  readonly masterEnabled: boolean;
  readonly percent: number;
  readonly internalEmails: readonly string[];
  readonly userEmail?: string | null;
  readonly cohortKey: string;
  readonly forceInclude?: boolean;
}): VoiceCoreConfirmAddRolloutDecision {
  if (!input.masterEnabled) {
    return { enabled: false, reason: 'kill_switch_off', percent: input.percent, bucket: null };
  }
  if (input.forceInclude) {
    return { enabled: true, reason: 'force_include', percent: input.percent, bucket: null };
  }
  const email = input.userEmail?.trim().toLowerCase() ?? '';
  if (email && input.internalEmails.includes(email)) {
    return { enabled: true, reason: 'internal_email', percent: input.percent, bucket: null };
  }
  const percent = Math.max(0, Math.min(100, Math.floor(input.percent)));
  if (percent <= 0) {
    return { enabled: false, reason: 'not_in_cohort', percent, bucket: null };
  }
  if (percent >= 100) {
    return { enabled: true, reason: 'percent_bucket', percent, bucket: 0 };
  }
  const bucket = stickyBucket0to99(input.cohortKey);
  if (bucket < percent) {
    return { enabled: true, reason: 'percent_bucket', percent, bucket };
  }
  return { enabled: false, reason: 'not_in_cohort', percent, bucket };
}

/** Read env + device cohort and decide if this client uses voice-core confirm/add. */
export function isVoiceCoreConfirmAddEnabledForClient(input?: {
  readonly userEmail?: string | null;
  readonly userId?: string | null;
}): boolean {
  return getVoiceCoreConfirmAddRolloutDecision(input).enabled;
}

export function getVoiceCoreConfirmAddRolloutDecision(input?: {
  readonly userEmail?: string | null;
  readonly userId?: string | null;
}): VoiceCoreConfirmAddRolloutDecision {
  const flags = loadFeatureFlags();
  const masterEnabled = isFeatureEnabled(flags, 'FF_OB_AI_VOICE_CORE_CONFIRM_ADD');
  const deviceId = useAuthSessionStore.getState().ensureDeviceId();
  const cohortKey = resolveAiCanaryCohortKey({
    deviceId,
    userId: input?.userId,
  });
  return evaluateVoiceCoreConfirmAddRollout({
    masterEnabled,
    percent: readRolloutPercent(),
    internalEmails: readInternalEmails(),
    userEmail: input?.userEmail,
    cohortKey,
    forceInclude: readForceInclude(),
  });
}
