import { getMarketplaceApiClient } from '@/marketplace-api';
import { getAppConfig } from '@/config';
import { openExternalUrl } from '@/lib/nativePlatform';

const VERIFIED_PAYMENT_STATUSES = new Set(['success', 'verified', 'paid']);
const TERMINAL_FAILURE_STATUSES = new Set(['expired', 'failed']);

export type UpiAppId = 'gpay' | 'phonepe' | 'paytm' | 'other';

export interface UpiAppChoice {
  readonly id: UpiAppId;
  readonly label: string;
  readonly shortLabel: string;
}

export const UPI_APP_CHOICES: readonly UpiAppChoice[] = [
  { id: 'gpay', label: 'Google Pay', shortLabel: 'GPay' },
  { id: 'phonepe', label: 'PhonePe', shortLabel: 'PhonePe' },
  { id: 'paytm', label: 'Paytm', shortLabel: 'Paytm' },
  { id: 'other', label: 'Other UPI app', shortLabel: 'Other UPI' },
] as const;

const UPI_QUERY_PARAM_ORDER = ['pa', 'pn', 'am', 'tr', 'tn', 'cu', 'mc', 'tid', 'url'] as const;

export type UpiLaunchOutcome = 'opened' | 'fallback_required' | 'failed';

export interface UpiLaunchContext {
  readonly amount: number;
  readonly orderId: string;
  readonly orderNumber?: string;
}

export interface UpiLaunchResult {
  readonly outcome: UpiLaunchOutcome;
  readonly deepLinkTried?: string;
  readonly message?: string;
}

export function formatUpiAmount(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  return safe.toFixed(2);
}

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /android|iphone|ipad|ipod|mobile/i.test(window.navigator.userAgent);
}

export function isAndroidDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /android/i.test(window.navigator.userAgent);
}

export function isIosDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export function isVerifiedPaymentStatus(status: string | undefined): boolean {
  return VERIFIED_PAYMENT_STATUSES.has(String(status ?? 'pending').toLowerCase().trim());
}

export function isTerminalPaymentFailure(status: string | undefined): boolean {
  return TERMINAL_FAILURE_STATUSES.has(String(status ?? '').toLowerCase().trim());
}

export function parseUpiPayUrl(upiUrl: string): Record<string, string> | null {
  const trimmed = upiUrl.trim();
  if (!trimmed.startsWith('upi://pay')) return null;

  try {
    const parsed = new URL(trimmed.replace(/^upi:\/\//, 'https://upi.local/'));
    const params: Record<string, string> = {};
    parsed.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return Object.keys(params).length > 0 ? params : null;
  } catch {
    return null;
  }
}

export function buildUpiQueryString(params: Record<string, string>): string {
  const seen = new Set<string>();
  const keys: string[] = [];

  for (const key of UPI_QUERY_PARAM_ORDER) {
    if (params[key] != null && params[key] !== '') {
      keys.push(key);
      seen.add(key);
    }
  }

  for (const key of Object.keys(params)) {
    if (!seen.has(key) && params[key] != null && params[key] !== '') {
      keys.push(key);
    }
  }

  return keys
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key]!)}`)
    .join('&');
}

export function buildAndroidUpiIntent(
  params: Record<string, string>,
  options?: { readonly packageName?: string; readonly fallbackUrl?: string },
): string {
  const query = buildUpiQueryString(params);
  const parts = [`intent://pay?${query}#Intent`, 'scheme=upi', 'action=android.intent.action.VIEW'];
  if (options?.packageName) {
    parts.push(`package=${options.packageName}`);
  }
  if (options?.fallbackUrl) {
    parts.push(`S.browser_fallback_url=${encodeURIComponent(options.fallbackUrl)}`);
  }
  parts.push('end');
  return parts.join(';');
}

/**
 * Candidate deep links for an app. First entry is preferred; callers may try fallbacks.
 */
export function buildUpiAppDeepLinkCandidates(
  appId: UpiAppId,
  upiUrl: string,
  context?: UpiLaunchContext,
): string[] {
  const params = parseUpiPayUrl(upiUrl);
  if (!params) return [];

  // Mandatory fields
  if (!params.pa || !params.pn) return [];

  if (context) {
    params.am = formatUpiAmount(context.amount);
    params.tr = context.orderId;
    if (context.orderNumber && !params.tn) {
      params.tn = `Order ${context.orderNumber}`;
    }
  } else if (params.am) {
    params.am = formatUpiAmount(Number(params.am));
  }

  params.cu = 'INR';

  const query = buildUpiQueryString(params);
  const canonical = `upi://pay?${query}`;

  switch (appId) {
    case 'gpay':
      return [
        `tez://upi/pay?${query}`,
        `gpay://upi/pay?${query}`,
        isAndroidDevice()
          ? buildAndroidUpiIntent(params, { packageName: 'com.google.android.apps.nbu.paisa.user' })
          : canonical,
      ].filter(Boolean);
    case 'phonepe':
      return [
        `phonepe://pay?${query}`,
        `phonepe://upi/pay?${query}`,
        isAndroidDevice()
          ? buildAndroidUpiIntent(params, { packageName: 'com.phonepe.app' })
          : canonical,
      ];
    case 'paytm':
      return [
        `paytmmp://pay?${query}`,
        isAndroidDevice()
          ? buildAndroidUpiIntent(params, { packageName: 'net.one97.paytm' })
          : canonical,
      ];
    case 'other':
      return isAndroidDevice()
        ? [buildAndroidUpiIntent(params, { fallbackUrl: canonical }), canonical]
        : [canonical];
    default:
      return [];
  }
}

/**
 * Builds an app-specific UPI deep link from a standard `upi://pay` URL.
 * iOS Safari cannot enumerate installed UPI apps, so each PSP needs its own scheme.
 */
export function buildUpiAppDeepLink(
  appId: UpiAppId,
  upiUrl: string,
  context?: UpiLaunchContext,
): string | null {
  return buildUpiAppDeepLinkCandidates(appId, upiUrl, context)[0] ?? null;
}

export function extractUpiPayeeAddress(upiUrl: string): string | undefined {
  const params = parseUpiPayUrl(upiUrl);
  const pa = params?.pa?.trim();
  return pa || undefined;
}

export function buildUpiCopyText(params: {
  readonly upiUrl: string;
  readonly amount: number;
  readonly orderNumber: string;
}): string {
  const payee = extractUpiPayeeAddress(params.upiUrl) ?? 'merchant UPI ID';
  return [
    `Pay ${formatUpiAmount(params.amount)} INR to ${payee}`,
    `Order #${params.orderNumber}`,
    `UPI ID: ${payee}`,
  ].join('\n');
}

/**
 * Opens a deep link via transient anchor click. Avoids `window.location.href`, which
 * some in-app browsers (including WhatsApp) intercept for generic `upi://` URLs.
 */
export function launchUpiDeepLink(deepLink: string): void {
  if (typeof window === 'undefined' || !deepLink.trim()) {
    return;
  }

  void openExternalUrl(deepLink);
}

/** @deprecated Prefer `launchUpiApp('other', upiUrl)` or the app picker UI. */
export function launchUpiIntent(upiUrl: string): void {
  if (!upiUrl.startsWith('upi://')) return;
  launchUpiDeepLink(upiUrl);
}

/**
 * Attempts to open a UPI app. Returns whether a deep link was attempted.
 * Callers must treat silent OS failures via visibility timeout → QR/copy fallback.
 */
export function launchUpiApp(
  appId: UpiAppId,
  upiUrl: string,
  context?: UpiLaunchContext,
): boolean {
  const candidates = buildUpiAppDeepLinkCandidates(appId, upiUrl, context);
  if (candidates.length === 0) return false;
  launchUpiDeepLink(candidates[0]!);
  return true;
}

/**
 * Launch with platform-aware fallback guidance.
 * - iOS "other": never fire a blind scheme — force QR/copy
 * - iOS named apps: try scheme once, then recommend QR if user returns quickly
 * - Android: try primary candidate (intent/package when available)
 */
export async function launchUpiAppWithFallback(
  appId: UpiAppId,
  upiUrl: string,
  context: UpiLaunchContext,
): Promise<UpiLaunchResult> {
  const params = parseUpiPayUrl(upiUrl);
  if (!params) {
    return { outcome: 'failed', message: 'Invalid UPI payment link. Use copy details or QR.' };
  }

  if (!params.pa || !params.pn) {
    return {
      outcome: 'fallback_required',
      message: 'Merchant UPI details incomplete. Please use the QR code or copy details to pay.',
    };
  }

  if (isIosDevice() && appId === 'other') {
    return {
      outcome: 'fallback_required',
      message: 'On iPhone, scan the QR below or copy payment details into your UPI app.',
    };
  }

  const candidates = buildUpiAppDeepLinkCandidates(appId, upiUrl, context);
  if (candidates.length === 0) {
    return { outcome: 'failed', message: 'Unable to build a UPI link for that app.' };
  }

  const primary = candidates[0]!;
  const opened = await openExternalUrl(primary);
  if (!opened) {
    return {
      outcome: 'fallback_required',
      deepLinkTried: primary,
      message: 'Could not open that UPI app. Scan the QR or copy payment details.',
    };
  }

  // OS cannot confirm the app actually handled the URL. Prefer QR on iOS after attempt.
  if (isIosDevice()) {
    return {
      outcome: 'opened',
      deepLinkTried: primary,
      message:
        'If the UPI app did not open, scan the QR or copy payment details into GPay / PhonePe / Paytm.',
    };
  }

  return { outcome: 'opened', deepLinkTried: primary };
}

/** Watch for quick return from a failed app handoff (user stayed in foreground / bounced back). */
export function watchUpiHandoffReturn(params: {
  readonly onLikelyFailed: () => void;
  readonly timeoutMs?: number;
}): () => void {
  if (typeof document === 'undefined') return () => undefined;

  const timeoutMs = params.timeoutMs ?? 1_600;
  let settled = false;
  const startedAt = Date.now();

  const finishFailed = () => {
    if (settled) return;
    settled = true;
    cleanup();
    params.onLikelyFailed();
  };

  const onVisibility = () => {
    if (document.visibilityState !== 'visible') return;
    // Returned within a short window → handoff likely failed or user cancelled immediately.
    if (Date.now() - startedAt < 8_000) {
      finishFailed();
    }
  };

  const timer = window.setTimeout(() => {
    // Still visible after timeout → scheme likely did nothing (common on iOS Safari).
    if (document.visibilityState === 'visible') {
      finishFailed();
    }
  }, timeoutMs);

  const cleanup = () => {
    window.clearTimeout(timer);
    document.removeEventListener('visibilitychange', onVisibility);
  };

  document.addEventListener('visibilitychange', onVisibility);
  return cleanup;
}

export interface OrderPaymentSnapshot {
  readonly paymentStatus: string;
  readonly orderStatus: string;
  readonly expiresAt?: string;
}

export async function fetchOrderPaymentSnapshot(params: {
  readonly orderId: string;
  readonly phone: string;
  readonly isAuthenticated: boolean;
}): Promise<OrderPaymentSnapshot> {
  const client = getMarketplaceApiClient();

  if (params.isAuthenticated) {
    const summary = await client.getOrder(params.orderId);
    return {
      paymentStatus: String(summary.paymentStatus ?? 'pending'),
      orderStatus: String(summary.status ?? 'PENDING_PAYMENT'),
      expiresAt: summary.expiresAt,
    };
  }

  const tracking = await client.getGuestTracking(params.orderId, params.phone);
  return {
    paymentStatus: String(tracking.paymentStatus ?? tracking.invoice?.paymentStatus ?? 'pending'),
    orderStatus: String(tracking.status ?? 'PENDING_PAYMENT'),
    expiresAt: tracking.expiresAt,
  };
}

export type UpiPollResult = 'verified' | 'expired' | 'timeout';

export async function pollUpiPaymentStatus(params: {
  readonly orderId: string;
  readonly phone: string;
  readonly isAuthenticated: boolean;
  readonly signal?: AbortSignal;
  readonly onTick?: (snapshot: OrderPaymentSnapshot) => void;
  readonly intervalMs?: number;
  readonly maxAttempts?: number;
}): Promise<UpiPollResult> {
  const intervalMs = params.intervalMs ?? 5_000;
  const maxAttempts = params.maxAttempts ?? 72;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (params.signal?.aborted) {
      throw new Error('Payment verification cancelled');
    }

    const snapshot = await fetchOrderPaymentSnapshot(params);
    params.onTick?.(snapshot);

    if (isVerifiedPaymentStatus(snapshot.paymentStatus)) {
      return 'verified';
    }

    const orderStatus = snapshot.orderStatus.toUpperCase();
    if (isTerminalPaymentFailure(snapshot.paymentStatus) || orderStatus === 'EXPIRED') {
      return 'expired';
    }

    if (snapshot.expiresAt) {
      const expiresMs = Date.parse(snapshot.expiresAt);
      if (Number.isFinite(expiresMs) && Date.now() > expiresMs) {
        return 'expired';
      }
    }

    if (attempt < maxAttempts - 1) {
      await sleep(intervalMs, params.signal);
    }
  }

  return 'timeout';
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      window.clearTimeout(timer);
      reject(new Error('Payment verification cancelled'));
    };

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export function buildUpiQrImageUrl(upiUrl: string, size = 220): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(upiUrl)}`;
}

export async function claimCustomerUpiPayment(params: {
  readonly orderId: string;
  readonly phone: string;
  readonly upiReference?: string;
}): Promise<void> {
  const baseUrl = getAppConfig().marketplaceApiBaseUrl.replace(/\/$/, '');
  const response = await fetch(
    `${baseUrl}/api/marketplace/orders/${encodeURIComponent(params.orderId)}/payment-claim`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: params.phone,
        upiReference: params.upiReference?.trim() || undefined,
      }),
    },
  );

  const payload = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: { message?: string } | string;
    value?: { recorded?: boolean };
  };

  const errorMessage =
    typeof payload.error === 'string'
      ? payload.error
      : payload.error?.message;

  if (!response.ok || payload.ok !== true || payload.value?.recorded !== true) {
    throw new Error(errorMessage || 'Unable to notify kitchen');
  }
}
