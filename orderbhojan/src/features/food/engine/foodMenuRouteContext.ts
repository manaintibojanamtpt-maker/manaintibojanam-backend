/** In-memory menu route slug — survives persist rehydration races on native WebView. */
let activeMenuRouteSlug: string | null = null;

export function setActiveMenuRouteSlug(slug: string | null): void {
  activeMenuRouteSlug = slug?.trim() || null;
}

export function getActiveMenuRouteSlug(): string | null {
  return activeMenuRouteSlug;
}

export function menuRouteRestaurantId(slug: string): string {
  return `obr_${slug}`;
}
