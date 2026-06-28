export const DELIVERY_PARTNER_OPTIONS = [
  'Porter',
  'Rapido',
  'Dunzo',
  'Shadowfax',
  'Shadowfox',
  'Uber',
  'Self Pickup',
  'Manual / Own Delivery',
] as const;

const THIRD_PARTY_KEYWORDS = ['porter', 'rapido', 'dunzo', 'shadowfax', 'shadowfox', 'uber'];

export function isThirdPartyDeliveryPartner(partner?: string | null): boolean {
  if (!partner) return false;
  const value = partner.toLowerCase();
  if (value.includes('self') || value.includes('manual') || value.includes('own') || value.includes('pickup')) {
    return false;
  }
  return THIRD_PARTY_KEYWORDS.some((keyword) => value.includes(keyword));
}

export function getTrackingUrl(order: { trackingUrl?: string; trackingLink?: string }): string | undefined {
  return order.trackingUrl || order.trackingLink;
}
