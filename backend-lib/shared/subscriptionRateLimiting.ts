import rateLimit from 'express-rate-limit';
import type { Request, Response, NextFunction } from 'express';
import type { Firestore } from 'firebase-admin/firestore';

/**
 * Rate limiting configuration for subscription endpoints
 * Different tiers for different operation sensitivities
 */

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: { success: boolean; error: string };
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request) => boolean;
}

/**
 * Default rate limit configs for subscription operations
 */
export const SUBSCRIPTION_RATE_LIMITS = {
  // Checkout creation - moderate limit
  checkout: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: { success: false, error: 'Too many checkout attempts. Please wait and try again.' },
  } as RateLimitConfig,

  // Payment confirmation - stricter limit
  confirmPayment: {
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { success: false, error: 'Too many payment verification attempts. Please wait and try again.' },
  } as RateLimitConfig,

  // Plan upgrades/downgrades - moderate
  planChange: {
    windowMs: 15 * 60 * 1000,
    max: 15,
    message: { success: false, error: 'Too many plan change requests. Please wait and try again.' },
  } as RateLimitConfig,

  // Trial activation - stricter (prevent abuse)
  trialActivation: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    message: { success: false, error: 'Too many trial activation attempts. Please try again later.' },
  } as RateLimitConfig,

  // Subscription status - higher limit (read-heavy)
  status: {
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, error: 'Too many status requests. Please wait and try again.' },
  } as RateLimitConfig,

  // Cancellation/resume - moderate
  cancelResume: {
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { success: false, error: 'Too many cancellation/resume requests. Please wait and try again.' },
  } as RateLimitConfig,

  // Billing retry - stricter (costly operation)
  billingRetry: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: { success: false, error: 'Too many billing retry attempts. Please wait before retrying.' },
  } as RateLimitConfig,

  // Super admin operations - moderate (audit trail exists)
  admin: {
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: { success: false, error: 'Too many admin requests. Please wait and try again.' },
  } as RateLimitConfig,
};

/**
 * Create a rate limiter with tenant-aware key generation
 */
export function createTenantAwareRateLimiter(
  config: RateLimitConfig,
  getTenantId?: (req: Request) => string | undefined
) {
  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: config.message,
    keyGenerator: (req: Request) => {
      // Use tenant ID + IP for more granular limiting
      const tenantId = getTenantId?.(req) || req.headers['x-tenant-id'] || req.query.tenantId;
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      return `tenant:${tenantId || 'anon'}:ip:${ip}`;
    },
    skip: config.skip,
    handler: (req: Request, res: Response) => {
      res.setHeader('Retry-After', Math.ceil(config.windowMs / 1000));
      res.status(429).json(config.message);
    },
  });
}

/**
 * Create a user-aware rate limiter (based on authenticated user)
 */
export function createUserAwareRateLimiter(config: RateLimitConfig) {
  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: config.message,
    keyGenerator: (req: Request) => {
      // Use user ID if available, fallback to IP
      const userId = (req as any).user?.uid || req.ip || 'unknown';
      return `user:${userId}`;
    },
    handler: (req: Request, res: Response) => {
      res.setHeader('Retry-After', Math.ceil(config.windowMs / 1000));
      res.status(429).json(config.message);
    },
  });
}

/**
 * Subscription-specific rate limiters
 */
export const subscriptionRateLimiters = {
  checkout: createTenantAwareRateLimiter(SUBSCRIPTION_RATE_LIMITS.checkout),
  confirmPayment: createUserAwareRateLimiter(SUBSCRIPTION_RATE_LIMITS.confirmPayment),
  planChange: createUserAwareRateLimiter(SUBSCRIPTION_RATE_LIMITS.planChange),
  trialActivation: createUserAwareRateLimiter(SUBSCRIPTION_RATE_LIMITS.trialActivation),
  status: createTenantAwareRateLimiter(SUBSCRIPTION_RATE_LIMITS.status),
  cancelResume: createUserAwareRateLimiter(SUBSCRIPTION_RATE_LIMITS.cancelResume),
  billingRetry: createUserAwareRateLimiter(SUBSCRIPTION_RATE_LIMITS.billingRetry),
  admin: createTenantAwareRateLimiter(SUBSCRIPTION_RATE_LIMITS.admin),
};

/**
 * Dynamic rate limiter based on user's subscription tier
 * Higher limits for higher-tier plans
 */
export function createTierAwareRateLimiter(
  baseConfig: RateLimitConfig,
  getTier: (req: Request) => Promise<string | null>
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tier = await getTier(req);
      const multipliers: Record<string, number> = {
        starter: 1,
        growth: 2,
        pro: 3,
        enterprise: 5,
      };

      const multiplier = multipliers[tier || 'starter'] || 1;
      const dynamicMax = baseConfig.max * multiplier;

      const limiter = rateLimit({
        windowMs: baseConfig.windowMs,
        max: dynamicMax,
        standardHeaders: true,
        legacyHeaders: false,
        message: baseConfig.message,
        keyGenerator: (req: Request) => {
          const userId = (req as any).user?.uid || req.ip || 'unknown';
          return `user:${userId}`;
        },
        handler: (req: Request, res: Response) => {
          res.setHeader('Retry-After', Math.ceil(baseConfig.windowMs / 1000));
          res.status(429).json(baseConfig.message);
        },
      });

      return limiter(req, res, next);
    } catch (error) {
      // Fallback to base limiter
      const limiter = rateLimit(baseConfig);
      return limiter(req, res, next);
    }
  };
}

/**
 * Distributed rate limiting using Firestore for multi-instance deployments
 * Stores counters in Firestore with TTL
 */
export function createDistributedRateLimiter(
  db: Firestore,
  config: {
    windowMs: number;
    max: number;
    prefix: string;
    keyGenerator: (req: Request) => string;
  }
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = config.keyGenerator(req);
    const windowKey = `${config.prefix}:${key}:${Math.floor(Date.now() / config.windowMs)}`;
    const counterRef = db.collection('rate_limit_counters').doc(windowKey);

    try {
      const doc = await counterRef.get();
      const currentCount = doc.exists ? (doc.data()?.count || 0) : 0;

      if (currentCount >= config.max) {
        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil(config.windowMs / 1000),
        });
      }

      // Increment counter
      await counterRef.set({
        count: currentCount + 1,
        windowStart: Math.floor(Date.now() / config.windowMs) * config.windowMs,
        expiresAt: Date.now() + config.windowMs + 60000, // TTL = window + 1 min buffer
      }, { merge: true });

      res.setHeader('X-RateLimit-Limit', config.max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, config.max - currentCount - 1));
      res.setHeader('X-RateLimit-Reset', Math.floor((Date.now() + config.windowMs) / 1000));

      next();
    } catch (error) {
      console.error('[RateLimit] Distributed rate limiter error:', error);
      // Fail open - don't block on rate limiter errors
      next();
    }
  };
}

/**
 * Cleanup expired rate limit counters (run periodically)
 */
export async function cleanupExpiredRateLimitCounters(db: Firestore): Promise<number> {
  const now = Date.now();
  const snapshot = await db.collection('rate_limit_counters')
    .where('expiresAt', '<', now)
    .limit(500)
    .get();

  if (snapshot.empty) return 0;

  const batch = db.batch();
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();

  return snapshot.size;
}

/**
 * Webhook-specific rate limiting (by Razorpay event type)
 */
export function createWebhookRateLimiter(
  db: Firestore,
  maxPerEventType: number = 1000, // per 15 min per event type
  windowMs: number = 15 * 60 * 1000
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const eventType = req.body?.event || 'unknown';
    const windowKey = `webhook:${eventType}:${Math.floor(Date.now() / windowMs)}`;
    const counterRef = db.collection('webhook_rate_limits').doc(windowKey);

    try {
      const doc = await counterRef.get();
      const currentCount = doc.exists ? (doc.data()?.count || 0) : 0;

      if (currentCount >= maxPerEventType) {
        console.warn('[Webhook RateLimit] Limit exceeded', { eventType, count: currentCount });
        return res.status(429).json({
          success: false,
          error: 'Webhook rate limit exceeded',
        });
      }

      await counterRef.set({
        count: currentCount + 1,
        eventType,
        windowStart: Math.floor(Date.now() / windowMs) * windowMs,
        expiresAt: Date.now() + windowMs + 60000,
      }, { merge: true });

      next();
    } catch (error) {
      console.error('[Webhook RateLimit] Error:', error);
      next(); // Fail open
    }
  };
}