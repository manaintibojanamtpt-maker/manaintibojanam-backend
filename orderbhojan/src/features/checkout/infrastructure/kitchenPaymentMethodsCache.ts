/**
 * Persist kitchen-enabled payment methods so checkout paints UPI/COD/Razorpay
 * instantly (Zomato-style) even while prepare is in flight or briefly offline.
 */

const STORAGE_KEY = 'ob_kitchen_payment_methods_v1';
const MAX_AGE_MS = 7 * 24 * 60 * 60_000;
const MAX_ENTRIES = 40;

type Entry = {
  readonly restaurantId: string;
  readonly methods: string[];
  readonly savedAt: number;
};

function readAll(): Entry[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Entry[];
    if (!Array.isArray(parsed)) return [];
    const cutoff = Date.now() - MAX_AGE_MS;
    return parsed.filter(
      (entry) =>
        entry &&
        typeof entry.restaurantId === 'string' &&
        Array.isArray(entry.methods) &&
        entry.savedAt >= cutoff,
    );
  } catch {
    return [];
  }
}

function writeAll(entries: Entry[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // ignore quota
  }
}

export function persistKitchenPaymentMethods(
  restaurantId: string,
  methods: readonly string[],
): void {
  const id = restaurantId.trim();
  if (!id || methods.length === 0) return;
  const normalized = [...new Set(methods.map((m) => m.trim().toLowerCase()).filter(Boolean))];
  if (normalized.length === 0) return;
  const rest = readAll().filter((entry) => entry.restaurantId !== id);
  writeAll([{ restaurantId: id, methods: normalized, savedAt: Date.now() }, ...rest]);
}

export function readKitchenPaymentMethods(restaurantId: string | null | undefined): string[] | null {
  const id = restaurantId?.trim();
  if (!id) return null;
  const match = readAll().find((entry) => entry.restaurantId === id);
  return match?.methods?.length ? [...match.methods] : null;
}
