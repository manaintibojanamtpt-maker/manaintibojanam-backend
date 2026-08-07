/**
 * Marketplace public restaurant IDs are often `obr_{tenantSlug}`.
 * Slug APIs require the bare tenant slug — never pass the obr_ form.
 */

export function stripObrRestaurantPrefix(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed.replace(/^obr[_-]/i, '');
}

/**
 * Prefer an explicit slug; otherwise derive from restaurantId by stripping obr_.
 */
export function resolveRestaurantSlugForApi(input: {
  readonly restaurantId?: string | null;
  readonly restaurantSlug?: string | null;
}): string {
  const slug = input.restaurantSlug?.trim();
  if (slug && !/^obr[_-]/i.test(slug)) return slug;
  if (slug) return stripObrRestaurantPrefix(slug);
  return stripObrRestaurantPrefix(input.restaurantId ?? '');
}

export function toPendingPlanRestaurantRef(input: {
  readonly planRestaurantId: string;
  readonly activeRestaurantId?: string | null;
  readonly activeRestaurantSlug?: string | null;
  /** Authoritative slug from marketplace search — never invent from display name. */
  readonly knownRestaurantSlug?: string | null;
}): { restaurantId: string; restaurantSlug: string } {
  const restaurantId = input.planRestaurantId.trim();
  const sameAsActive =
    Boolean(input.activeRestaurantId) && restaurantId === input.activeRestaurantId;
  const restaurantSlug = resolveRestaurantSlugForApi({
    restaurantId,
    restaurantSlug:
      input.knownRestaurantSlug?.trim() ||
      (sameAsActive ? input.activeRestaurantSlug : null),
  });
  return { restaurantId, restaurantSlug };
}
