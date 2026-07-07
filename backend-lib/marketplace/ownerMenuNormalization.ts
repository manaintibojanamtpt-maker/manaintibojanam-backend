/** Owner menu item payload normalization — shared by server routes and unit tests. */

export const MAX_MENU_IMAGE_CHARS = 900_000;

export function normalizeMenuLabels(raw: unknown) {
  if (!Array.isArray(raw)) return undefined;
  const labels: { kind: string; displayText: string }[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const kind = typeof (entry as { kind?: unknown }).kind === 'string'
      ? (entry as { kind: string }).kind.trim()
      : '';
    const displayText = typeof (entry as { displayText?: unknown }).displayText === 'string'
      ? (entry as { displayText: string }).displayText.trim()
      : '';
    if (!kind || !displayText) continue;
    labels.push({ kind, displayText });
  }
  return labels.length > 0 ? labels : undefined;
}

export function normalizeMenuOffer(raw: unknown) {
  if (!raw || typeof raw !== 'object') return undefined;
  const body = raw as Record<string, unknown>;
  const displayText = typeof body.displayText === 'string' ? body.displayText.trim() : '';
  if (!displayText) return undefined;
  return {
    ...(typeof body.offerId === 'string' ? { offerId: body.offerId } : {}),
    enabled: body.enabled !== false,
    displayText,
    ...(typeof body.badge === 'string' ? { badge: body.badge } : {}),
    ...(typeof body.type === 'string' ? { type: body.type } : {}),
    ...(typeof body.priority === 'number' ? { priority: body.priority } : {}),
    ...(Number.isFinite(Number(body.sellingPrice)) ? { sellingPrice: Number(body.sellingPrice) } : {}),
  };
}

export function normalizeMenuVariants(raw: unknown) {
  if (!Array.isArray(raw)) return undefined;
  const variants: Record<string, unknown>[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const body = entry as Record<string, unknown>;
    const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : '';
    const price = Number(body.price);
    if (!displayName || !Number.isFinite(price) || price < 0) continue;
    variants.push({
      ...(typeof body.variantId === 'string' ? { variantId: body.variantId } : {}),
      kind: typeof body.kind === 'string' ? body.kind : 'custom',
      displayName,
      price,
      ...(Number.isFinite(Number(body.offerPrice)) ? { offerPrice: Number(body.offerPrice) } : {}),
      ...(body.isAvailable === false ? { isAvailable: false } : {}),
      ...(typeof body.sortOrder === 'number' ? { sortOrder: body.sortOrder } : {}),
    });
  }
  return variants.length > 0 ? variants : undefined;
}

export function normalizeMenuAddonGroups(raw: unknown) {
  if (!Array.isArray(raw)) return undefined;
  const groups: Record<string, unknown>[] = [];
  for (const groupEntry of raw) {
    if (!groupEntry || typeof groupEntry !== 'object') continue;
    const group = groupEntry as Record<string, unknown>;
    const displayName = typeof group.displayName === 'string' ? group.displayName.trim() : '';
    if (!displayName || !Array.isArray(group.options)) continue;
    const options: Record<string, unknown>[] = [];
    for (const optionEntry of group.options) {
      if (!optionEntry || typeof optionEntry !== 'object') continue;
      const option = optionEntry as Record<string, unknown>;
      const optionName = typeof option.displayName === 'string' ? option.displayName.trim() : '';
      const price = Number(option.price);
      if (!optionName || !Number.isFinite(price) || price < 0) continue;
      options.push({
        ...(typeof option.optionId === 'string' ? { optionId: option.optionId } : {}),
        kind: typeof option.kind === 'string' ? option.kind : 'custom',
        displayName: optionName,
        price,
        ...(typeof option.maxQuantity === 'number' ? { maxQuantity: option.maxQuantity } : {}),
        ...(typeof option.sortOrder === 'number' ? { sortOrder: option.sortOrder } : {}),
      });
    }
    if (options.length === 0) continue;
    groups.push({
      ...(typeof group.groupId === 'string' ? { groupId: group.groupId } : {}),
      displayName,
      options,
      ...(group.required === true ? { required: true } : {}),
      ...(typeof group.minSelections === 'number' ? { minSelections: group.minSelections } : {}),
      ...(typeof group.maxSelections === 'number' ? { maxSelections: group.maxSelections } : {}),
    });
  }
  return groups.length > 0 ? groups : undefined;
}

export function normalizeMenuItemPayload(body: Record<string, unknown>, tenantId: string) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const category = typeof body.category === 'string' ? body.category.trim() : '';
  const price = Number(body.price);
  const type = body.type === 'non-veg' ? 'non-veg' : 'veg';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const image = typeof body.image === 'string' ? body.image : '';
  const isAvailable = body.isAvailable !== false;
  const categoryId = typeof body.categoryId === 'string' ? body.categoryId.trim() : undefined;

  if (!name || !category || !Number.isFinite(price) || price < 0) {
    const err: Error & { statusCode?: number } = new Error('Name, category, and a valid price are required');
    err.statusCode = 400;
    throw err;
  }
  if (image.length > MAX_MENU_IMAGE_CHARS) {
    const err: Error & { statusCode?: number } = new Error('Image is too large. Use a smaller photo (under 200KB).');
    err.statusCode = 400;
    throw err;
  }

  const result: Record<string, unknown> = {
    tenantId,
    name,
    category,
    price,
    type,
    description,
    image,
    isAvailable,
    ...(categoryId ? { categoryId } : {}),
  };

  const labels = normalizeMenuLabels(body.labels);
  const offer = normalizeMenuOffer(body.offer);
  if (labels) result.labels = labels;
  if (offer) result.offer = offer;

  if ('variants' in body) {
    result.variants = normalizeMenuVariants(body.variants) ?? [];
  }
  if ('addonGroups' in body) {
    result.addonGroups = normalizeMenuAddonGroups(body.addonGroups) ?? [];
  }

  if (typeof body.spiceLevel === 'string') result.spiceLevel = body.spiceLevel;
  if (Number.isFinite(Number(body.preparationMinutes))) {
    result.preparationMinutes = Number(body.preparationMinutes);
  }
  if (typeof body.chefNote === 'string') result.chefNote = body.chefNote.trim();
  if (Array.isArray(body.ingredients)) {
    result.ingredients = body.ingredients.filter((v) => typeof v === 'string');
  }
  if (typeof body.cookingStyle === 'string') result.cookingStyle = body.cookingStyle.trim();
  if (typeof body.servingSize === 'string') result.servingSize = body.servingSize.trim();
  if (typeof body.popularPairing === 'string') result.popularPairing = body.popularPairing.trim();
  if (typeof body.nutritionSummary === 'string') result.nutritionSummary = body.nutritionSummary.trim();
  if (typeof body.allergenSummary === 'string') result.allergenSummary = body.allergenSummary.trim();

  return result;
}
