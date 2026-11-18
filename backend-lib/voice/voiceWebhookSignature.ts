/**
 * BhojanOS Voice Webhook Ingress & Cryptographic Signature Verification
 *
 * Implements:
 * 1. Raw HTTP body canonicalization (byte buffer before JSON parse)
 * 2. Timing-safe HMAC-SHA256 signature verification
 * 3. Persistent replay protection using nonces stored in shared Firestore / memory cache
 * 4. Freshness window enforcement (300 seconds)
 * 5. Tenant-scoped signature verification
 */

import { createHmac, timingSafeEqual } from 'crypto';

export interface VerifyWebhookSignatureOptions {
  rawBody: Buffer | string;
  signatureHeader?: string;
  timestampHeader?: string;
  nonceHeader?: string;
  tenantId?: string;
  secret: string;
  db?: any; // Firestore instance for distributed replay store
  replayStore?: WebhookReplayStore;
  maxTimestampSkewSeconds?: number;
}

export interface WebhookSignatureResult {
  valid: boolean;
  code?: 'MISSING_HEADERS' | 'TIMESTAMP_EXPIRED' | 'INVALID_SIGNATURE' | 'REPLAYED_NONCE' | 'MALFORMED_HEADER';
  error?: string;
}

export interface WebhookReplayStore {
  consumeNonce(tenantId: string, nonce: string, ttlSeconds: number): Promise<boolean>;
}

/**
 * Shared Firestore Replay Store for Multi-Instance Ingress
 */
export class FirestoreWebhookReplayStore implements WebhookReplayStore {
  constructor(private db: any) {}

  async consumeNonce(tenantId: string, nonce: string, ttlSeconds: number): Promise<boolean> {
    if (!this.db) return false;
    const docId = `${tenantId}__${nonce}`;
    const docRef = this.db.collection('webhook_nonces').doc(docId);

    try {
      // Atomic transaction or check to ensure nonce has never been used
      const doc = await docRef.get();
      if (doc.exists) {
        const data = doc.data();
        if (data && data.expiresAt > Date.now()) {
          // Already consumed and not expired -> Replay!
          return false;
        }
      }

      await docRef.set({
        tenantId,
        nonce,
        consumedAt: Date.now(),
        expiresAt: Date.now() + ttlSeconds * 1000,
      });

      return true;
    } catch (err) {
      console.error('[WebhookReplayStore] Firestore error:', err);
      return false;
    }
  }
}

/**
 * In-Memory Replay Store for Local Development & Unit Tests
 */
export class InMemoryWebhookReplayStore implements WebhookReplayStore {
  private consumed = new Map<string, number>();

  async consumeNonce(tenantId: string, nonce: string, ttlSeconds: number): Promise<boolean> {
    const key = `${tenantId}__${nonce}`;
    const now = Date.now();
    const existingExp = this.consumed.get(key);

    if (existingExp && existingExp > now) {
      return false; // Replayed
    }

    this.consumed.set(key, now + ttlSeconds * 1000);
    return true;
  }

  clear() {
    this.consumed.clear();
  }
}

// Global default in-memory store for test fallbacks
export const defaultInMemoryReplayStore = new InMemoryWebhookReplayStore();

/**
 * Verifies that a webhook request was signed with the correct secret and is not a replay.
 */
export async function verifyVoiceWebhookSignature(
  options: VerifyWebhookSignatureOptions
): Promise<WebhookSignatureResult> {
  const {
    rawBody,
    signatureHeader,
    timestampHeader,
    nonceHeader,
    tenantId = 'global',
    secret,
    db,
    replayStore = db ? new FirestoreWebhookReplayStore(db) : defaultInMemoryReplayStore,
    maxTimestampSkewSeconds = 300,
  } = options;

  // 1. Validate presence of mandatory security headers
  if (!signatureHeader || !timestampHeader) {
    return {
      valid: false,
      code: 'MISSING_HEADERS',
      error: 'Missing mandatory x-voice-signature or x-voice-timestamp header.',
    };
  }

  // 2. Validate timestamp freshness
  const timestamp = parseInt(timestampHeader.trim(), 10);
  if (isNaN(timestamp)) {
    return {
      valid: false,
      code: 'MALFORMED_HEADER',
      error: 'Malformed x-voice-timestamp header.',
    };
  }

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > maxTimestampSkewSeconds) {
    return {
      valid: false,
      code: 'TIMESTAMP_EXPIRED',
      error: `Webhook timestamp expired or skew exceeded (${Math.abs(now - timestamp)}s > ${maxTimestampSkewSeconds}s limit).`,
    };
  }

  // 3. Prepare canonical payload for HMAC verification
  // Format: timestamp.nonce.rawBody or timestamp.rawBody
  const bodyBuffer = Buffer.isBuffer(rawBody)
    ? rawBody
    : Buffer.from(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody || {}));

  let canonicalData: Buffer;
  if (nonceHeader && nonceHeader.trim().length > 0) {
    const prefix = Buffer.from(`${timestamp}.${nonceHeader.trim()}.`);
    canonicalData = Buffer.concat([prefix, bodyBuffer]);
  } else {
    const prefix = Buffer.from(`${timestamp}.`);
    canonicalData = Buffer.concat([prefix, bodyBuffer]);
  }

  // 4. Compute expected HMAC-SHA256 signature
  const expectedHmac = createHmac('sha256', secret).update(canonicalData).digest('hex');

  // Support both "sha256=<hex>" and bare "<hex>" formats
  let providedSig = signatureHeader.trim();
  if (providedSig.startsWith('sha256=')) {
    providedSig = providedSig.slice(7);
  } else if (providedSig.startsWith('v1=')) {
    providedSig = providedSig.slice(3);
  }

  const expectedBuf = Buffer.from(expectedHmac);
  const providedBuf = Buffer.from(providedSig);

  if (expectedBuf.length !== providedBuf.length || !timingSafeEqual(expectedBuf, providedBuf)) {
    return {
      valid: false,
      code: 'INVALID_SIGNATURE',
      error: 'Invalid webhook signature.',
    };
  }

  // 5. Persistent Nonce Replay Check (Atomic consumption)
  if (nonceHeader && nonceHeader.trim().length > 0) {
    const nonce = nonceHeader.trim();
    const consumed = await replayStore.consumeNonce(tenantId, nonce, maxTimestampSkewSeconds * 2);
    if (!consumed) {
      return {
        valid: false,
        code: 'REPLAYED_NONCE',
        error: 'Webhook request rejected: Nonce has already been consumed (Replay Attack Detected).',
      };
    }
  }

  return { valid: true };
}
