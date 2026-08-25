import type { Request, Response, NextFunction } from 'express';
import type { Firestore, FieldValue } from 'firebase-admin/firestore';

/**
 * Idempotency key storage in Firestore
 * Keys expire after 24 hours to prevent unbounded growth
 */
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface IdempotencyRecord {
  key: string;
  response: unknown;
  statusCode: number;
  createdAt: number;
  expiresAt: number;
  requestHash: string;
}

/**
 * Generate a hash of the request body for idempotency validation
 */
export function generateRequestHash(body: unknown): string {
  const crypto = require('crypto');
  const str = JSON.stringify(body);
  return crypto.createHash('sha256').update(str).digest('hex').substring(0, 32);
}

/**
 * Middleware to enforce idempotency for mutations
 * Expects Idempotency-Key header or x-idempotency-key header
 */
export function createIdempotencyMiddleware(db: Firestore, fieldValue: typeof FieldValue) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only enforce for mutating methods
    const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (!mutatingMethods.includes(req.method)) {
      return next();
    }

    // Skip for webhook endpoints (they have their own idempotency via event IDs)
    if (req.path.startsWith('/api/webhooks/')) {
      return next();
    }

    // Skip for health/check endpoints
    if (req.path.startsWith('/api/health') ||
        req.path.startsWith('/api/env-debug') ||
        req.path.startsWith('/api/firestore-') ||
        req.path.startsWith('/api/server-time') ||
        req.path.startsWith('/api/client-config')) {
      return next();
    }

    const idempotencyKey = req.headers['idempotency-key'] as string ||
                          req.headers['x-idempotency-key'] as string;

    // If no idempotency key provided, generate a warning but allow (for backward compatibility)
    // In strict mode, we could enforce it by returning 400
    if (!idempotencyKey) {
      // Log warning in development
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[Idempotency] No idempotency key provided for ${req.method} ${req.path}`);
      }
      return next();
    }

    // Validate key format (UUID or similar)
    if (idempotencyKey.length < 16 || idempotencyKey.length > 128) {
      return res.status(400).json({
        success: false,
        error: 'Invalid idempotency key format. Must be 16-128 characters.'
      });
    }

    const requestHash = generateRequestHash(req.body);
    const idempotencyRef = db.collection('idempotency_keys').doc(idempotencyKey);

    try {
      const doc = await idempotencyRef.get();

      if (doc.exists) {
        const data = doc.data() as IdempotencyRecord;

        // Check if expired
        if (data.expiresAt < Date.now()) {
          // Expired - allow new request but clean up old record
          await idempotencyRef.delete();
        } else if (data.requestHash !== requestHash) {
          // Same key, different request - conflict
          return res.status(409).json({
            success: false,
            error: 'Idempotency key conflict: key already used with different request payload',
            code: 'IDEMPOTENCY_CONFLICT',
          });
        } else {
          // Valid replay - return cached response
          res.setHeader('Idempotency-Replay', 'true');
          return res.status(data.statusCode).json(data.response);
        }
      }

      // Store the idempotency key with pending status
      // We'll update with the actual response after the handler completes
      await idempotencyRef.set({
        key: idempotencyKey,
        requestHash,
        status: 'pending',
        createdAt: Date.now(),
        expiresAt: Date.now() + IDEMPOTENCY_TTL_MS,
      });

      // Capture the response
      const originalJson = res.json.bind(res);
      res.json = (body: any) => {
        // Store the response for future replays
        idempotencyRef.set({
          key: idempotencyKey,
          requestHash,
          response: body,
          statusCode: res.statusCode,
          status: 'completed',
          createdAt: Date.now(),
          expiresAt: Date.now() + IDEMPOTENCY_TTL_MS,
        }, { merge: true }).catch(err => {
          console.error('[Idempotency] Failed to store response:', err);
        });
        return originalJson(body);
      };

      next();
    } catch (error: any) {
      console.error('[Idempotency] Middleware error:', error);
      // Don't block the request on idempotency errors
      next();
    }
  };
}

/**
 * Create an idempotency key for client-side use
 */
export function createIdempotencyKey(): string {
  const { randomUUID } = require('crypto');
  return randomUUID();
}

/**
 * Decorator/wrapper for functions that need idempotency at the function level
 */
export async function withIdempotency<T>(
  db: Firestore,
  fieldValue: typeof FieldValue,
  key: string,
  requestBody: unknown,
  fn: () => Promise<T>
): Promise<{ result: T; replayed: boolean }> {
  const requestHash = generateRequestHash(requestBody);
  const idempotencyRef = db.collection('idempotency_keys').doc(key);

  const doc = await idempotencyRef.get();

  if (doc.exists) {
    const data = doc.data() as IdempotencyRecord;

    if (data.expiresAt >= Date.now() && data.requestHash === requestHash && data.status === 'completed') {
      return { result: data.response as T, replayed: true };
    }

    if (data.expiresAt < Date.now()) {
      await idempotencyRef.delete();
    } else if (data.requestHash !== requestHash) {
      throw new Error('Idempotency key conflict');
    }
  }

  // Execute the function
  const result = await fn();

  // Store result
  await idempotencyRef.set({
    key,
    requestHash,
    response: result,
    statusCode: 200,
    status: 'completed',
    createdAt: Date.now(),
    expiresAt: Date.now() + IDEMPOTENCY_TTL_MS,
  });

  return { result, replayed: false };
}

/**
 * Cleanup expired idempotency keys (run periodically)
 */
export async function cleanupExpiredIdempotencyKeys(db: Firestore): Promise<number> {
  const now = Date.now();
  const snapshot = await db.collection('idempotency_keys')
    .where('expiresAt', '<', now)
    .limit(500)
    .get();

  if (snapshot.empty) return 0;

  const batch = db.batch();
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();

  return snapshot.size;
}