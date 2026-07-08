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

export function deliveryPartnerLabel(partner: unknown): string {
  if (typeof partner === 'string') return partner.trim();
  if (partner && typeof partner === 'object') {
    const record = partner as { name?: unknown; label?: unknown };
    if (typeof record.name === 'string' && record.name.trim()) return record.name.trim();
    if (typeof record.label === 'string' && record.label.trim()) return record.label.trim();
  }
  return '';
}

export function isThirdPartyDeliveryPartner(partner: unknown): boolean {
  const value = deliveryPartnerLabel(partner).toLowerCase();
  if (!value) return false;
  if (value.includes('self') || value.includes('manual') || value.includes('own') || value.includes('pickup')) {
    return false;
  }
  return THIRD_PARTY_KEYWORDS.some((keyword) => value.includes(keyword));
}

export function getTrackingUrl(order: { trackingUrl?: string; trackingLink?: string }): string | undefined {
  return order.trackingUrl || order.trackingLink;
}
