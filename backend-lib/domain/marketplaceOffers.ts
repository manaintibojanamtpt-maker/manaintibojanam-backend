import type { TenantMarketplaceOffer } from './tenant-marketplace.js';

function parseDateOnly(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function isMarketplaceOfferActive(
  offer: TenantMarketplaceOffer,
  now: Date = new Date(),
): boolean {
  if (offer.enabled === false) return false;
  if (!offer.displayText.trim()) return false;

  const today = startOfUtcDay(now);

  if (offer.validFrom) {
    const from = parseDateOnly(offer.validFrom);
    if (from && today < from) return false;
  }
  if (offer.validTo) {
    const to = parseDateOnly(offer.validTo);
    if (to && today > to) return false;
  }

  return true;
}

export function resolveActiveMarketplaceOffers(
  offers: readonly TenantMarketplaceOffer[] | undefined,
  now: Date = new Date(),
): TenantMarketplaceOffer[] {
  if (!offers?.length) return [];
  return offers
    .filter((offer) => isMarketplaceOfferActive(offer, now))
    .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
}

export function resolvePrimaryMarketplaceOfferLabel(
  offer: TenantMarketplaceOffer,
): string {
  return offer.badge?.trim() || offer.displayText.trim();
}
