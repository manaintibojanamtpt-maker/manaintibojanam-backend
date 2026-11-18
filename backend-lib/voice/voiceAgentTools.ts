import type { Express, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { randomUUID, randomBytes, createHmac, timingSafeEqual } from 'crypto';
import winston from 'winston';
import {
  issueVoiceOrderVerificationToken,
  verifyVoiceOrderVerificationToken,
  hashCustomerPhone,
} from './voiceVerificationToken.js';
import {
  VoicePersistence,
  type CateringEnquiryRecord,
  type CallbackRequestRecord,
} from './voicePersistence.js';
import {
  verifyVoiceWebhookSignature,
} from './voiceWebhookSignature.js';
import {
  PossessionChallengeService,
} from './voiceOrderPossessionChallenge.js';

// PII-Scrubbing Custom Winston Logger
const piiSanitizerFormat = winston.format((info) => {
  const sanitize = (val: any): any => {
    if (typeof val === 'string') {
      // Redact 10-12 digit phone numbers
      let cleaned = val.replace(/(?:\+91[-\s]?)?[6-9]\d{9}/g, '+91 ******[REDACTED]');
      // Redact Authorization headers or Bearer tokens
      cleaned = cleaned.replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]');
      return cleaned;
    }
    if (typeof val === 'object' && val !== null) {
      const copy: any = Array.isArray(val) ? [] : {};
      for (const [k, v] of Object.entries(val)) {
        if (['customerphone', 'phone', 'authorization', 'token', 'secret', 'signature'].includes(k.toLowerCase())) {
          copy[k] = '[REDACTED]';
        } else if (k.toLowerCase() === 'customername' && typeof v === 'string') {
          copy[k] = v.length > 2 ? `${v[0]}***${v.slice(-1)}` : '***';
        } else {
          copy[k] = sanitize(v);
        }
      }
      return copy;
    }
    return val;
  };

  return sanitize(info);
});

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    piiSanitizerFormat(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

export function maskPhone(phone?: string): string {
  if (!phone) return '+91 ******0000';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '+91 ******0000';
  const last4 = digits.slice(-4);
  return `+91 ******${last4}`;
}

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}

// Canonical Sample Restaurants (Fallback & Local Simulation)
export const SAMPLE_RESTAURANTS: Record<string, any> = {
  'kitchen_tirupati_central': {
    id: 'kitchen_tirupati_central',
    tenantId: 'kitchen_tirupati_central',
    name: 'Mana Inti Bojanam - Central Kitchen',
    description: 'Traditional home-cooked Andhra & Rayalaseema meals prepared fresh daily.',
    cuisines: ['South Indian', 'Andhra', 'Rayalaseema Thali'],
    address: 'Near Old Bus Stand, Tirupati, Andhra Pradesh 517501',
    rating: 4.8,
    isVegOnly: false,
    isOpen: true,
    timings: {
      lunch: '11:30 AM - 03:30 PM',
      dinner: '06:30 PM - 10:30 PM',
      days: 'Monday to Sunday',
    },
    serviceablePincodes: ['517501', '517502', '517503', '517507'],
    menu: [
      { id: 'dish_1', name: 'Special Andhra Thali', price: 180, isVeg: true, isAvailable: true, description: 'Rice, Pappu, Sambar, Rasam, 2 Curries, Curd, Sweet, Papad' },
      { id: 'dish_2', name: 'Gongura Chicken Biryani', price: 260, isVeg: false, isAvailable: true, description: 'Spicy chicken dum biryani infused with native gongura leaves' },
      { id: 'dish_3', name: 'Ragi Mudda with Natukodi Pulusu', price: 320, isVeg: false, isAvailable: true, description: 'Traditional country chicken curry served with steamed ragi ball' },
      { id: 'dish_4', name: 'Avakaya Muddapappu Annam', price: 150, isVeg: true, isAvailable: true, description: 'Steamed rice with authentic mango pickle and ghee-infused lentil mash' },
    ],
  },
  'kitchen_balaji_colony': {
    id: 'kitchen_balaji_colony',
    tenantId: 'kitchen_balaji_colony',
    name: 'Annapurna Pure Veg Kitchen',
    description: '100% Satvik and pure vegetarian homely delicacies.',
    cuisines: ['South Indian', 'Pure Veg', 'Brahmin Style'],
    address: 'Balaji Colony, Tirupati, Andhra Pradesh 517502',
    rating: 4.9,
    isVegOnly: true,
    isOpen: true,
    timings: {
      lunch: '11:00 AM - 03:00 PM',
      dinner: '06:00 PM - 10:00 PM',
      days: 'Monday to Saturday (Closed Sunday)',
    },
    serviceablePincodes: ['517501', '517502'],
    menu: [
      { id: 'dish_5', name: 'Satvik Mini Meals', price: 140, isVeg: true, isAvailable: true, description: 'No onion no garlic wholesome lunch box' },
      { id: 'dish_6', name: 'Pesarattu Upma', price: 90, isVeg: true, isAvailable: true, description: 'Moong dal crepe filled with hot rava upma & ginger chutney' },
    ],
  },
};

// Canonical Sample Orders with Complete Normalized Phone Numbers
export const SAMPLE_ORDERS: Record<string, any> = {
  'ord_987654': {
    orderId: 'ord_987654',
    tenantId: 'kitchen_tirupati_central',
    customerPhone: '+919876544321',
    customerPhoneLast4: '4321',
    restaurantName: 'Mana Inti Bojanam - Central Kitchen',
    status: 'OUT_FOR_DELIVERY',
    statusDescription: 'Delivery executive is 10 minutes away from your location.',
    etaMins: 10,
    itemsSummary: '1x Special Andhra Thali, 1x Avakaya Muddapappu Annam',
    createdAt: '2026-11-16T10:15:00Z',
  },
  'ord_123456': {
    orderId: 'ord_123456',
    tenantId: 'kitchen_balaji_colony',
    customerPhone: '+919876541234',
    customerPhoneLast4: '1234',
    restaurantName: 'Annapurna Pure Veg Kitchen',
    status: 'PREPARING',
    statusDescription: 'Kitchen is currently packing your hot meals fresh.',
    etaMins: 25,
    itemsSummary: '2x Satvik Mini Meals',
    createdAt: '2026-11-16T10:25:00Z',
  },
};

export type VoiceAgentToolName =
  | 'get_restaurant_profile'
  | 'get_restaurant_timings'
  | 'get_menu'
  | 'search_restaurants'
  | 'check_delivery_serviceability'
  | 'get_order_status'
  | 'create_catering_enquiry'
  | 'request_human_callback';

export interface VoiceAgentToolsOptions {
  db?: any;
  toolSecret?: string;
  enforceSecret?: boolean;
  allowInMemoryTesting?: boolean;
  allowUnauthenticatedForTesting?: boolean;
  allowPhoneFallbackForTesting?: boolean;
  toolAllowlist?: VoiceAgentToolName[];
  readOnlyOnly?: boolean;
}

export function registerVoiceAgentToolsRoutes(app: Express, options: VoiceAgentToolsOptions = {}) {
  const isToolAllowed = (toolName: VoiceAgentToolName): boolean => {
    if (options.readOnlyOnly) {
      return [
        'get_restaurant_profile',
        'get_restaurant_timings',
        'get_menu',
        'search_restaurants',
        'check_delivery_serviceability',
      ].includes(toolName);
    }
    if (options.toolAllowlist && Array.isArray(options.toolAllowlist)) {
      return options.toolAllowlist.includes(toolName);
    }
    return true;
  };
  const persistence = new VoicePersistence({
    db: options.db,
    allowInMemoryTesting: options.allowInMemoryTesting ?? (process.env.NODE_ENV !== 'production'),
  });

  const possessionService = new PossessionChallengeService();

  const toolRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    message: { ok: false, error: 'Too many voice tool requests. Throttled.' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Security Middleware: Authentication, Webhook Raw-Body HMAC Verification & PII Protection
  const toolAuthMiddleware = async (req: Request, res: Response, next: () => void) => {
    const correlationId = (req.headers['x-correlation-id'] as string) || `corr-${randomUUID()}`;
    res.setHeader('x-correlation-id', correlationId);

    const configuredSecret = options.toolSecret || process.env.VOICE_AGENT_TOOL_SECRET;
    const authHeader = req.headers.authorization;
    const voiceSignature = req.headers['x-voice-signature'] as string;
    const voiceTimestamp = req.headers['x-voice-timestamp'] as string;
    const voiceNonce = req.headers['x-voice-nonce'] as string;
    const tenantId = (req.headers['x-tenant-id'] as string)?.trim() || 'global';

    // 1. Check Bearer Token
    if (configuredSecret && authHeader) {
      const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
      if (match && match[1] === configuredSecret) {
        return next();
      }
    }

    // 2. Check Raw-Body HMAC Webhook Signature with Persistent Replay Nonce Verification
    if (configuredSecret && voiceSignature && voiceTimestamp) {
      const rawBody = (req as any).rawBody || (Buffer.isBuffer(req.body) ? req.body : Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {})));

      const verification = await verifyVoiceWebhookSignature({
        rawBody,
        signatureHeader: voiceSignature,
        timestampHeader: voiceTimestamp,
        nonceHeader: voiceNonce,
        tenantId,
        secret: configuredSecret,
        db: options.db,
      });

      if (verification.valid) {
        return next();
      }

      logger.warn({ message: 'Webhook HMAC signature verification failed', code: verification.code, correlationId });
      return res.status(401).json({
        ok: false,
        error: verification.error || 'Invalid webhook signature or replayed nonce.',
        correlationId,
      });
    }

    // 3. Fallback / Test policy
    const isProd = process.env.NODE_ENV === 'production';
    const enforceAuth = options.enforceSecret ?? isProd;

    if (!enforceAuth && options.allowUnauthenticatedForTesting) {
      logger.warn({ message: 'Allowing unauthenticated voice agent tool access in test mode', correlationId });
      return next();
    }

    // Strict Fail Closed
    logger.warn({ message: 'Unauthorized voice agent tool call rejected', correlationId });
    return res.status(401).json({
      ok: false,
      error: 'Unauthorized tool access. Valid authentication credential required.',
      correlationId,
    });
  };

  // Middleware: Tenant-Bound Authorization for Private/Mutating Operations
  const tenantBoundAuthMiddleware = (req: Request, res: Response, next: () => void) => {
    const authenticatedTenant = (req.headers['x-tenant-id'] as string)?.trim();
    const requestedTenant = ((req.body?.restaurantId || req.query?.restaurantId) as string)?.trim();

    // If an explicit authenticated tenant header is present, it must match requested restaurantId
    if (authenticatedTenant && requestedTenant && authenticatedTenant !== requestedTenant) {
      logger.warn({
        message: 'Cross-tenant access attempt rejected',
        authenticatedTenant,
        requestedTenant,
      });
      return res.status(403).json({
        ok: false,
        error: 'Cross-tenant access denied: Target restaurant does not match authenticated tenant credentials.',
      });
    }

    (req as any).effectiveTenantId = authenticatedTenant || requestedTenant || 'kitchen_tirupati_central';
    next();
  };

  // =========================================================================
  // THE 5 PUBLIC READ-ONLY DISCOVERY ENDPOINTS (STAGING CANDIDATES)
  // =========================================================================

  // 1. Get Restaurant Profile (Public Platform Directory)
  if (isToolAllowed('get_restaurant_profile')) {
  app.get('/api/voice-agent/tools/get_restaurant_profile', toolRateLimiter, toolAuthMiddleware, (req: Request, res: Response) => {
    const restaurantId = (req.query.restaurantId as string)?.trim() || 'kitchen_tirupati_central';
    const kitchen = SAMPLE_RESTAURANTS[restaurantId];

    if (!kitchen) {
      return res.status(404).json({ ok: false, error: `Restaurant "${restaurantId}" not found.` });
    }

    return res.json({
      ok: true,
      profile: {
        id: kitchen.id,
        name: kitchen.name,
        description: kitchen.description,
        cuisines: kitchen.cuisines,
        address: kitchen.address,
        rating: kitchen.rating,
        isVegOnly: kitchen.isVegOnly,
        isOpen: kitchen.isOpen,
      },
    });
  });
  }

  // 2. Get Restaurant Timings (Public Platform Directory)
  if (isToolAllowed('get_restaurant_timings')) {
  app.get('/api/voice-agent/tools/get_restaurant_timings', toolRateLimiter, toolAuthMiddleware, (req: Request, res: Response) => {
    const restaurantId = (req.query.restaurantId as string)?.trim() || 'kitchen_tirupati_central';
    const kitchen = SAMPLE_RESTAURANTS[restaurantId];

    if (!kitchen) {
      return res.status(404).json({ ok: false, error: `Restaurant "${restaurantId}" not found.` });
    }

    return res.json({
      ok: true,
      timings: kitchen.timings,
      isOpenNow: kitchen.isOpen,
    });
  });
  }

  // 3. Get Menu (Public Platform Catalog)
  if (isToolAllowed('get_menu')) {
  app.get('/api/voice-agent/tools/get_menu', toolRateLimiter, toolAuthMiddleware, (req: Request, res: Response) => {
    const restaurantId = (req.query.restaurantId as string)?.trim() || 'kitchen_tirupati_central';
    const vegOnly = req.query.vegOnly === 'true';
    const kitchen = SAMPLE_RESTAURANTS[restaurantId];

    if (!kitchen) {
      return res.status(404).json({ ok: false, error: `Restaurant "${restaurantId}" not found.` });
    }

    let items = kitchen.menu;
    if (vegOnly) {
      items = items.filter((d: any) => d.isVeg);
    }

    return res.json({
      ok: true,
      restaurantName: kitchen.name,
      dishes: items.map((d: any) => ({
        id: d.id,
        name: d.name,
        priceInr: d.price,
        isVeg: d.isVeg,
        isAvailable: d.isAvailable,
        description: d.description,
      })),
    });
  });
  }

  // 4. Search Restaurants (Public Multi-Tenant Directory)
  if (isToolAllowed('search_restaurants')) {
  app.get('/api/voice-agent/tools/search_restaurants', toolRateLimiter, toolAuthMiddleware, (req: Request, res: Response) => {
    const query = ((req.query.query as string) || '').toLowerCase().trim();
    const results = Object.values(SAMPLE_RESTAURANTS).filter((k: any) =>
      !query ||
      k.name.toLowerCase().includes(query) ||
      k.cuisines.some((c: string) => c.toLowerCase().includes(query)) ||
      k.description.toLowerCase().includes(query)
    );

    return res.json({
      ok: true,
      count: results.length,
      restaurants: results.map((k: any) => ({
        id: k.id,
        name: k.name,
        cuisines: k.cuisines,
        rating: k.rating,
        isOpen: k.isOpen,
        isVegOnly: k.isVegOnly,
      })),
    });
  });
  }

  // 5. Check Delivery Serviceability (Public Operational Check)
  if (isToolAllowed('check_delivery_serviceability')) {
  app.get('/api/voice-agent/tools/check_delivery_serviceability', toolRateLimiter, toolAuthMiddleware, (req: Request, res: Response) => {
    const restaurantId = (req.query.restaurantId as string)?.trim() || 'kitchen_tirupati_central';
    const pincode = (req.query.pincode as string)?.trim();
    const kitchen = SAMPLE_RESTAURANTS[restaurantId];

    if (!kitchen) {
      return res.status(404).json({ ok: false, error: `Restaurant "${restaurantId}" not found.` });
    }

    if (!pincode) {
      return res.status(400).json({ ok: false, error: 'Pincode is required to verify delivery.' });
    }

    const isServiceable = kitchen.serviceablePincodes.includes(pincode);
    return res.json({
      ok: true,
      restaurantId,
      pincode,
      isServiceable,
      message: isServiceable
        ? `Yes! We deliver to pincode ${pincode} within 30-45 minutes.`
        : `Sorry, we currently do not deliver to pincode ${pincode}.`,
    });
  });
  }

  // =========================================================================
  // THE 3 SENSITIVE / MUTATING ENDPOINTS (KEPT DISCONNECTED FOR STAGING)
  // =========================================================================

  // 6. Get Order Status (Requires Verified Possession Challenge Token)
  if (isToolAllowed('get_order_status')) {
  app.get('/api/voice-agent/tools/get_order_status', toolRateLimiter, toolAuthMiddleware, (req: Request, res: Response) => {
    const orderId = (req.query.orderId as string)?.trim();
    const customerPhone = (req.query.customerPhone as string)?.trim();
    const verificationToken = (req.query.verificationToken as string)?.trim() ||
      (req.headers['x-voice-verification-token'] as string)?.trim();
    const tenantId = (req.query.tenantId as string)?.trim();

    // 1. Mandatory Order ID validation
    if (!orderId) {
      return res.status(400).json({ ok: false, error: 'Order ID is required.' });
    }

    // 2. Mandatory Verification Evidence check (Fail Closed)
    if (!verificationToken && !customerPhone) {
      return res.status(400).json({
        ok: false,
        error: 'Customer verification evidence is required to check order status.',
      });
    }

    const order = SAMPLE_ORDERS[orderId];

    // Generic rejection response to prevent order ID enumeration or cross-customer leakage
    const genericVerificationFailed = () => {
      logger.warn({ message: 'Order verification rejected (fail-closed)', orderId });
      return res.status(403).json({
        ok: false,
        error: 'Order not found or customer verification failed.',
      });
    };

    if (!order) {
      return genericVerificationFailed();
    }

    if (tenantId && order.tenantId !== tenantId) {
      return genericVerificationFailed();
    }

    // Option A: Cryptographic Voice Verification Token check
    if (verificationToken) {
      const verifyResult = verifyVoiceOrderVerificationToken({
        token: verificationToken,
        expectedOrderId: orderId,
        expectedTenantId: order.tenantId,
      });

      if (!verifyResult.valid) {
        logger.warn({ message: 'Voice verification token failed', reason: verifyResult.reason, orderId });
        return genericVerificationFailed();
      }
    } else if (customerPhone) {
      // Option B: Spoken Phone Number Fallback (Disabled by default; only allowed if explicitly enabled in test mode)
      if (!options.allowPhoneFallbackForTesting) {
        logger.warn({ message: 'Spoken phone number alone rejected for order status disclosure', orderId });
        return genericVerificationFailed();
      }

      const inputDigits = normalizePhone(customerPhone);
      if (inputDigits.length < 10) {
        return res.status(400).json({
          ok: false,
          error: 'A complete 10-digit registered phone number is required for customer verification.',
        });
      }

      const orderDigits = normalizePhone(order.customerPhone);
      if (inputDigits !== orderDigits && !orderDigits.endsWith(inputDigits)) {
        return genericVerificationFailed();
      }
    }

    // Success: Return sanitized order status with ZERO PII leakage
    return res.json({
      ok: true,
      order: {
        orderId: order.orderId,
        restaurantName: order.restaurantName,
        status: order.status,
        statusDescription: order.statusDescription,
        etaMins: order.etaMins,
        itemsSummary: order.itemsSummary,
      },
    });
  });
  }

  // 7. Create Catering Enquiry (Durable Tenant Persistence & Idempotency)
  if (isToolAllowed('create_catering_enquiry')) {
  app.post(
    '/api/voice-agent/tools/create_catering_enquiry',
    toolRateLimiter,
    toolAuthMiddleware,
    tenantBoundAuthMiddleware,
    async (req: Request, res: Response) => {
      const { customerName, customerPhone, eventType, guestCount, eventDate, notes, idempotencyKey } = req.body;
      const tenantId = (req as any).effectiveTenantId;
      const name = (customerName as string)?.trim();
      const phone = (customerPhone as string)?.trim();
      const guests = Number(guestCount);
      const date = (eventDate as string)?.trim();

      // Input Validation
      if (!name || name.length < 2) {
        return res.status(400).json({ ok: false, error: 'Valid customerName (minimum 2 characters) is required.' });
      }

      if (!phone || normalizePhone(phone).length < 10) {
        return res.status(400).json({ ok: false, error: 'A valid 10-digit customerPhone is required.' });
      }

      if (isNaN(guests) || guests < 10 || guests > 5000) {
        return res.status(400).json({ ok: false, error: 'guestCount must be a valid number between 10 and 5000.' });
      }

      if (date) {
        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) {
          return res.status(400).json({ ok: false, error: 'eventDate must be a valid date format.' });
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (parsedDate < today) {
          return res.status(400).json({ ok: false, error: 'eventDate cannot be in the past.' });
        }
      }

      const phoneHash = hashCustomerPhone(phone);
      const effectiveIdempotencyKey = idempotencyKey || persistence.generateIdempotencyKey(tenantId, 'catering', phoneHash, `${guests}:${date || ''}`);

      // Distributed Idempotency check
      const existingId = await persistence.checkIdempotency(effectiveIdempotencyKey);
      if (existingId) {
        logger.info({ message: 'Duplicate catering enquiry deduplicated via distributed idempotency key', enquiryId: existingId });
        return res.json({
          ok: true,
          enquiryId: existingId,
          confirmationMessage: `Catering enquiry for ${guests} guests has already been registered. A manager will call back at ${maskPhone(phone)} shortly.`,
          deduplicated: true,
        });
      }

      const enquiryId = `cat_${Date.now()}_${randomBytes(4).toString('hex')}`;
      const enquiry: CateringEnquiryRecord = {
        id: enquiryId,
        tenantId,
        customerName: name,
        customerPhoneMasked: maskPhone(phone),
        customerPhoneHash: phoneHash,
        eventType: (eventType as string)?.trim() || 'Family Gathering',
        guestCount: guests,
        eventDate: date || new Date(Date.now() + 86400000).toISOString().split('T')[0],
        notes: (notes as string)?.trim() || 'Recorded via Voice Assistant',
        createdAt: new Date().toISOString(),
        status: 'PENDING_HUMAN_CALLBACK',
        source: 'voice_agent',
        idempotencyKey: effectiveIdempotencyKey,
      };

      // Durable persistence write
      const writeResult = await persistence.saveCateringEnquiry(enquiry);
      if (!writeResult.success) {
        logger.error({ message: 'Catering enquiry persistence failed', error: writeResult.error });
        return res.status(503).json({
          ok: false,
          error: writeResult.error || 'Durable persistence storage is unavailable. Request rejected.',
        });
      }

      logger.info({ message: 'New catering enquiry durable write confirmed', enquiryId, tenantId });
      return res.json({
        ok: true,
        enquiryId,
        confirmationMessage: `Catering enquiry for ${guests} guests registered successfully. A manager will call back at ${enquiry.customerPhoneMasked} shortly.`,
      });
    }
  );
  }

  // 8. Request Human Callback (Durable Tenant Persistence & Idempotency)
  if (isToolAllowed('request_human_callback')) {
  app.post(
    '/api/voice-agent/tools/request_human_callback',
    toolRateLimiter,
    toolAuthMiddleware,
    tenantBoundAuthMiddleware,
    async (req: Request, res: Response) => {
      const { customerName, customerPhone, reason, idempotencyKey } = req.body;
      const tenantId = (req as any).effectiveTenantId;
      const name = (customerName as string)?.trim();
      const phone = (customerPhone as string)?.trim();
      const requestReason = (reason as string)?.trim();

      // Input Validation
      if (!name || name.length < 2) {
        return res.status(400).json({ ok: false, error: 'Valid customerName (minimum 2 characters) is required.' });
      }

      if (!phone || normalizePhone(phone).length < 10) {
        return res.status(400).json({ ok: false, error: 'A valid 10-digit customerPhone is required.' });
      }

      if (!requestReason || requestReason.length < 3) {
        return res.status(400).json({ ok: false, error: 'reason (minimum 3 characters) is required for callback request.' });
      }

      const phoneHash = hashCustomerPhone(phone);
      const effectiveIdempotencyKey = idempotencyKey || persistence.generateIdempotencyKey(tenantId, 'callback', phoneHash, requestReason);

      // Distributed Idempotency check
      const existingId = await persistence.checkIdempotency(effectiveIdempotencyKey);
      if (existingId) {
        logger.info({ message: 'Duplicate callback request deduplicated via distributed idempotency key', callbackId: existingId });
        return res.json({
          ok: true,
          callbackId: existingId,
          message: `Human assistance request is already queued with reference ${existingId}. An executive will call you back within 15 minutes.`,
          deduplicated: true,
        });
      }

      const callbackId = `cb_${Date.now()}_${randomBytes(4).toString('hex')}`;
      const callbackRecord: CallbackRequestRecord = {
        id: callbackId,
        tenantId,
        customerName: name,
        customerPhoneMasked: maskPhone(phone),
        customerPhoneHash: phoneHash,
        reason: requestReason,
        createdAt: new Date().toISOString(),
        status: 'QUEUED',
        source: 'voice_agent',
        idempotencyKey: effectiveIdempotencyKey,
      };

      // Durable persistence write
      const writeResult = await persistence.saveCallbackRequest(callbackRecord);
      if (!writeResult.success) {
        logger.error({ message: 'Human callback request persistence failed', error: writeResult.error });
        return res.status(503).json({
          ok: false,
          error: writeResult.error || 'Durable persistence storage is unavailable. Request rejected.',
        });
      }

      logger.info({ message: 'Human callback durable write confirmed', callbackId, tenantId });
      return res.json({
        ok: true,
        callbackId,
        message: `Human assistance request queued with reference ${callbackId}. An executive will call you back within 15 minutes.`,
      });
    }
  );
  }

  return { persistence, possessionService };
}
