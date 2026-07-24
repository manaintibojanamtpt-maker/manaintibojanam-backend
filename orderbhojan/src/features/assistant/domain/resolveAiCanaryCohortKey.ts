/**
 * Deterministic canary cohort key for OrderBhojan → AI gateway.
 * Stable across sessions for a device; never includes PII plaintext.
 */

const COHORT_PREFIX = 'ob-cohort-';

/** FNV-1a 32-bit → 8 hex chars (sync, deterministic, browser + Node). */
export function fnv1aHex32(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function resolveAiCanaryCohortKey(params: {
  readonly deviceId: string;
  readonly userId?: string | null;
}): string {
  const deviceId = params.deviceId.trim();
  if (!deviceId) {
    return `${COHORT_PREFIX}anonymous`;
  }
  const userId = params.userId?.trim();
  const material = userId
    ? `ob-canary-v1|u:${userId}|d:${deviceId}`
    : `ob-canary-v1|d:${deviceId}`;
  return `${COHORT_PREFIX}${fnv1aHex32(material)}`;
}
