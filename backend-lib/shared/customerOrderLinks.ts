/**
 * Customer-facing order tracking URLs for WhatsApp, email, and push.
 * Never fall back to localhost in production.
 */

const DEFAULT_ORDERBHOJAN_URL = 'https://orderbhojan.web.app';
const DEFAULT_STOREFRONT_URL = 'https://www.bhojanos.com/k/mana-inti';
const DEFAULT_BHOJANOS_URL = 'https://www.bhojanos.com';

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, '');
}

export function getOrderBhojanBaseUrl(): string {
  return stripTrailingSlash(
    process.env.ORDERBHOJAN_URL ||
      process.env.VITE_ORDERBHOJAN_URL ||
      process.env.CUSTOMER_APP_URL ||
      DEFAULT_ORDERBHOJAN_URL,
  );
}

export function getStorefrontBaseUrl(tenantSlug?: string | null): string {
  const slug = (tenantSlug ?? '').trim().toLowerCase();
  if (slug === 'mana-inti') {
    return stripTrailingSlash(
      process.env.FOUNDER_STOREFRONT_URL ||
        process.env.MANA_INTI_STOREFRONT_URL ||
        DEFAULT_STOREFRONT_URL,
    );
  }
  const bhojanos = stripTrailingSlash(process.env.PUBLIC_APP_URL || DEFAULT_BHOJANOS_URL);
  return slug ? `${bhojanos}/k/${encodeURIComponent(slug)}` : bhojanos;
}

export function isMarketplaceOrder(order: Record<string, unknown>): boolean {
  const source = String(order.source ?? '').toLowerCase();
  if (source.includes('marketplace')) return true;
  if (order.contextToken) return true;
  return false;
}

export function buildCustomerOrderTrackingUrl(order: Record<string, unknown>): string {
  const orderId = String(order.id ?? order.orderId ?? '').trim();
  if (!orderId) {
    return getOrderBhojanBaseUrl();
  }

  if (isMarketplaceOrder(order)) {
    return `${getOrderBhojanBaseUrl()}/orders/${encodeURIComponent(orderId)}/track`;
  }

  const tenantSlug =
    typeof order.tenantSlug === 'string'
      ? order.tenantSlug
      : typeof order.tenantId === 'string'
        ? order.tenantId
        : 'mana-inti';

  const storefront = getStorefrontBaseUrl(tenantSlug);
  return `${storefront}/order/${encodeURIComponent(orderId)}`;
}

export function getCustomerAppName(order: Record<string, unknown>): string {
  return isMarketplaceOrder(order) ? 'OrderBhojan' : 'Mana Inti Bojanam';
}
