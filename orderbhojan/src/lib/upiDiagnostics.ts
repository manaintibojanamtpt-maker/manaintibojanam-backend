/**
 * Minimal, NON-SENSITIVE UPI payment diagnostics.
 *
 * PRIVACY CONTRACT — never log, directly or embedded:
 *   - raw UPI / deep-link URIs (upi://, intent://, tez://, …)
 *   - VPA (`pa`), merchant name (`pn`), order refs (`tr`/`tn`), amount (`am`), currency (`cu`)
 *   - bank information, phone numbers, or the full payment URL
 * Only the allow-listed structured fields in this module are emitted.
 */

export type UpiPlatform = 'android' | 'ios' | 'web';

export interface UpiCandidateSummary {
  readonly scheme: string;
  readonly package?: string;
  readonly candidateIndex: number;
}

export function getUpiPlatform(): UpiPlatform {
  if (typeof window === 'undefined') return 'web';
  const ua = window.navigator.userAgent;
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  return 'web';
}

/**
 * Safe candidate summary: only the transport scheme and the pinned Android package.
 * The query payload / fragment is never carried over from the deep-link URI.
 */
export function summarizeCandidate(uri: string, candidateIndex: number): UpiCandidateSummary {
  const scheme = /^([A-Za-z][A-Za-z0-9+.-]*):/.exec(uri.trim())?.[1]?.toLowerCase() ?? 'unknown';
  const packageMatch = /;package=([^;]+)/.exec(uri.trim());
  const pinnedPackage = packageMatch?.[1];
  return {
    scheme,
    candidateIndex,
    ...(pinnedPackage !== undefined ? { package: pinnedPackage } : {}),
  };
}

/** Truncates long identifiers (e.g. order ids) for logs. */
export function shortIdentifier(id: string | null | undefined): string | undefined {
  if (id == null) return undefined;
  const trimmed = id.trim();
  if (trimmed.length <= 12) return trimmed;
  return `${trimmed.slice(0, 12)}…`;
}

/** Maps a verification error to a small, safe category — never the raw message. */
export function upiErrorCategory(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (/abort|cancel|cancelled/i.test(message)) return 'cancelled';
  if (/network|fetch|offline|timeout|connection|retry/i.test(message)) return 'network';
  if (/expired|window/i.test(message)) return 'expired';
  return 'generic';
}

/** Emits a structured diagnostic event on the existing console channel (no new dependency). */
export function logUpiDiag(event: string, fields: Record<string, unknown>): void {
  const safe = JSON.stringify(fields);
  console.info(`[upi-diag ${event}]${safe === '{}' ? '' : ` ${safe}`}`);
}