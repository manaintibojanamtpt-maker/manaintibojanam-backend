/**
 * Sarvam Saaras v4 STT Domain Keyterms & Biasing Helper
 *
 * Implements strict constraints mandated by Sarvam AI for Saaras v4:
 * - Maximum 50 keyterms per request
 * - Maximum 64 characters per term
 * - Case-insensitive deduplication
 * - Fast Firestore retrieval of menu items for active restaurant / tenant
 */

export const BHOJANOS_OPERATIONAL_KEYWORDS: readonly string[] = Object.freeze([
  'Order',
  'Table',
  'KOT',
  'Bill',
  'Cash',
  'UPI',
  'Card',
  'Dine-in',
  'Takeaway',
  'Parcel',
  'Delivery',
  'Ready',
  'Preparing',
  'Dispatched',
  'Cancelled',
  'Accepted',
  'Reject',
  'Discount',
  'Kitchen',
  'Counter',
]);

/**
 * Normalizes, deduplicates, trims, and bounds keyterm arrays for Saaras v4 biasing.
 */
export function sanitizeKeyterms(
  rawInput: unknown,
  maxCount = 50,
  maxChars = 64,
): string[] {
  if (!rawInput) return [];

  let candidates: string[] = [];

  if (Array.isArray(rawInput)) {
    candidates = rawInput.map(item => String(item ?? ''));
  } else if (typeof rawInput === 'string') {
    const trimmed = rawInput.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          candidates = parsed.map(item => String(item ?? ''));
        }
      } catch {
        candidates = trimmed.split(',');
      }
    } else {
      candidates = trimmed.split(',');
    }
  }

  const seen = new Set<string>();
  const sanitized: string[] = [];

  for (const candidate of candidates) {
    // Strip control characters, excessive whitespace
    const clean = candidate.replace(/[\r\n\t\0]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!clean) continue;

    // Cap at maxChars (default 64)
    const truncated = clean.length > maxChars ? clean.slice(0, maxChars).trim() : clean;
    if (!truncated) continue;

    const lower = truncated.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      sanitized.push(truncated);
      if (sanitized.length >= maxCount) {
        break;
      }
    }
  }

  return sanitized;
}

/**
 * Loads active dish names for a restaurant or tenant to bias STT transcription towards real menu items.
 */
export async function fetchRestaurantDishesKeyterms(
  db: any,
  restaurantIdOrSlug: string,
  maxDishes = 40,
): Promise<string[]> {
  if (!db || !restaurantIdOrSlug || typeof restaurantIdOrSlug !== 'string') {
    return [];
  }

  const target = restaurantIdOrSlug.trim();
  if (!target) return [];

  try {
    const dishNames: string[] = [];

    // Check menu by tenantId
    let snapshot = await db.collection('menu').where('tenantId', '==', target).limit(maxDishes).get().catch(() => null);

    // If empty, check by restaurantId
    if (!snapshot || snapshot.empty) {
      snapshot = await db.collection('menu').where('restaurantId', '==', target).limit(maxDishes).get().catch(() => null);
    }

    if (snapshot && !snapshot.empty) {
      for (const doc of snapshot.docs) {
        const data = doc.data();
        if (data.isAvailable === false || data.available === false) continue;
        const name = data.name || data.title || data.dishName;
        if (typeof name === 'string' && name.trim()) {
          dishNames.push(name.trim());
        }
      }
    }

    return dishNames;
  } catch (err: any) {
    console.warn(`[VoiceKeyterms] Failed to fetch menu items for ${target}:`, err?.message || err);
    return [];
  }
}
