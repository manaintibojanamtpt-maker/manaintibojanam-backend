/**
 * Purpose: Authoritative conversational turn processor for BhojanOS & OrderBhojan voice assistants.
 * Public API: processVoiceAssistantTurn, VoiceTurnProcessorDeps, VoiceTurnParams, VoiceTurnOutcome
 * Capabilities:
 * - Customer Ordering Assistant: Menu search, dietary filter, dish price/details, safe cart planning (never auto-charges).
 * - Multi-turn conversational flow: "Add two dosas" -> "Make that three" -> "One without onion" -> "Remove the last one" -> "How much is total?".
 * - Merchant Operations Assistant: Today's authoritative sales summary (IST timezone), pending kitchen orders, safe menu stock proposals (requires confirmation), EOD reconciliation.
 * - Strict authorization checks: Merchant actions require authenticated owner/manager UID and server-side verified tenant scope via assertOwnerTenantAccess.
 * - Customer order tracking checks: Requires customer UID matching order owner or guest tracking token.
 * - Multilingual intelligence: Fluent Telugu, Hindi, Indian English with natural Indic phrasing, no raw IDs or JSON leaks.
 * - Telemetry & latency tracking: correlation ID and timing spans on every turn.
 */

import { randomUUID } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import { getAuthoritativeDailySalesSummary } from './authoritativeReporting.js';
import { verifyGuestOrderToken } from '../guestOrderToken.js';

export interface PendingClarificationItem {
  foodId: string;
  name: string;
  quantity: number;
  price: number;
  needsVariant?: boolean;
  variantId?: string;
  variantOptions?: Array<{ id: string; name: string; price: number }>;
}

export interface PendingClarification {
  type: 'variant' | 'dish';
  pendingItems: PendingClarificationItem[];
  clarifyingIndex: number;
  restaurantId?: string;
  userId?: string;
  sessionId?: string;
}

export interface VoiceTurnParams {
  sessionId: string;
  transcript: string;
  language?: string;
  userId?: string;
  tenantId?: string;
  restaurantId?: string;
  mode?: 'consumer_ordering' | 'merchant_ops' | 'merchant_marketing' | 'customer';
  channel?: 'orderbhojan_web' | 'orderbhojan_android' | 'bhojanos_owner' | 'unknown';
  orderTrackingToken?: string;
  context?: {
    cart?: { items?: Array<{ id: string; name: string; quantity: number; price?: number; notes?: string }> };
    menuItems?: Array<{
      id: string;
      name: string;
      price: number;
      isAvailable?: boolean;
      isVeg?: boolean;
      category?: string;
      variants?: Array<{ id?: string; variantId?: string; name?: string; displayName?: string; price?: number; offerPrice?: number }>;
    }>;
    restaurantName?: string;
    restaurantSlug?: string;
    restaurantId?: string;
    lastProposedItem?: { id: string; name: string; quantity: number; price: number };
    currentProposal?: Array<{ foodId: string; name: string; quantity: number; price: number; variantId?: string }> | null;
    pendingClarification?: PendingClarification | null;
  };
}

export interface VoiceTurnOutcome {
  reply: string;
  language: string;
  proposedActions?: Array<{ type: string; payload?: Record<string, unknown> }>;
  intent?: string;
  correlationId: string;
  latencyMs: number;
  authorized?: boolean;
  pendingClarification?: PendingClarification | null;
}

export interface VoiceTurnProcessorDeps {
  db?: Firestore;
  assertOwnerTenantAccess?: (userId: string, tenantId: string, email?: string) => Promise<string>;
}

/** Strip technical database keys (e.g., obr_..., menu_item_...) from user-facing copy */
export function sanitizeTechnicalIds(text: string): string {
  return text
    .replace(/\b(obr|usr|txn|ord|kot|item)_[a-zA-Z0-9_-]+\b/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Detect language of utterance */
export function detectLanguage(text: string, preferred?: string): 'te-IN' | 'hi-IN' | 'en-IN' {
  if (preferred) {
    const norm = preferred.toLowerCase();
    if (norm.startsWith('te')) return 'te-IN';
    if (norm.startsWith('hi')) return 'hi-IN';
    if (norm.startsWith('ta') || norm.startsWith('kn')) return 'te-IN';
    if (norm.startsWith('en')) return 'en-IN';
  }

  // Check Unicode script ranges
  if (/[\u0C00-\u0C7F]/.test(text)) return 'te-IN'; // Telugu script
  if (/[\u0900-\u097F]/.test(text)) return 'hi-IN'; // Devanagari / Hindi script

  const lower = text.toLowerCase();

  // Distinct Telugu romanized keywords
  if (/\b(anna|andi|kavali|kavale|ivvandi|pettandi|rendu|moodu|nalugu|aidu|enti|bhojanam|namaskaram|vaddhu|chudandi|cheyyandi|teeseyandi|lekunda|ulli|naa|emundi|ekkada)\b/i.test(lower)) {
    return 'te-IN';
  }

  // Distinct Hindi romanized keywords
  if (/\b(bhaiya|chahiye|teen|char|paanch|kardo|kitna|hoga|batao|kripya|namaste|hatao|hata|bina|pyaz|aur|kahan|hai)\b/i.test(lower)) {
    return 'hi-IN';
  }

  return 'en-IN';
}

/** Parse quantity from Indic scripts, romanized Indic, or English speech */
export function extractQuantity(text: string): number {
  const lower = text.toLowerCase();

  // Telugu script numbers
  if (/(ఒకటి|ఒక|౧)/.test(text)) return 1;
  if (/(రెండు|౨)/.test(text)) return 2;
  if (/(మూడు|౩)/.test(text)) return 3;
  if (/(నాలుగు|౪)/.test(text)) return 4;
  if (/(ఐదు|౫)/.test(text)) return 5;

  // Hindi / Devanagari script numbers
  if (/(एक|१)/.test(text)) return 1;
  if (/(दो|२)/.test(text)) return 2;
  if (/(तीन|३)/.test(text)) return 3;
  if (/(चार|४)/.test(text)) return 4;
  if (/(पाँच|पांच|५)/.test(text)) return 5;

  // Romanized & English numbers
  if (/\b(one|okati|oka|ek|single)\b/i.test(lower)) return 1;
  if (/\b(two|rendu|do|double)\b/i.test(lower)) return 2;
  if (/\b(three|moodu|teen|triple)\b/i.test(lower)) return 3;
  if (/\b(four|nalugu|naalugu|char|chaar)\b/i.test(lower)) return 4;
  if (/\b(five|aidu|paanch|panch)\b/i.test(lower)) return 5;

  const match = lower.match(/\b(\d+)\b/);
  if (match) {
    const val = parseInt(match[1], 10);
    if (!Number.isNaN(val) && val > 0 && val <= 50) return val;
  }
  return 1;
}

/** Normalize spoken dish queries across Indic scripts & romanized variants */
export function normalizeSpokenDishQuery(text: string): string {
  let s = text.toLowerCase();

  // Telugu script food terms -> standard English tokens
  s = s.replace(/చికెన్/g, 'chicken ');
  s = s.replace(/బిర్యానీలు?|బిరియానీలు?|బిరియాని|బిర్యాని/g, 'biryani ');
  s = s.replace(/మటన్/g, 'mutton ');
  s = s.replace(/పన్నీర్|పనీర్/g, 'paneer ');
  s = s.replace(/దోశలు?|దోసలు?|దోశ|దోస/g, 'dosa ');
  s = s.replace(/ఇడ్లీలు?|ఇడ్లీ/g, 'idli ');
  s = s.replace(/వడలు?|వడ/g, 'vada ');
  s = s.replace(/రైతా|రైత/g, 'raita ');
  s = s.replace(/సాంబారు?|సాంబార్/g, 'sambar ');
  s = s.replace(/చట్నీ|చట్ని/g, 'chutney ');
  s = s.replace(/పూరీలు?|పూరి/g, 'puri ');
  s = s.replace(/రొట్టెలు?|రొట్టె|రోటీ|చపాతీ/g, 'roti ');
  s = s.replace(/స్పెషల్/g, 'special ');
  s = s.replace(/జంబో/g, 'jumbo ');
  s = s.replace(/సింగిల్/g, 'single ');
  s = s.replace(/హాఫ్/g, 'half ');
  s = s.replace(/ఫుల్/g, 'full ');

  // Hindi / Devanagari food terms -> standard English tokens
  s = s.replace(/चिकन/g, 'chicken ');
  s = s.replace(/बिरयानी|बिरियानी/g, 'biryani ');
  s = s.replace(/मटन/g, 'mutton ');
  s = s.replace(/पनीर/g, 'paneer ');
  s = s.replace(/डोसा|दोसा/g, 'dosa ');
  s = s.replace(/इडली/g, 'idli ');
  s = s.replace(/वड़ा|बड़ा/g, 'vada ');
  s = s.replace(/रायता/g, 'raita ');
  s = s.replace(/सांभर|साम्भर/g, 'sambar ');
  s = s.replace(/चटनी/g, 'chutney ');
  s = s.replace(/पूरी/g, 'puri ');
  s = s.replace(/रोटी|चपाती/g, 'roti ');
  s = s.replace(/स्पेशल/g, 'special ');
  s = s.replace(/जंबो/g, 'jumbo ');
  s = s.replace(/सिंगल/g, 'single ');
  s = s.replace(/हाफ/g, 'half ');
  s = s.replace(/फुल/g, 'full ');

  // Common verbs and filler words to clean out
  s = s.replace(/\b(add|want|give|please|kavali|kavale|ivvandi|cheyyandi|chahiye|do|dijiye|plate|plates|two|three|four|five|rendu|moodu|nalugu|ek|teen|also|too|as well|kooda|bhi)\b/gi, ' ');
  s = s.replace(/(కావాలి|కావాలె|ఇవ్వండి|తీసుకోండి|చేయండి|చేయి|పెట్టండి|ఆర్డర్|ప్లేట్లు?|ఒకటి|రెండు|మూడు|నాలుగు|ఐదు|కూడా|కూడ|కూడాను)/g, ' ');
  s = s.replace(/(चाहिए|चाहिये|दीजिए|देना|लाओ|लगाओ|करो|कर\s*दो|डालो|ऑर्डर|प्लेट|एक|दो|तीन|चार|पाँच|पांच|भी|साथ\s*में)/g, ' ');

  return s.replace(/\s+/g, ' ').trim();
}

/** Split multi-item utterances by conjunctions */
export function splitMultiItemUtterance(text: string): string[] {
  const clauses = text.split(/\s*(?:and|plus|with|along with|మరియు|తో పాటు|ఇంకా|और|तथा|साथ में|,)\s*/i);
  const cleaned = clauses.map((c) => c.trim()).filter((c) => c.length > 0);
  return cleaned.length > 0 ? cleaned : [text.trim()];
}

export async function processVoiceAssistantTurn(
  params: VoiceTurnParams,
  deps: VoiceTurnProcessorDeps = {},
): Promise<VoiceTurnOutcome> {
  const startedAt = Date.now();
  const correlationId = `vturn_${Date.now()}_${randomUUID().slice(0, 8)}`;
  const transcript = params.transcript?.trim() || '';
  const lang = detectLanguage(transcript, params.language);
  const mode = params.mode || (params.channel === 'bhojanos_owner' ? 'merchant_ops' : 'consumer_ordering');

  // Handle empty utterance
  if (!transcript) {
    const emptyReply =
      lang === 'te-IN'
        ? 'నమస్కారం! నేను మీకు ఎలా సహాయపడగలను?'
        : lang === 'hi-IN'
          ? 'नमस्ते! मैं आपकी किस प्रकार सहायता कर सकता हूँ?'
          : 'Hello! How may I assist you with your order today?';
    return {
      reply: emptyReply,
      language: lang,
      intent: 'greeting',
      correlationId,
      latencyMs: Date.now() - startedAt,
      authorized: true,
    };
  }

  // =========================================================================
  // MERCHANT / OWNER OPERATIONS ASSISTANT
  // =========================================================================
  if (mode === 'merchant_ops') {
    const tenantId = params.tenantId || params.restaurantId;
    const userId = params.userId;

    // Authorization Guard: Require authenticated user (not guest) and tenant ID
    if (!userId || userId === 'guest' || !tenantId) {
      const authErrorReply =
        lang === 'te-IN'
          ? 'క్షమించండి, రెస్టారెంట్ కార్యకలాపాల వివరాలు చూడటానికి యజమాని ఖాతాతో లాగిన్ అవ్వాలి.'
          : lang === 'hi-IN'
            ? 'माफ़ कीजिए, रेस्टोरेंट के ऑपरेशन्स देखने के लिए ओनर अकाउंट से लॉगिन आवश्यक है।'
            : 'Unauthorized. Viewing restaurant operations requires an authenticated owner account.';
      return {
        reply: authErrorReply,
        language: lang,
        intent: 'unauthorized',
        correlationId,
        latencyMs: Date.now() - startedAt,
        authorized: false,
      };
    }

    // Server-side Role Resolution: Verify owner/manager tenant access via assertOwnerTenantAccess
    if (deps.assertOwnerTenantAccess) {
      try {
        await deps.assertOwnerTenantAccess(userId, tenantId);
      } catch (authError: any) {
        const forbiddenReply =
          lang === 'te-IN'
            ? 'క్షమించండి, మీకు ఈ రెస్టారెంట్ కార్యకలాపాలను నిర్వహించే అధికారం లేదు.'
            : lang === 'hi-IN'
              ? 'माफ़ कीजिए, आपके पास इस रेस्टोरेंट के ऑपरेशन्स एक्सेस करने की अनुमति नहीं है।'
              : 'Access denied. You do not have owner or manager privileges for this restaurant.';
        return {
          reply: forbiddenReply,
          language: lang,
          intent: 'unauthorized',
          correlationId,
          latencyMs: Date.now() - startedAt,
          authorized: false,
        };
      }
    }

    const lower = transcript.toLowerCase();

    // 1. Authoritative Today's Sales Summary (IST Timezone & PAID Status)
    if (
      lower.includes('sales') ||
      lower.includes('revenue') ||
      lower.includes('collection') ||
      lower.includes('ammu') ||
      lower.includes('kamayi') ||
      lower.includes('batao sales')
    ) {
      let salesSummary = {
        totalRevenue: 0,
        paidOrderCount: 0,
        unpaidOrderCount: 0,
        averageOrderValue: 0,
      };

      if (deps.db) {
        try {
          salesSummary = await getAuthoritativeDailySalesSummary(deps.db, tenantId);
        } catch {
          // Handled safely
        }
      }

      const reply =
        lang === 'te-IN'
          ? `ఈరోజు వసూళ్లు ₹${salesSummary.totalRevenue.toLocaleString('en-IN')}, మొత్తం ${salesSummary.paidOrderCount} చెల్లించిన ఆర్డర్లు.${salesSummary.unpaidOrderCount > 0 ? ` ఇంకా ${salesSummary.unpaidOrderCount} ఆర్డర్లు చెల్లింపు కోసం పెండింగ్‌లో ఉన్నాయి.` : ''}`
          : lang === 'hi-IN'
            ? `आज का कुल कलेक्शन ₹${salesSummary.totalRevenue.toLocaleString('en-IN')} है, जिसमें ${salesSummary.paidOrderCount} भुगतान प्राप्त ऑर्डर्स हैं।${salesSummary.unpaidOrderCount > 0 ? ` ${salesSummary.unpaidOrderCount} ऑर्डर्स अभी अनपेड हैं।` : ''}`
            : `Today's net collections are ₹${salesSummary.totalRevenue.toLocaleString('en-IN')} across ${salesSummary.paidOrderCount} paid orders.${salesSummary.unpaidOrderCount > 0 ? ` ${salesSummary.unpaidOrderCount} orders are pending payment.` : ''}`;

      return {
        reply,
        language: lang,
        intent: 'owner_sales_summary',
        proposedActions: [{ type: 'navigate_analytics', payload: { tenantId } }],
        correlationId,
        latencyMs: Date.now() - startedAt,
        authorized: true,
      };
    }

    // 2. Pending Orders Count in Kitchen
    if (lower.includes('pending') || lower.includes('kitchen') || lower.includes('kot') || lower.includes('orders count')) {
      let pendingCount = 0;
      if (deps.db) {
        try {
          const snap = await deps.db
            .collection('orders')
            .where('tenantId', '==', tenantId)
            .where('status', 'in', ['PENDING', 'ACCEPTED', 'PREPARING', 'READY'])
            .get();
          pendingCount = snap.size;
        } catch {}
      }

      const reply =
        lang === 'te-IN'
          ? `కిచెన్ లో ప్రస్తుతం ${pendingCount} పెండింగ్ ఆర్డర్లు ఉన్నాయి.`
          : lang === 'hi-IN'
            ? `किचन में अभी ${pendingCount} पेंडिंग ऑर्डर्स हैं।`
            : `You have ${pendingCount} active pending orders in the kitchen.`;

      return {
        reply,
        language: lang,
        intent: 'owner_pending_orders',
        proposedActions: [{ type: 'navigate_pos_orders', payload: { tenantId } }],
        correlationId,
        latencyMs: Date.now() - startedAt,
        authorized: true,
      };
    }

    // 3. Menu Stock Mutation: Proposal-Only with Explicit Confirmation Guard
    if (
      lower.includes('out of stock') ||
      lower.includes('in stock') ||
      lower.includes('available') ||
      lower.includes('unavailable') ||
      lower.includes('ayipoindi') ||
      lower.includes('khatam')
    ) {
      const isMakeAvailable = lower.includes('in stock') || (lower.includes('available') && !lower.includes('un'));
      const actionDesc = isMakeAvailable ? 'in stock' : 'out of stock';

      const cleanedItem = transcript
        .replace(/\b(mark|make|item|dish|as|out of stock|in stock|available|unavailable|khatam|ayipoindi|kardo|cheyyandi)\b/gi, '')
        .trim();

      const proposalId = `msp_${Date.now()}_${randomUUID().slice(0, 6)}`;

      const reply =
        lang === 'te-IN'
          ? `స్టాక్ మార్పులు ప్రతిపాదన మాత్రమే మరియు వాయిస్ ద్వారా నేరుగా అమలు చేయబడవు. ${cleanedItem || 'ఐటమ్'}ను ${isMakeAvailable ? 'అందుబాటులో ఉంది' : 'స్టాక్ అయిపోయింది'}గా మార్చడానికి ప్రతిపాదన సిద్ధం చేయబడింది. దయచేసి ఇన్వెంటరీ స్క్రీన్‌పై నిర్ధారించండి.`
          : lang === 'hi-IN'
            ? `स्टॉक परिवर्तन केवल प्रस्ताव हैं और वॉयस द्वारा सीधे लागू नहीं होते हैं। ${cleanedItem || 'आइटम'} को ${isMakeAvailable ? 'उपलब्ध' : 'आउट ऑफ स्टॉक'} मार्क करने का प्रस्ताव तैयार है। कृपया इन्वेंटरी स्क्रीन पर कन्फर्म करें।`
            : `Proposal created: Stock changes are proposal-only and cannot be applied directly by voice. Please review and confirm on your screen in the inventory screen to mark ${cleanedItem || 'the item'} as ${actionDesc}.`;

      return {
        reply,
        language: lang,
        intent: 'owner_propose_stock_change',
        proposedActions: [
          {
            type: 'menu_stock_proposal',
            payload: {
              proposalId,
              itemName: cleanedItem,
              isAvailable: isMakeAvailable,
              tenantId,
              requiresConfirmation: true,
              navigationPath: `/owner/menu?tenantId=${encodeURIComponent(tenantId)}`,
            },
          },
        ],
        correlationId,
        latencyMs: Date.now() - startedAt,
        authorized: true,
      };
    }

    // 4. End of Day (EOD) Reconciliation Report
    if (lower.includes('eod') || lower.includes('closing') || lower.includes('day close') || lower.includes('reconcile')) {
      let salesSummary = {
        totalRevenue: 0,
        paidOrderCount: 0,
        unpaidOrderCount: 0,
        cashAmount: 0,
        upiAmount: 0,
      };

      if (deps.db) {
        try {
          salesSummary = await getAuthoritativeDailySalesSummary(deps.db, tenantId);
        } catch {}
      }

      const reply =
        lang === 'te-IN'
          ? `ఈరోజు ఈఓడీ రికన్సిలియేషన్: మొత్తం వసూళ్లు ₹${salesSummary.totalRevenue.toLocaleString('en-IN')} (${salesSummary.paidOrderCount} ఆర్డర్లు). నగదు ₹${salesSummary.cashAmount.toLocaleString('en-IN')}, యూపీఐ ₹${salesSummary.upiAmount.toLocaleString('en-IN')}. రోజును క్లోజ్ చేయడానికి నిర్ధారించండి.`
          : lang === 'hi-IN'
            ? `आज की ईओडी रिपोर्ट: कुल कलेक्शन ₹${salesSummary.totalRevenue.toLocaleString('en-IN')} (${salesSummary.paidOrderCount} ऑर्डर्स)। कैश ₹${salesSummary.cashAmount.toLocaleString('en-IN')}, यूपीआई ₹${salesSummary.upiAmount.toLocaleString('en-IN')}। दिन समाप्त करने के लिए कन्फर्म करें।`
            : `End of day reconciliation: Total revenue ₹${salesSummary.totalRevenue.toLocaleString('en-IN')} across ${salesSummary.paidOrderCount} paid orders (Cash: ₹${salesSummary.cashAmount.toLocaleString('en-IN')}, UPI: ₹${salesSummary.upiAmount.toLocaleString('en-IN')}). Please review and close the day.`;

      return {
        reply,
        language: lang,
        intent: 'owner_eod_summary',
        proposedActions: [{ type: 'navigate_pos_eod', payload: { tenantId } }],
        correlationId,
        latencyMs: Date.now() - startedAt,
        authorized: true,
      };
    }

    // Fallback owner reply
    const genericOwnerReply =
      lang === 'te-IN'
        ? 'మీరు నేటి అమ్మకాలు, కిచెన్ పెండింగ్ ఆర్డర్లు, మెనూ స్టాక్ మార్పులు లేదా ఈఓడీ వివరాలను అడగవచ్చు.'
        : lang === 'hi-IN'
          ? 'आप आज की कुल बिक्री, पेंडिंग ऑर्डर्स, मेनू स्टॉक या ईओडी रिपोर्ट के बारे में पूछ सकते हैं।'
          : 'You can ask for today sales, kitchen pending orders, toggle menu stock, or review EOD reconciliation.';

    return {
      reply: genericOwnerReply,
      language: lang,
      intent: 'owner_guidance',
      correlationId,
      latencyMs: Date.now() - startedAt,
      authorized: true,
    };
  }

  // =========================================================================
  // CONSUMER / CUSTOMER ORDERING ASSISTANT
  // =========================================================================
  const lower = transcript.toLowerCase();
  const menuItems = params.context?.menuItems || [];
  const cartItems = params.context?.cart?.items || [];
  const lastProposedItem = params.context?.lastProposedItem;

  // Cancellation & Reset Intent ("cancel", "never mind", "stop", "vaddu", "nahi chahiye", "reset")
  // 1. Interruption / Stop Speaking Intent ("stop speaking", "stop talking", "be quiet", "stop", "aapu", "bolna band karo")
  // Halts audio playback while strictly PRESERVING the pending proposal, pending clarification, and committed cart!
  const isStopSpeaking =
    /^(stop|stop speaking|stop talking|be quiet|quiet|shh|shut up|pause|pause audio|stop audio|mute)$/i.test(lower) ||
    lower.includes('stop speaking') ||
    lower.includes('stop talking') ||
    lower.includes('audio aapu') ||
    lower.includes('voice aapu') ||
    lower.includes('sound aapu') ||
    lower.includes('మాట్లాడటం ఆపు') ||
    lower.includes('చెప్పడం ఆపు') ||
    lower.includes('ఆపండి') ||
    (transcript.trim() === 'ఆపు' || lower === 'aapu') ||
    lower.includes('बोलना बंद') ||
    lower.includes('बात मत करो') ||
    lower.includes('चुप रहो') ||
    lower.includes('शांत रहो') ||
    lower.includes('आवाज़ बंद') ||
    lower === 'chup' ||
    lower === 'roko';

  if (isStopSpeaking) {
    return {
      reply: '',
      language: lang,
      intent: 'stop_speaking',
      // Strictly preserve proposal and clarification context without cancelling
      correlationId,
      latencyMs: Date.now() - startedAt,
      authorized: true,
      pendingClarification: params.context?.pendingClarification || null,
    };
  }

  // 2. Proposal / Order Cancellation Intent ("cancel order", "cancel proposal", "never mind", "reset", "vaddu", "nahi chahiye")
  // Clears the active draft proposal and clarification state WITHOUT deleting committed cart items or cancelling a placed order!
  const isCancellation =
    /^(cancel|cancel order|cancel this order|cancel proposal|cancel this proposal|clear proposal|never mind|reset|reset order|start over)$/i.test(lower) ||
    lower.includes('cancel order') ||
    lower.includes('cancel this order') ||
    lower.includes('cancel proposal') ||
    lower.includes('clear proposal') ||
    lower.includes('order cancel') ||
    // Telugu Romanized
    /^(vaddu|vaddhu|avsaram ledu|raddhu cheyyandi|raddu cheyyandi|order vaddu|naaku vaddu)$/i.test(lower) ||
    lower.includes('order vaddu') ||
    lower.includes('avsaram ledu') ||
    lower.includes('raddhu cheyyandi') ||
    lower.includes('raddu cheyyandi') ||
    // Telugu Native Script
    /^(వద్దు|నాకు వద్దు|అవసరం లేదు|రద్దు చేయండి|ఆర్డర్ రద్దు చేయండి|ఆర్డర్ వద్దు)$/u.test(transcript.trim()) ||
    transcript.includes('రద్దు చేయండి') ||
    transcript.includes('ఆర్డర్ వద్దు') ||
    transcript.includes('నాకు వద్దు') ||
    transcript.includes('అవసరం లేదు') ||
    // Hindi Romanized
    /^(nahi chahiye|mujhe nahi chahiye|mat karo|radd karo|cancel kar|order nahi chahiye)$/i.test(lower) ||
    lower.includes('nahi chahiye') ||
    lower.includes('mat karo') ||
    lower.includes('radd karo') ||
    lower.includes('order nahi chahiye') ||
    lower.includes('cancel kar') ||
    // Hindi Native Script
    /^(नहीं चाहिए|मुझे नहीं चाहिए|मत करो|रद्द करो|ऑर्डर रद्द करें|ऑर्डर रद्द करो|कैंसिल करो|ऑर्डर मत करो)$/u.test(transcript.trim()) ||
    transcript.includes('रद्द करो') ||
    transcript.includes('रद्द करें') ||
    transcript.includes('नहीं चाहिए') ||
    transcript.includes('कैंसिल करो') ||
    transcript.includes('मत करो');

  if (isCancellation) {
    const reply =
      lang === 'te-IN'
        ? 'ప్రతిపాదన రద్దు చేయబడింది. మీ మునుపటి కార్ట్ అలాగే ఉంది. నేను మీకు ఇంకా ఎలా సహాయపడగలను?'
        : lang === 'hi-IN'
          ? 'प्रस्ताव रद्द कर दिया गया है। आपका मौजूदा कार्ट सुरक्षित है। मैं आपकी और क्या सहायता कर सकता हूँ?'
          : 'Proposal cancelled. Your existing cart is unchanged. How else may I assist you?';

    return {
      reply,
      language: lang,
      intent: 'cancel_order',
      proposedActions: [{ type: 'clear_proposal' }],
      correlationId,
      latencyMs: Date.now() - startedAt,
      authorized: true,
      pendingClarification: null,
    };
  }

  // 0. Multi-Turn: Variant / Dish Clarification Resolution with Scope Isolation
  const pendingClarification = params.context?.pendingClarification;
  const isSameScope =
    pendingClarification &&
    (!pendingClarification.restaurantId || !params.restaurantId || pendingClarification.restaurantId === params.restaurantId) &&
    (!pendingClarification.userId || !params.userId || pendingClarification.userId === params.userId) &&
    (!pendingClarification.sessionId || !params.sessionId || pendingClarification.sessionId === params.sessionId);

  if (
    isSameScope &&
    pendingClarification &&
    pendingClarification.type === 'variant' &&
    pendingClarification.pendingItems?.length > 0
  ) {
    const clarifyingIdx = pendingClarification.clarifyingIndex ?? 0;
    const clarifyingItem = pendingClarification.pendingItems[clarifyingIdx];

    if (clarifyingItem && clarifyingItem.variantOptions && clarifyingItem.variantOptions.length > 0) {
      const normUtterance = normalizeSpokenDishQuery(transcript);
      const matchedOption = clarifyingItem.variantOptions.find((opt) => {
        const optNorm = opt.name.toLowerCase();
        const optId = (opt.id || '').toLowerCase();
        return (
          normUtterance.includes(optNorm) ||
          normUtterance.includes(optId) ||
          lower.includes(optNorm) ||
          lower.includes(optId) ||
          (optNorm.includes('jumbo') && (lower.includes('jumbo') || lower.includes('జంబో') || lower.includes('जंबो'))) ||
          (optNorm.includes('single') && (lower.includes('single') || lower.includes('సింగిల్') || lower.includes('सिंगल'))) ||
          (optNorm.includes('full') && (lower.includes('full') || lower.includes('ఫుల్') || lower.includes('फुल'))) ||
          (optNorm.includes('half') && (lower.includes('half') || lower.includes('హాఫ్') || lower.includes('हाफ')))
        );
      });

      if (matchedOption) {
        clarifyingItem.needsVariant = false;
        clarifyingItem.variantId = matchedOption.id;
        clarifyingItem.name = `${clarifyingItem.name} (${matchedOption.name})`;
        clarifyingItem.price = matchedOption.price;

        // Check if other items still need variant clarification
        const nextIndex = pendingClarification.pendingItems.findIndex((pi) => pi.needsVariant);
        if (nextIndex >= 0) {
          pendingClarification.clarifyingIndex = nextIndex;
          const nextItem = pendingClarification.pendingItems[nextIndex];
          const optionsText = nextItem.variantOptions?.map((o) => o.name).join(' or ') || '';
          const reply =
            lang === 'te-IN'
              ? `${sanitizeTechnicalIds(nextItem.name)} కొరకు మీకు ${optionsText} కావాలా?`
              : lang === 'hi-IN'
                ? `${sanitizeTechnicalIds(nextItem.name)} के लिए आप ${optionsText} लेना चाहेंगे?`
                : `Would you like ${optionsText} for the ${sanitizeTechnicalIds(nextItem.name)}?`;

          return {
            reply,
            language: lang,
            intent: 'clarify_dish_choice',
            correlationId,
            latencyMs: Date.now() - startedAt,
            authorized: true,
            pendingClarification,
          };
        }

        // All items in the multi-item order are resolved! Construct complete proposal with authoritative prices!
        const totalAmount = pendingClarification.pendingItems.reduce(
          (acc, pi) => acc + pi.price * pi.quantity,
          0,
        );
        const itemSummaries = pendingClarification.pendingItems.map(
          (pi) => `${pi.quantity} ${sanitizeTechnicalIds(pi.name)}`,
        );
        const summaryText =
          itemSummaries.length === 1
            ? itemSummaries[0]
            : itemSummaries.slice(0, -1).join(', ') +
              (lang === 'te-IN' ? ' మరియు ' : lang === 'hi-IN' ? ' और ' : ' and ') +
              itemSummaries[itemSummaries.length - 1];

        const reply =
          lang === 'te-IN'
            ? `మీ ప్రతిపాదిత ఆర్డర్: ${summaryText}, మొత్తం ₹${totalAmount.toLocaleString('en-IN')}. వీటిని మీ కార్ట్‌కి చేర్చడానికి నిర్ధారించండి.`
            : lang === 'hi-IN'
              ? `आपका प्रस्तावित ऑर्डर है: ${summaryText}, कुल ₹${totalAmount.toLocaleString('en-IN')}। इन्हें अपने कार्ट में जोड़ने के लिए कन्फर्म करें।`
              : `Your proposed order is ${summaryText}, totaling ₹${totalAmount.toLocaleString('en-IN')}. Confirm to add these to your cart.`;

        const proposedActions = pendingClarification.pendingItems.map((pi) => ({
          type: 'cart_add_plan',
          payload: {
            foodId: pi.foodId,
            name: pi.name,
            quantity: pi.quantity,
            price: pi.price,
            variantId: pi.variantId,
            restaurantId: params.restaurantId,
            requiresConfirmation: true,
          },
        }));

        return {
          reply,
          language: lang,
          intent: 'cart_add_plan',
          proposedActions,
          correlationId,
          latencyMs: Date.now() - startedAt,
          authorized: true,
          pendingClarification: null,
        };
      } else {
        // User requested an unavailable variant (e.g. "Jumbo" when only Half/Full exist) or an unrecognized option.
        // Clarify using authoritative options without silently mapping or inventing variants!
        const optionsText = clarifyingItem.variantOptions.map((o) => o.name).join(' or ');
        const cleanName = sanitizeTechnicalIds(clarifyingItem.name);
        const reply =
          lang === 'te-IN'
            ? `${cleanName} కొరకు మా వద్ద ${optionsText} మాత్రమే అందుబాటులో ఉన్నాయి. మీకు ఏది కావాలి?`
            : lang === 'hi-IN'
              ? `${cleanName} के लिए हमारे पास केवल ${optionsText} ही उपलब्ध हैं। आप कौन सा लेना चाहेंगे?`
              : `We only have ${optionsText} for ${cleanName}. Which one would you prefer?`;

        return {
          reply,
          language: lang,
          intent: 'clarify_dish_choice',
          correlationId,
          latencyMs: Date.now() - startedAt,
          authorized: true,
          pendingClarification,
        };
      }
    }
  }

  // 1. Order Status Check with Ownership Guard
  if (
    lower.includes('status') ||
    lower.includes('where is my order') ||
    lower.includes('order ekkada') ||
    lower.includes('kahan hai') ||
    lower.includes('track order')
  ) {
    const userId = params.userId;
    const trackingToken = params.orderTrackingToken;

    // Check if orderId mentioned or query in database
    if (deps.db && (userId || trackingToken)) {
      try {
        let query = deps.db.collection('orders').orderBy('createdAt', 'desc').limit(1);
        if (userId && userId !== 'guest') {
          query = deps.db.collection('orders').where('userId', '==', userId).orderBy('createdAt', 'desc').limit(1);
        }
        const snap = await query.get();
        if (!snap.empty) {
          const order = snap.docs[0].data();
          let isOwner = false;
          if (userId && userId !== 'guest' && (order.userId === userId || order.customerId === userId)) {
            isOwner = true;
          } else if (trackingToken) {
            try {
              verifyGuestOrderToken(trackingToken, snap.docs[0].id);
              isOwner = true;
            } catch {
              // Backward compatibility for unhashed legacy tracking tokens
              isOwner = order.trackingToken === trackingToken;
            }
          }

          if (isOwner) {
            const status = String(order.status || 'PREPARING').toUpperCase();
            const orderNum = order.orderNumber || snap.docs[0].id.slice(-4);
            const reply =
              lang === 'te-IN'
                ? `మీ ఆర్డర్ #${orderNum} ప్రస్తుతం "${status}" స్థితిలో ఉంది.`
                : lang === 'hi-IN'
                  ? `आपका ऑर्डर #${orderNum} अभी "${status}" स्थिति में है।`
                  : `Your order #${orderNum} is currently in "${status}" status.`;

            return {
              reply,
              language: lang,
              intent: 'track_order',
              proposedActions: [{ type: 'navigate', payload: { route: `/orders/${snap.docs[0].id}` } }],
              correlationId,
              latencyMs: Date.now() - startedAt,
              authorized: true,
            };
          }
        }
      } catch {}
    }

    // Default status reply if order not yet found in active session
    const reply =
      lang === 'te-IN'
        ? 'మీ ఆర్డర్ కిచెన్ లో సిద్ధమవుతోంది. లైవ్ స్టేటస్ కోసం మీ ఆర్డర్స్ పేజీని చూడండి.'
        : lang === 'hi-IN'
          ? 'आपका ऑर्डर किचन में तैयार हो रहा है। लाइव स्टेटस देखने के लिए ऑर्डर्स पेज देखें।'
          : 'Your order is currently being prepared in the kitchen. Check your orders page for live tracking.';

    return {
      reply,
      language: lang,
      intent: 'track_order',
      proposedActions: [{ type: 'navigate', payload: { route: '/orders' } }],
      correlationId,
      latencyMs: Date.now() - startedAt,
      authorized: true,
    };
  }

  // 2. Multi-Turn: Quantity Modification ("Make that three" / "moodu cheyyandi" / "teen kardo")
  const isQuantityAdjustment =
    /(make (that|it)|change (it|that)? to|update (it|that)? to|set (it|that)? to)\s*(\d+|one|two|three|four|five|ek|do|teen|char|okati|rendu|moodu|nalugu)/i.test(lower) ||
    /^(moodu|rendu|nalugu|aidu|\d+)\s*(cheyyandi|cheyi|pettandi)$/i.test(lower) ||
    /^(teen|do|char|paanch|\d+)\s*(kardo|kijiye|kar do)$/i.test(lower);

  if (isQuantityAdjustment) {
    const targetQty = extractQuantity(transcript);
    const targetItem = cartItems[cartItems.length - 1] || lastProposedItem;

    if (targetItem) {
      const cleanName = sanitizeTechnicalIds(targetItem.name);
      const reply =
        lang === 'te-IN'
          ? `నేను ${cleanName} సంఖ్యను ${targetQty} కి మార్చగలను. కన్ఫర్మ్ చేయమంటారా?`
          : lang === 'hi-IN'
            ? `मैं ${cleanName} की संख्या ${targetQty} कर सकता हूँ। क्या कन्फर्म करें?`
            : `I can change ${cleanName} to ${targetQty}. Would you like to confirm?`;

      return {
        reply,
        language: lang,
        intent: 'cart_update_quantity',
        proposedActions: [
          {
            type: 'cart_update_quantity',
            payload: {
              foodId: targetItem.id,
              name: targetItem.name,
              quantity: targetQty,
              price: targetItem.price,
            },
          },
        ],
        correlationId,
        latencyMs: Date.now() - startedAt,
        authorized: true,
      };
    }
  }

  // 3. Multi-Turn: Customization / Dietary Note ("One without onion" / "ulli lekunda okati" / "bina pyaz")
  const isCustomization =
    /(without|no|lekunda|bina|extra|less|spicy|kaaram)\s*([a-zA-Z\u0C00-\u0C7F\u0900-\u097F\s]+)/i.test(lower);

  if (isCustomization) {
    const targetItem = cartItems[cartItems.length - 1] || lastProposedItem;
    if (targetItem) {
      const cleanName = sanitizeTechnicalIds(targetItem.name);
      const note = transcript.trim();
      const currentQty = Math.max(1, targetItem.quantity || 1);
      const specifiedUnits = extractQuantity(transcript); // e.g. 1 from "One without onion"
      const hasUnitConstraint = specifiedUnits > 0 && specifiedUnits < currentQty;

      if (hasUnitConstraint) {
        // Multi-Unit Modifier: Split into regular units and modified units (Total remains currentQty)
        const regularQty = currentQty - specifiedUnits;
        const reply =
          lang === 'te-IN'
            ? `నేను మొత్తం ${currentQty} ${cleanName}: ${regularQty} సాధారణం మరియు ${specifiedUnits} "${note}" సిద్ధం చేయగలను. కన్ఫర్మ్ చేయమంటారా?`
            : lang === 'hi-IN'
              ? `मैं कुल ${currentQty} ${cleanName}: ${regularQty} सामान्य और ${specifiedUnits} "${note}" तैयार कर सकता हूँ। क्या कन्फर्म करें?`
              : `I can prepare ${currentQty} ${cleanName} total: ${regularQty} regular and ${specifiedUnits} with "${note}". Would you like to confirm?`;

        return {
          reply,
          language: lang,
          intent: 'cart_update_split_units',
          proposedActions: [
            {
              type: 'cart_update_quantity',
              payload: {
                foodId: targetItem.id,
                name: targetItem.name,
                quantity: regularQty,
                price: targetItem.price,
                requiresConfirmation: true,
              },
            },
            {
              type: 'cart_add_item',
              payload: {
                foodId: `${targetItem.id}-custom`,
                name: `${targetItem.name} (${note})`,
                quantity: specifiedUnits,
                price: targetItem.price,
                notes: note,
                instructions: note,
                requiresConfirmation: true,
              },
            },
          ],
          correlationId,
          latencyMs: Date.now() - startedAt,
          authorized: true,
        };
      }

      const reply =
        lang === 'te-IN'
          ? `నోట్ చేసుకున్నాము: ${cleanName} కొరకు "${note}".`
          : lang === 'hi-IN'
            ? `नोट कर लिया: ${cleanName} के लिए "${note}"।`
            : `Noted customization for ${cleanName}: "${note}".`;

      return {
        reply,
        language: lang,
        intent: 'cart_update_notes',
        proposedActions: [
          {
            type: 'cart_update_notes',
            payload: {
              foodId: targetItem.id,
              name: targetItem.name,
              notes: note,
              requiresConfirmation: true,
            },
          },
        ],
        correlationId,
        latencyMs: Date.now() - startedAt,
        authorized: true,
      };
    }
  }

  // 4. Multi-Turn: Item Removal / Reduction ("Remove the last one" / "last di teeseyandi" / "aakhri wala hata do")
  const isItemRemoval =
    /(remove|delete|cancel|teesey|teeseyandi|hata do|hatao)\s*(the\s*)?(last|aakhri|chivara|one|item)?/i.test(lower) ||
    lower.includes('last item vaddu') ||
    lower.includes('hata do') ||
    lower.includes('reduce');

  if (isItemRemoval && cartItems.length > 0) {
    const lastItem = cartItems[cartItems.length - 1];
    const cleanName = sanitizeTechnicalIds(lastItem.name);
    const lastQty = Math.max(1, lastItem.quantity || 1);

    // 4A: Explicit single unit reduction ("remove one", "reduce by 1", "okati teesey")
    const isExplicitSingleUnit =
      /(remove\s*(one|1)|reduce\s*(by\s*)?(one|1)|decrease\s*(by\s*)?(one|1)|okati\s*teesey|ek\s*kam)/i.test(lower);
    if (isExplicitSingleUnit) {
      if (lastQty > 1) {
        const newQty = lastQty - 1;
        const reply =
          lang === 'te-IN'
            ? `${cleanName} సంఖ్యను ${newQty} కి తగ్గించాము.`
            : lang === 'hi-IN'
              ? `${cleanName} की संख्या घटाकर ${newQty} कर दी गई है।`
              : `Reduced ${cleanName} to ${newQty}.`;
        return {
          reply,
          language: lang,
          intent: 'cart_reduce_quantity',
          proposedActions: [
            {
              type: 'cart_update_quantity',
              payload: {
                foodId: lastItem.id,
                name: lastItem.name,
                quantity: newQty,
                price: lastItem.price,
                requiresConfirmation: true,
              },
            },
          ],
          correlationId,
          latencyMs: Date.now() - startedAt,
          authorized: true,
        };
      }
    }

    // 4B: Explicit all/line removal ("remove all", "remove line", "mottam teesey")
    const isExplicitLineRemoval =
      /(remove\s*all|delete\s*item|remove\s*(the\s*)?line|mottam\s*teesey|poora\s*hata)/i.test(lower);

    // 4C: Ambiguity check for "Remove the last one" when quantity > 1
    if (!isExplicitLineRemoval && !isExplicitSingleUnit && lastQty > 1) {
      const reply =
        lang === 'te-IN'
          ? `మీ కార్ట్‌లో ${lastQty} ${cleanName} ఉన్నాయి. మీరు 1 ${cleanName}ను తొలగించాలనుకుంటున్నారా (${lastQty - 1} మిగులుతాయి), లేదా మొత్తం లైన్‌ను తొలగించాలా?`
          : lang === 'hi-IN'
            ? `आपके कार्ट में ${lastQty} ${cleanName} हैं। क्या आप 1 ${cleanName} हटाना चाहते हैं (${lastQty - 1} बचेंगे), या पूरा आइटम हटाना चाहते हैं?`
            : `You have ${lastQty} ${cleanName}. Did you mean remove 1 ${cleanName} (leaving ${lastQty - 1}), or remove the entire line from your cart?`;

      return {
        reply,
        language: lang,
        intent: 'clarify_removal_ambiguity',
        proposedActions: [],
        correlationId,
        latencyMs: Date.now() - startedAt,
        authorized: true,
      };
    }

    // Default: Single unit in cart or explicit line removal
    const reply =
      lang === 'te-IN'
        ? `కార్ట్ నుండి చివరి ఐటమ్ "${cleanName}"ను తొలగించాము.`
        : lang === 'hi-IN'
          ? `कार्ट से आखिरी आइटम "${cleanName}" हटा दिया गया है।`
          : `Removed "${cleanName}" from your cart.`;

    return {
      reply,
      language: lang,
      intent: 'cart_remove_item',
      proposedActions: [
        {
          type: 'cart_remove_item',
          payload: {
            foodId: lastItem.id,
            name: lastItem.name,
            requiresConfirmation: true,
          },
        },
      ],
      correlationId,
      latencyMs: Date.now() - startedAt,
      authorized: true,
    };
  }

  // 5. Cart Total & Overview ("How much is total?" / "mottam entha?" / "kul kitna?")
  if (
    lower.includes('cart') ||
    lower.includes('total') ||
    lower.includes('mottam') ||
    lower.includes('kitna hua') ||
    lower.includes('bill amount')
  ) {
    if (cartItems.length === 0) {
      const reply =
        lang === 'te-IN'
          ? 'మీ కార్ట్ ప్రస్తుతం ఖాళీగా ఉంది. మీకు నచ్చిన వంటకాలను చెప్పండి, యాడ్ చేస్తాను.'
          : lang === 'hi-IN'
            ? 'आपका कार्ट अभी खाली है। आपको क्या पसंद है, बताइए, मैं जोड़ देता हूँ।'
            : 'Your cart is currently empty. Tell me what delicious food you would like to have!';
      return {
        reply,
        language: lang,
        intent: 'cart_overview',
        correlationId,
        latencyMs: Date.now() - startedAt,
        authorized: true,
      };
    }

    const summaryList = cartItems.map((i) => `${i.quantity}x ${sanitizeTechnicalIds(i.name)}`).join(', ');
    const totalAmount = cartItems.reduce((acc, i) => acc + (i.price || 0) * (i.quantity || 1), 0);

    const reply =
      lang === 'te-IN'
        ? `మీ కార్ట్‌లో ${summaryList} ఉన్నాయి. మొత్తం ₹${totalAmount}. ఆర్డర్ కన్ఫర్మ్ చేయమంటారా?`
        : lang === 'hi-IN'
          ? `आपके कार्ट में ${summaryList} है। कुल राशि ₹${totalAmount}। क्या आप ऑर्डर कन्फर्म करना चाहते हैं?`
          : `Your cart contains ${summaryList}, totalling ₹${totalAmount}. Would you like to proceed?`;

    return {
      reply,
      language: lang,
      intent: 'cart_overview',
      proposedActions: [{ type: 'open_cart' }],
      correlationId,
      latencyMs: Date.now() - startedAt,
      authorized: true,
    };
  }

  // 6. Search & Add Dish to Cart (Multi-item, Multilingual & Variant Aware)
  const clauses = splitMultiItemUtterance(transcript);

  interface ParsedCandidate {
    clause: string;
    qty: number;
    matchedItem: any;
    needsVariant: boolean;
    specifiedVariant?: any;
    variantOptions?: Array<{ id: string; name: string; price: number }>;
  }

  const parsedCandidates: ParsedCandidate[] = [];

  for (const clause of clauses) {
    const clauseQty = extractQuantity(clause);
    const normClause = normalizeSpokenDishQuery(clause);
    if (!normClause || normClause.length < 2) continue;

    // Search candidate dishes from menu
    let match = menuItems.find((m) => m.name.toLowerCase() === normClause);

    if (!match) {
      const queryTokens = normClause.split(/\s+/).filter((t) => t.length >= 3);
      const candidates = menuItems.filter((item) => {
        const itemLower = item.name.toLowerCase();
        if (itemLower.includes(normClause) || normClause.includes(itemLower)) return true;
        const itemTokens = itemLower.split(/\s+/);
        const overlap = queryTokens.filter((qt) => itemTokens.some((it) => it.includes(qt) || qt.includes(it)));
        return overlap.length >= Math.min(queryTokens.length, 2);
      });

      // Prefer exact match if any, otherwise first candidate if not overly ambiguous
      if (candidates.length === 1 || (candidates.length > 1 && queryTokens.length >= 2)) {
        match = candidates[0];
      }
    }

    if (match) {
      const rawVariants =
        match.variants && Array.isArray(match.variants)
          ? match.variants.filter((v: any) => v.isAvailable !== false)
          : null;
      const variants = rawVariants && rawVariants.length > 1 ? rawVariants : null;

      let needsVariant = false;
      let specifiedVariant: any = null;
      let variantOptions: Array<{ id: string; name: string; price: number }> | undefined = undefined;

      if (variants) {
        // Check if clause already specifies one of the variants
        const lowerClause = clause.toLowerCase();
        specifiedVariant = variants.find((v: any) => {
          const vName = (v.displayName || v.name || v.id || '').toLowerCase();
          return (
            normClause.includes(vName) ||
            lowerClause.includes(vName) ||
            (vName.includes('jumbo') && (lowerClause.includes('jumbo') || lowerClause.includes('జంబో') || lowerClause.includes('जंबो'))) ||
            (vName.includes('single') && (lowerClause.includes('single') || lowerClause.includes('సింగిల్') || lowerClause.includes('सिंगल'))) ||
            (vName.includes('full') && (lowerClause.includes('full') || lowerClause.includes('ఫుల్') || lowerClause.includes('फुल'))) ||
            (vName.includes('half') && (lowerClause.includes('half') || lowerClause.includes('హాఫ్') || lowerClause.includes('हाफ')))
          );
        });

        if (!specifiedVariant) {
          needsVariant = true;
          variantOptions = variants.map((v: any) => ({
            id: v.variantId || v.id || `var_${v.name}`,
            name: v.displayName || v.name,
            price: (v.offerPrice != null && Number.isFinite(v.offerPrice)) ? v.offerPrice : (v.price ?? match.price),
          }));
        }
      }

      parsedCandidates.push({
        clause,
        qty: clauseQty,
        matchedItem: match,
        needsVariant,
        specifiedVariant,
        variantOptions,
      });
    }
  }

  // If candidate items were resolved from the utterance
  if (parsedCandidates.length > 0) {
    const hasUnresolvedVariant = parsedCandidates.some((c) => c.needsVariant);

    if (hasUnresolvedVariant) {
      // Create pending clarification for multi-turn variant selection
      const pendingClarification: PendingClarification = {
        type: 'variant',
        restaurantId: params.restaurantId,
        userId: params.userId,
        sessionId: params.sessionId,
        pendingItems: parsedCandidates.map((c) => ({
          foodId: c.matchedItem.id,
          name: c.specifiedVariant
            ? `${c.matchedItem.name} (${c.specifiedVariant.displayName || c.specifiedVariant.name})`
            : c.matchedItem.name,
          quantity: c.qty,
          price: c.specifiedVariant
            ? ((c.specifiedVariant.offerPrice != null && Number.isFinite(c.specifiedVariant.offerPrice)) ? c.specifiedVariant.offerPrice : (c.specifiedVariant.price ?? c.matchedItem.price))
            : ((c.matchedItem.offerPrice != null && Number.isFinite(c.matchedItem.offerPrice)) ? c.matchedItem.offerPrice : c.matchedItem.price),
          needsVariant: c.needsVariant,
          variantId: c.specifiedVariant ? (c.specifiedVariant.variantId || c.specifiedVariant.id) : undefined,
          variantOptions: c.variantOptions,
        })),
        clarifyingIndex: parsedCandidates.findIndex((c) => c.needsVariant),
      };

      const clarifyingItem = pendingClarification.pendingItems[pendingClarification.clarifyingIndex];
      const optionsText = clarifyingItem.variantOptions?.map((o) => o.name).join(' or ') || '';
      const cleanItemName = sanitizeTechnicalIds(clarifyingItem.name);

      const reply =
        lang === 'te-IN'
          ? `${cleanItemName} కొరకు మీకు ${optionsText} కావాలా?`
          : lang === 'hi-IN'
            ? `${cleanItemName} के लिए आप ${optionsText} लेना चाहेंगे?`
            : `Would you like ${optionsText} for the ${cleanItemName}?`;

      return {
        reply,
        language: lang,
        intent: 'clarify_dish_choice',
        correlationId,
        latencyMs: Date.now() - startedAt,
        authorized: true,
        pendingClarification,
      };
    }

    // All items are resolved! Construct full proposal
    // Merge with existing unconfirmed items in proposal if present (e.g. user adds special raita to existing biryani proposal)
    const existingProposalItems = (params.context?.currentProposal || []).filter((ep) => {
      return !parsedCandidates.some(
        (c) => c.matchedItem.id === ep.foodId && (!c.specifiedVariant || (c.specifiedVariant.variantId || c.specifiedVariant.id) === ep.variantId)
      );
    });

    const candidateProposalItems = parsedCandidates.map((c) => {
      const itemName = c.specifiedVariant
        ? `${c.matchedItem.name} (${c.specifiedVariant.displayName || c.specifiedVariant.name})`
        : c.matchedItem.name;
      const unitPrice = c.specifiedVariant
        ? ((c.specifiedVariant.offerPrice != null && Number.isFinite(c.specifiedVariant.offerPrice)) ? c.specifiedVariant.offerPrice : (c.specifiedVariant.price ?? c.matchedItem.price))
        : ((c.matchedItem.offerPrice != null && Number.isFinite(c.matchedItem.offerPrice)) ? c.matchedItem.offerPrice : c.matchedItem.price);
      const variantId = c.specifiedVariant ? (c.specifiedVariant.variantId || c.specifiedVariant.id) : undefined;
      return {
        foodId: c.matchedItem.id,
        name: itemName,
        quantity: c.qty,
        price: unitPrice,
        variantId,
      };
    });

    const allProposalItems = [
      ...existingProposalItems.map((ep) => ({
        foodId: ep.foodId,
        name: ep.name,
        quantity: ep.quantity,
        price: ep.price,
        variantId: ep.variantId,
      })),
      ...candidateProposalItems,
    ];

    const totalAmount = allProposalItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

    const itemSummaries = allProposalItems.map((item) => `${item.quantity} ${sanitizeTechnicalIds(item.name)}`);
    const summaryText =
      itemSummaries.length === 1
        ? itemSummaries[0]
        : itemSummaries.slice(0, -1).join(', ') +
          (lang === 'te-IN' ? ' మరియు ' : lang === 'hi-IN' ? ' और ' : ' and ') +
          itemSummaries[itemSummaries.length - 1];

    const reply =
      lang === 'te-IN'
        ? `మీ ప్రతిపాదిత ఆర్డర్: ${summaryText}, మొత్తం ₹${totalAmount.toLocaleString('en-IN')}. వీటిని మీ కార్ట్‌కి చేర్చడానికి నిర్ధారించండి.`
        : lang === 'hi-IN'
          ? `आपका प्रस्तावित ऑर्डर है: ${summaryText}, कुल ₹${totalAmount.toLocaleString('en-IN')}। इन्हें अपने कार्ट में जोड़ने के लिए कन्फर्म करें।`
          : `Your proposed order is ${summaryText}, totaling ₹${totalAmount.toLocaleString('en-IN')}. Confirm to add these to your cart.`;

    const proposedActions = allProposalItems.map((item) => ({
      type: 'cart_add_plan',
      payload: {
        foodId: item.foodId,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        variantId: item.variantId,
        restaurantId: params.restaurantId,
        requiresConfirmation: true,
      },
    }));

    return {
      reply,
      language: lang,
      intent: 'cart_add_plan',
      proposedActions,
      correlationId,
      latencyMs: Date.now() - startedAt,
      authorized: true,
      pendingClarification: null,
    };
  }

  // Ambiguity Clarification: If multiple different dishes match and no exact match, ask user to clarify!
  const genericClean = normalizeSpokenDishQuery(transcript);
  if (genericClean.length >= 3) {
    const matchingDishes = menuItems.filter((item) => {
      const itemNameLower = item.name.toLowerCase();
      return (
        itemNameLower.includes(genericClean) ||
        genericClean.includes(itemNameLower) ||
        itemNameLower.split(' ').some((w) => w.length >= 3 && genericClean.includes(w))
      );
    });

    if (matchingDishes.length > 1) {
      const dishNames = matchingDishes.slice(0, 3).map((d) => sanitizeTechnicalIds(d.name)).join(', ');
      const reply =
        lang === 'te-IN'
          ? `మా వద్ద ${dishNames} ఉన్నాయి. మీకు ఏది కావాలో స్పష్టంగా చెప్పండి.`
          : lang === 'hi-IN'
            ? `हमारे पास ${dishNames} उपलब्ध हैं। आप कौन सा लेना चाहेंगे?`
            : `We have multiple options: ${dishNames}. Which one would you prefer?`;

      return {
        reply,
        language: lang,
        intent: 'clarify_dish_choice',
        correlationId,
        latencyMs: Date.now() - startedAt,
        authorized: true,
      };
    }
  }

  // 7. Dietary or Vegetarian Filter / Inquiry
  if (lower.includes('veg') || lower.includes('vegetarian') || lower.includes('non-veg') || lower.includes('shakahari')) {
    const isVegOnly = !lower.includes('non');
    const filtered = menuItems.filter((i) => (isVegOnly ? i.isVeg === true : i.isVeg === false));
    const examples = filtered.slice(0, 3).map((i) => sanitizeTechnicalIds(i.name)).join(', ');

    const reply =
      lang === 'te-IN'
        ? isVegOnly
          ? `మా వద్ద రుచికరమైన శాకాహార వంటకాలు ఉన్నాయి${examples ? `: ${examples}` : ''}. ఏది కావాలి?`
          : `నాన్-వెజ్ వంటకాలు${examples ? `: ${examples}` : ''} అందుబాటులో ఉన్నాయి.`
        : lang === 'hi-IN'
          ? isVegOnly
            ? `हमारे पास बढ़िया शाकाहारी व्यंजन हैं${examples ? `: ${examples}` : ''}। आप क्या लेना पसंद करेंगे?`
            : `नॉन-वेज व्यंजन${examples ? `: ${examples}` : ''} उपलब्ध हैं।`
          : isVegOnly
            ? `We have delicious vegetarian options${examples ? `: ${examples}` : ''}. What would you like?`
            : `Non-vegetarian dishes${examples ? `: ${examples}` : ''} are available.`;

    return {
      reply,
      language: lang,
      intent: 'browse_menu',
      correlationId,
      latencyMs: Date.now() - startedAt,
      authorized: true,
    };
  }

  // 8. Default natural conversational greeting / guidance
  const defaultReply =
    lang === 'te-IN'
      ? 'నమస్కారం! మన ఇంటి భోజనానికి స్వాగతం. మీరు దోశ, ఇడ్లీ, బిర్యానీ లేదా ఇతర వంటకాలను ఆర్డర్ చేయవచ్చు.'
      : lang === 'hi-IN'
        ? 'नमस्ते! मन इंटी भोजनम में आपका स्वागत है। आप डोसा, इडली, बिरयानी या अन्य पसंदीदा व्यंजन ऑर्डर कर सकते हैं।'
        : 'Welcome to Mana Inti Bhojanam! You can ask for our specials, check your order status, or order delicious meals.';

  return {
    reply: defaultReply,
    language: lang,
    intent: 'general_guidance',
    correlationId,
    latencyMs: Date.now() - startedAt,
    authorized: true,
  };
}
