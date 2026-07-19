/** Reject oversized inline images — Firestore documents cap at ~1MB. */
const MAX_INLINE_DATA_URL_CHARS = 512;

export class MarketplaceMediaValidationError extends Error {
  readonly statusCode = 400;

  constructor(message: string) {
    super(message);
    this.name = 'MarketplaceMediaValidationError';
  }
}

function assertSafeMediaUrl(url: unknown, label: string): string | undefined {
  if (url === undefined || url === null || url === '') return undefined;
  if (typeof url !== 'string') {
    throw new MarketplaceMediaValidationError(`${label} must be a URL string.`);
  }
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('data:') && trimmed.length > MAX_INLINE_DATA_URL_CHARS) {
    throw new MarketplaceMediaValidationError(
      `${label} is too large to store inline. Upload the image using the gallery upload button so it is saved to cloud storage.`,
    );
  }
  if (trimmed.startsWith('data:')) {
    throw new MarketplaceMediaValidationError(
      `${label} must be uploaded through the gallery upload button. Theme colors and text can be saved without images.`,
    );
  }
  if (!/^https?:\/\//i.test(trimmed) && !trimmed.startsWith('/api/marketplace/media/')) {
    throw new MarketplaceMediaValidationError(`${label} must be a public image URL.`);
  }
  return trimmed;
}

export function sanitizeMarketplacePayload(marketplace: unknown): Record<string, unknown> | undefined {
  if (!marketplace || typeof marketplace !== 'object' || Array.isArray(marketplace)) {
    return undefined;
  }

  const input = marketplace as Record<string, unknown>;
  const output: Record<string, unknown> = { ...input };

  if (input.theme && typeof input.theme === 'object' && !Array.isArray(input.theme)) {
    const theme = { ...(input.theme as Record<string, unknown>) };
    const coverUrl = assertSafeMediaUrl(theme.coverUrl, 'Cover image');
    const logoUrl = assertSafeMediaUrl(theme.logoUrl, 'Logo image');
    if (coverUrl !== undefined) theme.coverUrl = coverUrl;
    else delete theme.coverUrl;
    if (logoUrl !== undefined) theme.logoUrl = logoUrl;
    else delete theme.logoUrl;
    output.theme = theme;
  }

  if (Array.isArray(input.gallery)) {
    output.gallery = input.gallery
      .map((entry, index) => {
        if (!entry || typeof entry !== 'object') return null;
        const item = entry as Record<string, unknown>;
        const url = assertSafeMediaUrl(item.url, `Gallery photo ${index + 1}`);
        if (!url) return null;
        return {
          ...item,
          url,
          galleryId: typeof item.galleryId === 'string' ? item.galleryId : `gallery_${index}`,
          sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : index,
        };
      })
      .filter(Boolean);
  }

  if (Array.isArray(input.offers)) {
    output.offers = input.offers
      .slice(0, 5)
      .map((entry, index) => {
        if (!entry || typeof entry !== 'object') return null;
        const item = entry as Record<string, unknown>;
        const displayText =
          typeof item.displayText === 'string' ? item.displayText.trim().slice(0, 120) : '';
        if (!displayText) return null;
        const validFrom =
          typeof item.validFrom === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.validFrom)
            ? item.validFrom
            : undefined;
        const validTo =
          typeof item.validTo === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.validTo)
            ? item.validTo
            : undefined;
        return {
          offerId: typeof item.offerId === 'string' ? item.offerId : `offer_${index}`,
          enabled: item.enabled !== false,
          title:
            typeof item.title === 'string' ? item.title.trim().slice(0, 80) || undefined : undefined,
          displayText,
          badge:
            typeof item.badge === 'string' ? item.badge.trim().slice(0, 40) || undefined : undefined,
          description:
            typeof item.description === 'string'
              ? item.description.trim().slice(0, 200) || undefined
              : undefined,
          validFrom,
          validTo,
          priority: typeof item.priority === 'number' ? item.priority : index,
          type: typeof item.type === 'string' ? item.type.slice(0, 40) : undefined,
        };
      })
      .filter(Boolean);
  }

  return output;
}
