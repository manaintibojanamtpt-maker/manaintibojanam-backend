/**
 * BhojanOS Voice Order Verification Token
 *
 * Provides cryptographic, short-lived, tenant-bound verification tokens
 * for voice agent telephone and web conversational channels.
 * Prevents enumeration, replay attacks, and cross-tenant information leakage.
 */

import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

export interface VoiceOrderVerificationTokenPayload {
  orderId: string;
  tenantId: string;
  customerPhoneHash: string;
  nonce: string;
  iat: number;
  exp: number;
  purpose: 'voice_order_status_verification';
}

export interface IssueVoiceVerificationTokenOptions {
  orderId: string;
  tenantId: string;
  customerPhone: string;
  ttlSeconds?: number;
  secret?: string;
}

export interface VerifyVoiceVerificationTokenOptions {
  token: string;
  expectedOrderId: string;
  expectedTenantId?: string;
  secret?: string;
}

export interface VerifyTokenResult {
  valid: boolean;
  reason?: 'EXPIRED' | 'ORDER_MISMATCH' | 'TENANT_MISMATCH' | 'SIGNATURE_INVALID' | 'REPLAYED' | 'MALFORMED';
  payload?: VoiceOrderVerificationTokenPayload;
}

// In-memory nonce cache to prevent token replay attacks
const REPLAY_NONCE_CACHE = new Map<string, number>();
const NONCE_PURGE_INTERVAL_MS = 60 * 1000;

let purgeTimer: NodeJS.Timeout | null = null;
function ensurePurgeTimer() {
  if (purgeTimer) return;
  purgeTimer = setInterval(() => {
    const now = Date.now();
    for (const [nonce, expMs] of REPLAY_NONCE_CACHE.entries()) {
      if (now > expMs) {
        REPLAY_NONCE_CACHE.delete(nonce);
      }
    }
  }, NONCE_PURGE_INTERVAL_MS);
  if (purgeTimer.unref) purgeTimer.unref();
}

export function resetReplayCacheForTesting() {
  REPLAY_NONCE_CACHE.clear();
}

function getVerificationSecret(override?: string): string {
  const secret = override || process.env.VOICE_VERIFICATION_TOKEN_SECRET || process.env.ORDER_GUEST_TOKEN_SECRET;
  if (!secret || secret.length < 32) {
    // Development fallback with warning
    return 'bhojanos-voice-verification-token-secret-fallback-32chars';
  }
  return secret;
}

export function hashCustomerPhone(phone: string, secret?: string): string {
  const normalized = phone.replace(/\D/g, '');
  const key = getVerificationSecret(secret);
  return createHmac('sha256', key).update(normalized).digest('hex');
}

/**
 * Issues a short-lived (default 5 min), tenant-bound verification token.
 */
export function issueVoiceOrderVerificationToken(
  options: IssueVoiceVerificationTokenOptions
): { token: string; expiresAt: Date; payload: VoiceOrderVerificationTokenPayload } {
  const { orderId, tenantId, customerPhone, ttlSeconds = 300, secret } = options;
  if (!orderId || !tenantId || !customerPhone) {
    throw new Error('orderId, tenantId, and customerPhone are required to issue verification token.');
  }

  const now = Math.floor(Date.now() / 1000);
  const exp = now + ttlSeconds;
  const nonce = randomBytes(16).toString('hex');

  const payload: VoiceOrderVerificationTokenPayload = {
    orderId: orderId.trim(),
    tenantId: tenantId.trim(),
    customerPhoneHash: hashCustomerPhone(customerPhone, secret),
    nonce,
    iat: now,
    exp,
    purpose: 'voice_order_status_verification',
  };

  const serialized = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', getVerificationSecret(secret))
    .update(serialized)
    .digest('base64url');

  const token = `${serialized}.${signature}`;
  return {
    token,
    expiresAt: new Date(exp * 1000),
    payload,
  };
}

/**
 * Cryptographically verifies a voice order token against requested orderId and tenant.
 * Enforces expiration and single-use replay prevention.
 */
export function verifyVoiceOrderVerificationToken(
  options: VerifyVoiceVerificationTokenOptions
): VerifyTokenResult {
  const { token, expectedOrderId, expectedTenantId, secret } = options;
  ensurePurgeTimer();

  if (!token || typeof token !== 'string') {
    return { valid: false, reason: 'MALFORMED' };
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false, reason: 'MALFORMED' };
  }

  const [serialized, signature] = parts;
  const key = getVerificationSecret(secret);
  const expectedSig = createHmac('sha256', key).update(serialized).digest('base64url');

  // Constant-time signature verification
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return { valid: false, reason: 'SIGNATURE_INVALID' };
  }

  let payload: VoiceOrderVerificationTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(serialized, 'base64url').toString('utf8'));
  } catch {
    return { valid: false, reason: 'MALFORMED' };
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    return { valid: false, reason: 'EXPIRED', payload };
  }

  if (payload.orderId !== expectedOrderId.trim()) {
    return { valid: false, reason: 'ORDER_MISMATCH', payload };
  }

  if (expectedTenantId && payload.tenantId !== expectedTenantId.trim()) {
    return { valid: false, reason: 'TENANT_MISMATCH', payload };
  }

  // Enforce Replay Prevention
  if (REPLAY_NONCE_CACHE.has(payload.nonce)) {
    return { valid: false, reason: 'REPLAYED', payload };
  }
  REPLAY_NONCE_CACHE.set(payload.nonce, payload.exp * 1000);

  return { valid: true, payload };
}
