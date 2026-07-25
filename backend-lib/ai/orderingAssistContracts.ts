/**
 * Ordering-context addon for /api/ai/v1/assist — caller-supplied kitchen/menu facts.
 * Gateway does not invent inventory; keep payloads small and sanitized.
 */

export interface OrderingMenuItemFact {
  readonly id?: string;
  readonly name: string;
  readonly price?: number;
  readonly isVeg?: boolean;
}

export interface OrderingKitchenFact {
  readonly id?: string;
  readonly name: string;
  readonly cuisine?: string;
}

export interface OrderingAssistContext {
  readonly restaurantId?: string;
  readonly restaurantName?: string;
  readonly restaurantSlug?: string;
  readonly areaLabel?: string;
  readonly city?: string;
  readonly menuItems?: readonly OrderingMenuItemFact[];
  readonly nearbyKitchens?: readonly OrderingKitchenFact[];
}

function asTrimmedString(value: unknown, maxLen: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLen);
}

function parseMenuItems(raw: unknown): readonly OrderingMenuItemFact[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const items: OrderingMenuItemFact[] = [];
  for (const entry of raw.slice(0, 40)) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
    const obj = entry as Record<string, unknown>;
    const name = asTrimmedString(obj.name, 120);
    if (!name) continue;
    const id = asTrimmedString(obj.id, 128);
    const price =
      typeof obj.price === 'number' && Number.isFinite(obj.price) ? Math.max(0, obj.price) : undefined;
    const isVeg = typeof obj.isVeg === 'boolean' ? obj.isVeg : undefined;
    items.push({
      name,
      ...(id ? { id } : {}),
      ...(price !== undefined ? { price } : {}),
      ...(isVeg !== undefined ? { isVeg } : {}),
    });
  }
  return items.length ? items : undefined;
}

function parseKitchens(raw: unknown): readonly OrderingKitchenFact[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const kitchens: OrderingKitchenFact[] = [];
  for (const entry of raw.slice(0, 24)) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
    const obj = entry as Record<string, unknown>;
    const name = asTrimmedString(obj.name, 120);
    if (!name) continue;
    const id = asTrimmedString(obj.id, 128);
    const cuisine = asTrimmedString(obj.cuisine, 80);
    kitchens.push({
      name,
      ...(id ? { id } : {}),
      ...(cuisine ? { cuisine } : {}),
    });
  }
  return kitchens.length ? kitchens : undefined;
}

/**
 * Parse assist `context` for ordering fields.
 * Accepts nested `{ orderingContext: {...} }` or flat fields alongside orderContext.
 */
export function parseOrderingAssistContext(raw: unknown): {
  readonly used: boolean;
  readonly context: OrderingAssistContext | null;
} {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { used: false, context: null };
  }

  const root = raw as Record<string, unknown>;
  const nested =
    root.orderingContext && typeof root.orderingContext === 'object' && !Array.isArray(root.orderingContext)
      ? (root.orderingContext as Record<string, unknown>)
      : root;

  const restaurantId = asTrimmedString(nested.restaurantId, 128);
  const restaurantName = asTrimmedString(nested.restaurantName, 120);
  const restaurantSlug = asTrimmedString(nested.restaurantSlug, 120);
  const areaLabel = asTrimmedString(nested.areaLabel, 120);
  const city = asTrimmedString(nested.city, 80);
  const menuItems = parseMenuItems(nested.menuItems);
  const nearbyKitchens = parseKitchens(nested.nearbyKitchens);

  if (
    !restaurantId &&
    !restaurantName &&
    !restaurantSlug &&
    !areaLabel &&
    !city &&
    !menuItems &&
    !nearbyKitchens
  ) {
    return { used: false, context: null };
  }

  return {
    used: true,
    context: {
      ...(restaurantId ? { restaurantId } : {}),
      ...(restaurantName ? { restaurantName } : {}),
      ...(restaurantSlug ? { restaurantSlug } : {}),
      ...(areaLabel ? { areaLabel } : {}),
      ...(city ? { city } : {}),
      ...(menuItems ? { menuItems } : {}),
      ...(nearbyKitchens ? { nearbyKitchens } : {}),
    },
  };
}

/** Read-only system prompt addon — ground answers in live facts; plans are proposals only. */
export function buildOrderingSystemAddon(context: OrderingAssistContext): string {
  const facts: string[] = [];
  if (context.restaurantId) facts.push(`activeRestaurantId=${context.restaurantId}`);
  if (context.restaurantName) facts.push(`activeRestaurantName=${context.restaurantName}`);
  if (context.restaurantSlug) facts.push(`activeRestaurantSlug=${context.restaurantSlug}`);
  if (context.areaLabel) facts.push(`area=${context.areaLabel}`);
  if (context.city) facts.push(`city=${context.city}`);

  if (context.nearbyKitchens?.length) {
    const list = context.nearbyKitchens
      .map((k) => {
        const idPart = k.id ? ` [id=${k.id}]` : '';
        return k.cuisine ? `${k.name}${idPart} (${k.cuisine})` : `${k.name}${idPart}`;
      })
      .join('; ');
    facts.push(`nearbyKitchens=[${list}]`);
  }

  if (context.menuItems?.length) {
    const list = context.menuItems
      .map((item) => {
        const bits = [item.name];
        if (item.id) bits.push(`[foodId=${item.id}]`);
        if (item.isVeg === true) bits.push('veg');
        if (item.isVeg === false) bits.push('nonveg');
        if (typeof item.price === 'number') bits.push(`₹${item.price}`);
        return bits.join(' ');
      })
      .join('; ');
    facts.push(`menuItems=[${list}]`);
  }

  return [
    'Ordering help mode: ground answers ONLY in the known facts below when present.',
    'Do not invent restaurants, dishes, prices, or cuisines that are not listed.',
    'If the user mentions only a kitchen name (or fragment) without a dish, list matching nearbyKitchens and suggest navigate to that kitchen or /search?q=... — do NOT invent a cart_add_plan.',
    'If the user asks for available kitchens, list nearbyKitchens from facts (or say none are loaded and suggest Home/Search).',
    'If the user asks for a dish, match menuItems from facts using the EXACT menu spelling and foodId when present.',
    'For add-to-cart requests, emit cart_add_plan with payload { foodId, name, quantity, restaurantId? } using foodId from menuItems facts whenever available — copy the menu name exactly (e.g. Medu Wada not Medu Vada). Never claim the cart was updated.',
    'Checkout/payment/place_order remain blocked; user must confirm plans in the app UI.',
    facts.length > 0
      ? `Known facts: ${facts.join('; ')}.`
      : 'No kitchen/menu snapshot was provided — ask the user to open Home (nearby kitchens), Search, or a restaurant menu, then continue.',
  ].join(' ');
}
