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
      `${label} must be uploaded to storage — embedded photos cannot be saved. Re-upload the image and try again.`,
    );
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

  return output;
}
