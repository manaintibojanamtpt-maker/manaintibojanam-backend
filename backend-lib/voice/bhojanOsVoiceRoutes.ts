/**
 * BhojanOS SaaS Multilingual Voice Routes
 *
 * Implements Sarvam Saaras v4 STT integration for restaurant operations:
 * 1. POST /api/v1/tenants/:tenantId/voice/transcribe
 *    - Authenticated via Firebase ID Token
 *    - Authorized by tenant membership (owner, manager, cashier, kitchen, admin)
 *    - Biased with tenant's active menu items + operational terms (KOT, Bill, Parcel, etc.)
 *    - Uses saaras:v4 with language_code=unknown
 *
 * 2. POST /api/v1/tenants/:tenantId/voice/pos-draft
 *    - Dictated food items and quantities parsed and mapped to active tenant menu
 *    - Strictly creates a DRAFT bill for cashier review
 *    - NEVER auto-finalizes or charges payments without confirmation
 *
 * 3. POST /api/v1/tenants/:tenantId/voice/kitchen-command
 *    - Parses kitchen operations (mark ready, preparing, accept, reject)
 *    - Verifies order belongs to tenant
 *    - Returns proposed command requiring explicit operator confirmation
 */

import { Router, type Request, type Response } from 'express';
import type { Firestore, FieldValue } from 'firebase-admin/firestore';
import { getSttProvider } from './voiceSttRoute.js';
import { readVoiceConfig } from './voiceConfig.js';
import {
  sanitizeKeyterms,
  fetchRestaurantDishesKeyterms,
  BHOJANOS_OPERATIONAL_KEYWORDS,
} from './voiceKeyterms.js';
import {
  resolveActorForTenant,
  type VerifiedUser,
  type TenantMembership,
} from '../orders/registerOrderCommandRoutes.js';
import { processOrderCommand } from '../orders/orderCommandProcessor.js';

export interface BhojanOsVoiceRoutesOptions {
  db?: Firestore | any;
  fieldValue?: typeof FieldValue | any;
  verifyFirebaseToken?: (token: string) => Promise<VerifiedUser>;
  getTenantMemberships?: (uid: string) => Promise<TenantMembership[]>;
}

const extractBearerToken = (header: unknown): string | null => {
  const raw = Array.isArray(header) ? header[0] : header;
  if (typeof raw !== 'string') return null;
  const match = /^Bearer\s+(.+)$/i.exec(raw.trim());
  return match ? match[1].trim() : null;
};

// Map multilingual numbers (English, Telugu, Hindi) to integers
const NUMBER_WORDS: Record<string, number> = {
  'one': 1, 'okati': 1, 'ek': 1, '1': 1,
  'two': 2, 'rendu': 2, 'do': 2, '2': 2,
  'three': 3, 'moodu': 3, 'teen': 3, '3': 3,
  'four': 4, 'naalugu': 4, 'char': 4, '4': 4,
  'five': 5, 'aidu': 5, 'paanch': 5, '5': 5,
  'six': 6, 'aaru': 6, 'chhah': 6, '6': 6,
  'seven': 7, 'yedu': 7, 'saat': 7, '7': 7,
  'eight': 8, 'enimidi': 8, 'aath': 8, '8': 8,
  'nine': 9, 'thommidi': 9, 'nau': 9, '9': 9,
  'ten': 10, 'padi': 10, 'das': 10, '10': 10,
};

export interface PosDraftItem {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface PosDraftBill {
  status: 'DRAFT';
  tenantId: string;
  items: PosDraftItem[];
  subtotal: number;
  tax: number;
  total: number;
  orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  tableNumber?: string;
  requiresCashierConfirmation: true;
  transcript: string;
  detectedLanguage?: string;
}

/**
 * Parses a transcript against a list of tenant menu items to produce draft line items.
 */
export function matchVoiceItemsToMenu(
  transcript: string,
  menuItems: Array<{ id: string; name: string; price: number; isAvailable?: boolean }>,
): { matched: PosDraftItem[]; unmatchedTokens: string[] } {
  const normalized = transcript.toLowerCase().replace(/[,.-]/g, ' ').replace(/\s+/g, ' ');
  const words = normalized.split(' ');
  const matched: PosDraftItem[] = [];
  const matchedTokens = new Set<string>();

  // Sort menu items by name length descending to match longest dishes first
  const activeItems = menuItems
    .filter(item => item.isAvailable !== false && item.name)
    .sort((a, b) => b.name.length - a.name.length);

  for (const item of activeItems) {
    const itemNameLower = item.name.toLowerCase().trim();
    const itemTokens = itemNameLower.split(/\s+/);
    
    // Check if item name appears in transcript
    const idx = normalized.indexOf(itemNameLower);
    if (idx !== -1) {
      // Look back for quantity preceding item name
      const precedingText = normalized.substring(0, idx).trim();
      const precedingWords = precedingText.split(' ');
      const lastPrecedingWord = precedingWords[precedingWords.length - 1];
      let quantity = 1;

      if (lastPrecedingWord && NUMBER_WORDS[lastPrecedingWord]) {
        quantity = NUMBER_WORDS[lastPrecedingWord];
        matchedTokens.add(lastPrecedingWord);
      }

      itemTokens.forEach(t => matchedTokens.add(t));

      const unitPrice = typeof item.price === 'number' && item.price > 0 ? item.price : 0;
      matched.push({
        menuItemId: item.id,
        name: item.name,
        quantity,
        unitPrice,
        totalPrice: unitPrice * quantity,
      });
    }
  }

  // Find significant words that weren't matched
  const STOPWORDS = new Set(['kavali', 'chahiye', 'please', 'add', 'item', 'plate', 'plates', 'packet', 'and', 'with', 'one', 'two', 'three', 'ek', 'do', 'rendu', 'moodu', 'table']);
  const unmatchedTokens = words.filter(w => w.length > 2 && !matchedTokens.has(w) && !STOPWORDS.has(w));

  return { matched, unmatchedTokens };
}

/**
 * Extracts kitchen command action and target order reference from transcript.
 */
export function parseKitchenCommand(transcript: string): {
  action: 'MarkReady' | 'MarkPreparing' | 'AcceptOrder' | 'RejectOrder' | 'Unknown';
  orderReference?: string;
  tableNumber?: string;
} {
  const lower = transcript.toLowerCase();
  let action: 'MarkReady' | 'MarkPreparing' | 'AcceptOrder' | 'RejectOrder' | 'Unknown' = 'Unknown';

  if (/\b(ready|tayyar|mark ready|done)\b/.test(lower)) {
    action = 'MarkReady';
  } else if (/\b(preparing|prepare|start|cook|cooking)\b/.test(lower)) {
    action = 'MarkPreparing';
  } else if (/\b(accept|accepted|approve)\b/.test(lower)) {
    action = 'AcceptOrder';
  } else if (/\b(reject|rejected|cancel|cancelled)\b/.test(lower)) {
    action = 'RejectOrder';
  }

  // Look for order number like "order 123", "order #123", "#123"
  const orderMatch = /(?:order|number|no\.?|#)\s*#?([a-z0-9_-]+)/i.exec(lower);
  const orderReference = orderMatch ? orderMatch[1] : undefined;

  // Look for table number
  const tableMatch = /table\s*#?(\d+)/i.exec(lower);
  const tableNumber = tableMatch ? tableMatch[1] : undefined;

  return { action, orderReference, tableNumber };
}

export function registerBhojanOsVoiceRoutes(
  app: Router | any,
  options: BhojanOsVoiceRoutesOptions = {},
): void {
  const router = Router({ mergeParams: true });

  // Middleware: Authenticate & Authorize caller against requested tenant
  const authorizeTenantVoice = async (req: Request, res: Response, next: () => void) => {
    try {
      const authHeader = req.headers.authorization;
      const token = extractBearerToken(authHeader);

      if (!token) {
        return res.status(401).json({
          success: false,
          code: 'UNAUTHENTICATED',
          error: 'Firebase ID token is required in Authorization header',
        });
      }

      if (!options.verifyFirebaseToken) {
        return res.status(500).json({
          success: false,
          code: 'AUTH_NOT_CONFIGURED',
          error: 'Token verifier is not configured',
        });
      }

      const verifiedUser = await options.verifyFirebaseToken(token);
      const tenantId = String(req.params.tenantId || '').trim();

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_TENANT',
          error: 'tenantId parameter is required in route URL',
        });
      }

      const memberships = options.getTenantMemberships
        ? await options.getTenantMemberships(verifiedUser.uid)
        : [];

      const tenantIds = memberships.map(m => m.tenantId);
      const membership = memberships.find(m => m.tenantId === tenantId);

      const resolution = resolveActorForTenant(
        verifiedUser,
        tenantId,
        tenantIds,
        membership?.role,
      );

      if (!resolution.ok) {
        return res.status(403).json({
          success: false,
          code: resolution.code,
          error: resolution.message,
        });
      }

      (req as any).voiceActor = resolution.actor;
      (req as any).tenantId = tenantId;
      next();
    } catch (err: any) {
      return res.status(401).json({
        success: false,
        code: 'AUTH_FAILED',
        error: err?.message || 'Authentication failed',
      });
    }
  };

  /**
   * 1. POST /api/v1/tenants/:tenantId/voice/transcribe
   * Enterprise-grade multilingual speech-to-text with tenant menu biasing
   */
  router.post(
    '/api/v1/tenants/:tenantId/voice/transcribe',
    authorizeTenantVoice,
    async (req: Request, res: Response) => {
      const startedAt = Date.now();
      try {
        const tenantId = (req as any).tenantId;
        const actor = (req as any).voiceActor;

        let audioBuffer: Buffer | null = null;
        let mimeType = 'audio/wav';
        let language = 'unknown';
        let withTimestamps = false;
        let inputAudioCodec: string | undefined;
        let rawKeyterms: any = null;

        if (Buffer.isBuffer(req.body)) {
          audioBuffer = req.body;
          mimeType = req.headers['content-type'] || 'audio/wav';
          language = (req.query.lang as string) || (req.query.language_code as string) || 'unknown';
          withTimestamps = req.query.with_timestamps === 'true';
          inputAudioCodec = req.query.input_audio_codec as string;
          rawKeyterms = req.query.keyterms;
        } else if (req.body && typeof req.body === 'object') {
          const { audioBase64, audio, lang, language_code, mime, mimeType: bMime, keyterms, withTimestamps: bWith, inputAudioCodec: bCodec } = req.body;
          const b64 = audioBase64 || audio;
          if (typeof b64 === 'string' && b64.trim()) {
            audioBuffer = Buffer.from(b64, 'base64');
          }
          if (typeof bMime === 'string') mimeType = bMime;
          else if (typeof mime === 'string') mimeType = mime;

          if (typeof lang === 'string') language = lang;
          else if (typeof language_code === 'string') language = language_code;

          withTimestamps = bWith === true || req.query.with_timestamps === 'true';
          inputAudioCodec = bCodec || req.query.input_audio_codec;
          rawKeyterms = keyterms ?? req.query.keyterms;
        }

        if (!audioBuffer || audioBuffer.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Audio content is required (binary body or { audioBase64 })',
            code: 'STT_INVALID_AUDIO',
          });
        }

        // Build domain keyterms: caller keyterms + tenant menu + operational keywords
        const userTerms = sanitizeKeyterms(rawKeyterms);
        let tenantDishes: string[] = [];
        if (options.db) {
          tenantDishes = await fetchRestaurantDishesKeyterms(options.db, tenantId, 30);
        }

        const combinedKeyterms = sanitizeKeyterms(
          [...userTerms, ...tenantDishes, ...BHOJANOS_OPERATIONAL_KEYWORDS],
          50,
          64,
        );

        const provider = getSttProvider();
        const config = readVoiceConfig();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.sttTimeoutMs);

        let result: any;
        try {
          result = await provider.transcribe(
            {
              audioBuffer,
              mimeType,
              language,
              keyterms: combinedKeyterms.length > 0 ? combinedKeyterms : undefined,
              withTimestamps,
              inputAudioCodec,
            },
            controller.signal,
          );
        } finally {
          clearTimeout(timeoutId);
        }

        const latencyMs = Date.now() - startedAt;

        res.status(200).json({
          success: true,
          transcript: result.transcript,
          language: result.language,
          confidence: result.confidence,
          isFinal: result.isFinal,
          provider: result.provider,
          model: 'saaras:v4',
          requestId: result.requestId,
          timestamps: result.timestamps,
          tenantId,
          caller: {
            uid: actor.uid,
            role: actor.role,
          },
          keytermsUsedCount: combinedKeyterms.length,
          latencyMs,
        });
      } catch (err: any) {
        console.error('[BhojanOSVoice] Transcribe Error:', err?.message || err);
        const statusCode = err?.statusCode || 502;
        res.status(statusCode).json({
          success: false,
          error: err?.message || 'STT transcription failed',
          code: err?.code || 'STT_PROVIDER_ERROR',
          retryable: err?.retryable ?? false,
        });
      }
    },
  );

  /**
   * 2. POST /api/v1/tenants/:tenantId/voice/pos-draft
   * Dictate orders for POS counter; outputs DRAFT bill requiring cashier confirmation
   */
  router.post(
    '/api/v1/tenants/:tenantId/voice/pos-draft',
    authorizeTenantVoice,
    async (req: Request, res: Response) => {
      try {
        const tenantId = (req as any).tenantId;
        const actor = (req as any).voiceActor;

        if (actor.role === 'kitchen') {
          return res.status(403).json({
            success: false,
            code: 'FORBIDDEN_ROLE',
            error: 'Kitchen staff role cannot generate POS billing drafts.',
          });
        }

        let transcript: string = '';
        let detectedLanguage: string | undefined;

        // Either transcript is supplied, or audio is supplied to be transcribed first
        if (req.body?.transcript && typeof req.body.transcript === 'string') {
          transcript = req.body.transcript.trim();
        } else {
          // Audio transcription branch
          let audioBuffer: Buffer | null = null;
          let mimeType = 'audio/wav';
          if (Buffer.isBuffer(req.body)) {
            audioBuffer = req.body;
            mimeType = req.headers['content-type'] || 'audio/wav';
          } else if (req.body?.audioBase64) {
            audioBuffer = Buffer.from(req.body.audioBase64, 'base64');
            if (req.body.mime) mimeType = req.body.mime;
          }

          if (!audioBuffer) {
            return res.status(400).json({
              success: false,
              code: 'MISSING_INPUT',
              error: 'Either transcript or audioBase64 must be supplied',
            });
          }

          let tenantDishes: string[] = [];
          if (options.db) {
            tenantDishes = await fetchRestaurantDishesKeyterms(options.db, tenantId, 30);
          }
          const combinedKeyterms = sanitizeKeyterms([...tenantDishes, ...BHOJANOS_OPERATIONAL_KEYWORDS], 50, 64);

          const provider = getSttProvider();
          const config = readVoiceConfig();
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), config.sttTimeoutMs);
          try {
            const sttRes = await provider.transcribe(
              {
                audioBuffer,
                mimeType,
                language: 'unknown',
                keyterms: combinedKeyterms,
              },
              controller.signal,
            );
            transcript = sttRes.transcript;
            detectedLanguage = sttRes.language;
          } finally {
            clearTimeout(timeoutId);
          }
        }

        if (!transcript) {
          return res.status(400).json({
            success: false,
            code: 'EMPTY_TRANSCRIPT',
            error: 'No speech could be recognized',
          });
        }

        // Fetch menu items for tenant
        const menuItems: Array<{ id: string; name: string; price: number; isAvailable?: boolean }> = [];
        if (options.db) {
          const snap = await options.db
            .collection('menu')
            .where('tenantId', '==', tenantId)
            .limit(100)
            .get()
            .catch(() => null);

          if (snap && !snap.empty) {
            snap.docs.forEach((doc: any) => {
              const d = doc.data();
              menuItems.push({
                id: doc.id,
                name: d.name || d.title || '',
                price: Number(d.price || 0),
                isAvailable: d.isAvailable !== false && d.available !== false,
              });
            });
          }
        }

        const { matched, unmatchedTokens } = matchVoiceItemsToMenu(transcript, menuItems);

        const subtotal = matched.reduce((sum, item) => sum + item.totalPrice, 0);
        // Standard 5% GST approximation if not configured
        const tax = Math.round(subtotal * 0.05);
        const total = subtotal + tax;

        // Check for order type in transcript
        let orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' = 'DINE_IN';
        if (/\b(takeaway|parcel|pack)\b/i.test(transcript)) {
          orderType = 'TAKEAWAY';
        } else if (/\b(delivery)\b/i.test(transcript)) {
          orderType = 'DELIVERY';
        }

        // Check for table number
        const tableMatch = /table\s*#?(\d+)/i.exec(transcript);
        const tableNumber = tableMatch ? tableMatch[1] : undefined;

        const draft: PosDraftBill = {
          status: 'DRAFT',
          tenantId,
          items: matched,
          subtotal,
          tax,
          total,
          orderType,
          ...(tableNumber ? { tableNumber } : {}),
          requiresCashierConfirmation: true,
          transcript,
          ...(detectedLanguage ? { detectedLanguage } : {}),
        };

        res.status(200).json({
          success: true,
          draft,
          unmatchedTokens,
          message: 'Draft bill prepared from voice input. Cashier confirmation required before finalizing.',
        });
      } catch (err: any) {
        console.error('[BhojanOSVoice] POS Draft Error:', err?.message || err);
        res.status(500).json({
          success: false,
          code: 'POS_DRAFT_FAILED',
          error: err?.message || 'Failed to generate POS draft',
        });
      }
    },
  );

  /**
   * 3. POST /api/v1/tenants/:tenantId/voice/kitchen-command
   * Voice-directed kitchen actions (MarkReady, MarkPreparing, Accept, Reject)
   * Strictly produces a proposed command requiring explicit operator confirmation
   */
  router.post(
    '/api/v1/tenants/:tenantId/voice/kitchen-command',
    authorizeTenantVoice,
    async (req: Request, res: Response) => {
      try {
        const tenantId = (req as any).tenantId;
        const actor = (req as any).voiceActor;

        let transcript: string = '';
        if (req.body?.transcript && typeof req.body.transcript === 'string') {
          transcript = req.body.transcript.trim();
        } else {
          // Audio transcription
          let audioBuffer: Buffer | null = null;
          let mimeType = 'audio/wav';
          if (Buffer.isBuffer(req.body)) {
            audioBuffer = req.body;
            mimeType = req.headers['content-type'] || 'audio/wav';
          } else if (req.body?.audioBase64) {
            audioBuffer = Buffer.from(req.body.audioBase64, 'base64');
            if (req.body.mime) mimeType = req.body.mime;
          }

          if (!audioBuffer) {
            return res.status(400).json({
              success: false,
              code: 'MISSING_INPUT',
              error: 'Either transcript or audioBase64 must be supplied',
            });
          }

          const provider = getSttProvider();
          const config = readVoiceConfig();
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), config.sttTimeoutMs);
          try {
            const sttRes = await provider.transcribe(
              {
                audioBuffer,
                mimeType,
                language: 'unknown',
                keyterms: sanitizeKeyterms([...BHOJANOS_OPERATIONAL_KEYWORDS], 50, 64),
              },
              controller.signal,
            );
            transcript = sttRes.transcript;
          } finally {
            clearTimeout(timeoutId);
          }
        }

        const parsed = parseKitchenCommand(transcript);

        if (parsed.action === 'Unknown') {
          return res.status(422).json({
            success: false,
            code: 'COMMAND_NOT_RECOGNIZED',
            error: `Could not identify a valid kitchen command from transcript: "${transcript}"`,
            transcript,
          });
        }

        // Verify order exists and belongs to this tenant if orderReference is present
        let matchedOrderId: string | undefined;
        let orderData: any = null;

        if (parsed.orderReference && options.db) {
          // Try direct doc read first
          const docRef = options.db.collection('orders').doc(parsed.orderReference);
          const docSnap = await docRef.get().catch(() => null);
          if (docSnap && docSnap.exists) {
            const d = docSnap.data();
            if (d.tenantId === tenantId) {
              matchedOrderId = docSnap.id;
              orderData = d;
            }
          }

          // If not found by doc id, search by orderNumber / displayOrderNumber
          if (!matchedOrderId) {
            const numSnap = await options.db
              .collection('orders')
              .where('tenantId', '==', tenantId)
              .where('orderNumber', '==', parsed.orderReference)
              .limit(1)
              .get()
              .catch(() => null);

            if (numSnap && !numSnap.empty) {
              matchedOrderId = numSnap.docs[0].id;
              orderData = numSnap.docs[0].data();
            }
          }
        }

        const proposedCommand = {
          commandType: parsed.action,
          tenantId,
          orderReference: parsed.orderReference,
          matchedOrderId,
          currentStatus: orderData?.status,
          tableNumber: parsed.tableNumber,
          caller: {
            uid: actor.uid,
            role: actor.role,
          },
          requiresConfirmation: true,
        };

        // If client explicitly sent confirm=true AND an idempotencyKey AND order was resolved
        const isConfirmed = req.body?.confirm === true;
        const idempotencyKey = (req.headers['idempotency-key'] as string) || req.body?.idempotencyKey;

        if (isConfirmed && matchedOrderId && idempotencyKey && options.db && options.fieldValue) {
          // Execute command via processOrderCommand
          const result = await processOrderCommand(options.db, options.fieldValue, {
            commandId: idempotencyKey,
            commandType: parsed.action as any,
            tenantId,
            orderId: matchedOrderId,
            actor,
            payload: {
              ...(orderData?.version !== undefined ? { expectedVersion: orderData.version } : {}),
            },
          });

          return res.status(result.success ? 200 : 409).json({
            success: result.success,
            executed: true,
            commandResult: result,
            proposedCommand,
            transcript,
          });
        }

        // Default: return proposed command for operator confirmation
        res.status(200).json({
          success: true,
          executed: false,
          requiresConfirmation: true,
          proposedCommand,
          transcript,
          message: 'Kitchen command parsed. Operator must confirm execution.',
        });
      } catch (err: any) {
        console.error('[BhojanOSVoice] Kitchen Command Error:', err?.message || err);
        res.status(500).json({
          success: false,
          code: 'KITCHEN_COMMAND_FAILED',
          error: err?.message || 'Failed to process kitchen command',
        });
      }
    },
  );

  app.use(router);
}
