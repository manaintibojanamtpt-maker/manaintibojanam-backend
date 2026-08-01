/**
 * Progressive rollout for native order tracking (Phase 1).
 *
 * Dispatch rule:
 *   FF_NATIVE_HOST && FF_NATIVE_TRACK && inCohort → NativeTrack
 *   else → HybridWebView("/orders/{orderId}/track")
 *
 * Instant rollback: FF_NATIVE_HOST=false or FF_NATIVE_TRACK=false.
 */
import { isFeatureEnabled, loadFeatureFlags } from '@/featureFlags/flags';
import { useAuthSessionStore } from '@/features/auth/store/authSessionStore';
import { fnv1aHex32, resolveAiCanaryCohortKey } from '@/features/assistant/domain/resolveAiCanaryCohortKey';

const FORCE_STORAGE_KEY = 'ob_native_track_force';

export type NativeTrackRolloutDecision = {
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
  const raw = String(import.meta.env?.VITE_OB_NATIVE_TRACK_PCT ?? '0').trim();
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.floor(n)));
}

function readInternalEmails(): readonly string[] {
  const raw = String(import.meta.env?.VITE_OB_NATIVE_TRACK_INTERNAL_EMAILS ?? '').trim();
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

export function stickyNativeTrackBucket0to99(cohortKey: string): number {
  const hex = fnv1aHex32(`native-track|${cohortKey}`);
  return Number.parseInt(hex.slice(0, 8), 16) % 100;
}

export function evaluateNativeTrackRollout(input: {
  readonly hostEnabled: boolean;
  readonly trackEnabled: boolean;
  readonly percent: number;
  readonly internalEmails: readonly string[];
  readonly userEmail?: string | null;
  readonly cohortKey: string;
  readonly forceInclude?: boolean;
}): NativeTrackRolloutDecision {
  if (!input.hostEnabled || !input.trackEnabled) {
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
  const bucket = stickyNativeTrackBucket0to99(input.cohortKey);
  if (bucket < percent) {
    return { enabled: true, reason: 'percent_bucket', percent, bucket };
  }
  return { enabled: false, reason: 'not_in_cohort', percent, bucket };
}

export function getNativeTrackRolloutDecision(input?: {
  readonly userEmail?: string | null;
  readonly userId?: string | null;
}): NativeTrackRolloutDecision {
  const flags = loadFeatureFlags();
  const deviceId = useAuthSessionStore.getState().ensureDeviceId();
  const cohortKey = resolveAiCanaryCohortKey({
    deviceId,
    userId: input?.userId,
  });
  return evaluateNativeTrackRollout({
    hostEnabled: isFeatureEnabled(flags, 'FF_NATIVE_HOST'),
    trackEnabled: isFeatureEnabled(flags, 'FF_NATIVE_TRACK'),
    percent: readRolloutPercent(),
    internalEmails: readInternalEmails(),
    userEmail: input?.userEmail,
    cohortKey,
    forceInclude: readForceInclude(),
  });
}

export function isNativeTrackEnabledForClient(input?: {
  readonly userEmail?: string | null;
  readonly userId?: string | null;
}): boolean {
  return getNativeTrackRolloutDecision(input).enabled;
}

/** Parse `/orders/:orderId/track` (+ optional query / custom scheme) → orderId. */
export function parseTrackOrderIdFromPath(path: string): string | null {
  try {
    if (path.startsWith('/')) {
      const url = new URL(path, 'https://orderbhojan.local');
      const match = url.pathname.match(/^\/orders\/([^/]+)\/track\/?$/);
      return match?.[1] ? decodeURIComponent(match[1]) : null;
    }
    const url = new URL(path);
    // orderbhojan://app/orders/:id/track → host=app, pathname=/orders/:id/track
    // orderbhojan://orders/:id/track → host=orders, pathname=/:id/track
    let pathname = url.pathname || '';
    if (url.protocol === 'orderbhojan:' && url.host && url.host !== 'app') {
      pathname = `/${url.host}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
    }
    const match = pathname.match(/^\/orders\/([^/]+)\/track\/?$/);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}
