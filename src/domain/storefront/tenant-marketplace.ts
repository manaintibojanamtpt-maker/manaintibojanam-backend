/**
 * Tenant marketplace embed — Sprint 19 storefront projection (PX6.1B-lite).
 * Stored on `tenants/{slug}.marketplace`.
 */

export interface TenantMarketplaceLabel {
  readonly kind: string;
  readonly displayText: string;
}

export interface TenantMarketplaceOffer {
  readonly offerId: string;
  readonly enabled: boolean;
  /** Short campaign title — e.g. "Diwali Feast" */
  readonly title?: string;
  /** Customer-facing discount copy — e.g. "20% off orders above ₹499" */
  readonly displayText: string;
  readonly badge?: string;
  readonly description?: string;
  readonly validFrom?: string;
  readonly validTo?: string;
  readonly priority?: number;
  readonly type?: string;
}

export interface TenantMarketplaceGalleryItem {
  readonly galleryId: string;
  readonly url: string;
  readonly caption?: string;
  readonly sortOrder: number;
}

export interface TenantMarketplaceHighlight {
  readonly id: string;
  readonly title: string;
  readonly subtitle?: string;
}

export interface TenantMarketplacePolicy {
  readonly id: string;
  readonly title: string;
  readonly body: string;
}

export interface TenantMarketplaceTheme {
  readonly primaryColor?: string;
  readonly secondaryColor?: string;
  readonly highlightColor?: string;
  readonly logoUrl?: string;
  readonly coverUrl?: string;
}

export interface TenantMarketplaceBusinessHours {
  readonly todayHoursLabel?: string;
  readonly weeklyHours?: readonly {
    readonly day: string;
    readonly open: string;
    readonly close: string;
    readonly closed?: boolean;
    readonly isToday?: boolean;
  }[];
}

export interface TenantMarketplaceProjection {
  readonly publicRestaurantId?: string;
  readonly tagline?: string;
  readonly description?: string;
  readonly cuisineTags?: readonly string[];
  readonly priceBandLabel?: string;
  readonly priceForTwo?: number;
  readonly rating?: number;
  readonly ratingCount?: number;
  readonly deliveryFee?: number | null;
  readonly featuredFoodIds?: readonly string[];
  readonly todaysSpecialFoodIds?: readonly string[];
  readonly gallery?: readonly TenantMarketplaceGalleryItem[];
  readonly offers?: readonly TenantMarketplaceOffer[];
  readonly highlights?: readonly TenantMarketplaceHighlight[];
  readonly policies?: readonly TenantMarketplacePolicy[];
  readonly theme?: TenantMarketplaceTheme;
  readonly businessHours?: TenantMarketplaceBusinessHours;
}

export function parseTenantMarketplace(raw: unknown): TenantMarketplaceProjection | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const body = raw as Record<string, unknown>;
  const gallery = parseGallery(body.gallery);
  const offers = parseOffers(body.offers);
  return {
    publicRestaurantId:
      typeof body.publicRestaurantId === 'string' ? body.publicRestaurantId : undefined,
    tagline: typeof body.tagline === 'string' ? body.tagline : undefined,
    description: typeof body.description === 'string' ? body.description : undefined,
    cuisineTags: asStringArray(body.cuisineTags),
    priceBandLabel: typeof body.priceBandLabel === 'string' ? body.priceBandLabel : undefined,
    priceForTwo: asNumber(body.priceForTwo),
    rating: asNumber(body.rating),
    ratingCount: asNumber(body.ratingCount),
    deliveryFee: body.deliveryFee === null ? null : asNumber(body.deliveryFee),
    featuredFoodIds: asStringArray(body.featuredFoodIds),
    todaysSpecialFoodIds: asStringArray(body.todaysSpecialFoodIds),
    gallery,
    offers,
    highlights: parseHighlights(body.highlights),
    policies: parsePolicies(body.policies),
    theme: parseTheme(body.theme),
    businessHours: parseBusinessHours(body.businessHours),
  };
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value.filter((entry): entry is string => typeof entry === 'string');
  return items.length > 0 ? items : undefined;
}

function parseGallery(raw: unknown): TenantMarketplaceGalleryItem[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const items: TenantMarketplaceGalleryItem[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const body = entry as Record<string, unknown>;
    const url = typeof body.url === 'string' ? body.url : '';
    const galleryId = typeof body.galleryId === 'string' ? body.galleryId : '';
    if (!url || !galleryId) continue;
    items.push({
      galleryId,
      url,
      caption: typeof body.caption === 'string' ? body.caption : undefined,
      sortOrder: asNumber(body.sortOrder) ?? items.length,
    });
  }
  return items.length > 0 ? items.sort((a, b) => a.sortOrder - b.sortOrder) : undefined;
}

function parseOffers(raw: unknown): TenantMarketplaceOffer[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const items: TenantMarketplaceOffer[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const body = entry as Record<string, unknown>;
    const displayText = typeof body.displayText === 'string' ? body.displayText.trim() : '';
    if (!displayText) continue;
    items.push({
      offerId: typeof body.offerId === 'string' ? body.offerId : `offer_${items.length}`,
      enabled: body.enabled !== false,
      title: typeof body.title === 'string' ? body.title.trim() : undefined,
      displayText,
      badge: typeof body.badge === 'string' ? body.badge.trim() : undefined,
      description: typeof body.description === 'string' ? body.description : undefined,
      validFrom: typeof body.validFrom === 'string' ? body.validFrom.trim() : undefined,
      validTo: typeof body.validTo === 'string' ? body.validTo.trim() : undefined,
      priority: asNumber(body.priority) ?? items.length,
      type: typeof body.type === 'string' ? body.type : undefined,
    });
  }
  return items.length > 0 ? items : undefined;
}

function parseHighlights(raw: unknown): TenantMarketplaceHighlight[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const items: TenantMarketplaceHighlight[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const body = entry as Record<string, unknown>;
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const id = typeof body.id === 'string' ? body.id : '';
    if (!title || !id) continue;
    items.push({
      id,
      title,
      subtitle: typeof body.subtitle === 'string' ? body.subtitle : undefined,
    });
  }
  return items.length > 0 ? items : undefined;
}

function parsePolicies(raw: unknown): TenantMarketplacePolicy[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const items: TenantMarketplacePolicy[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const body = entry as Record<string, unknown>;
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const id = typeof body.id === 'string' ? body.id : '';
    const policyBody = typeof body.body === 'string' ? body.body.trim() : '';
    if (!title || !id || !policyBody) continue;
    items.push({ id, title, body: policyBody });
  }
  return items.length > 0 ? items : undefined;
}

function parseTheme(raw: unknown): TenantMarketplaceTheme | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const body = raw as Record<string, unknown>;
  return {
    primaryColor: typeof body.primaryColor === 'string' ? body.primaryColor : undefined,
    secondaryColor: typeof body.secondaryColor === 'string' ? body.secondaryColor : undefined,
    highlightColor: typeof body.highlightColor === 'string' ? body.highlightColor : undefined,
    logoUrl: typeof body.logoUrl === 'string' ? body.logoUrl : undefined,
    coverUrl: typeof body.coverUrl === 'string' ? body.coverUrl : undefined,
  };
}

function parseBusinessHours(raw: unknown): TenantMarketplaceBusinessHours | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const body = raw as Record<string, unknown>;
  const weekly = Array.isArray(body.weeklyHours)
    ? body.weeklyHours
        .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object')
        .map((entry) => ({
          day: typeof entry.day === 'string' ? entry.day : '',
          open: typeof entry.open === 'string' ? entry.open : '',
          close: typeof entry.close === 'string' ? entry.close : '',
          closed: entry.closed === true,
          isToday: entry.isToday === true,
        }))
        .filter((entry) => entry.day)
    : undefined;
  return {
    todayHoursLabel:
      typeof body.todayHoursLabel === 'string' ? body.todayHoursLabel : undefined,
    weeklyHours: weekly && weekly.length > 0 ? weekly : undefined,
  };
}
