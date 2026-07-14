import { isFeatureEnabled, loadFeatureFlags } from '@/featureFlags';
import { useRestaurantContextStore } from '@/features/restaurant/store/restaurantContextStore';
import { useCartStore } from '@/features/cart/store/cartStore';
import { notifyToast } from '@/shared/providers/BdsToastProvider';

const MOCK_RESTAURANT_SLUGS = new Set([
  'mana-inti-kitchen',
  'demo-biryani-house',
  'demo-dosa-corner',
  'demo-cloud-kitchen',
]);

export const RESTAURANT_SLUG_MISMATCH_TOAST =
  'Your cart was cleared because items can only be ordered from one restaurant at a time.';

/** Clears mock/demo cart + restaurant context when live Firestore sync is active. */
export function sanitizeLiveRestaurantContext(): void {
  const flags = loadFeatureFlags();
  if (!isFeatureEnabled(flags, 'FF_OB_FIRESTORE')) return;

  const ctx = useRestaurantContextStore.getState();
  const staleSyntheticId = ctx.restaurantId?.startsWith('rest_') ?? false;
  const mockSlug = ctx.restaurantSlug ? MOCK_RESTAURANT_SLUGS.has(ctx.restaurantSlug) : false;

  if (staleSyntheticId || mockSlug) {
    useRestaurantContextStore.getState().clear();
  }

  const cart = useCartStore.getState();
  if (cart.restaurantSlug && MOCK_RESTAURANT_SLUGS.has(cart.restaurantSlug)) {
    cart.clear();
  }
}

/**
 * Clears persisted restaurant context and cart when the user opens a different
 * restaurant than the one stored locally. Always warns before clearing.
 */
export function sanitizeRestaurantSlugContext(routeSlug: string): void {
  if (!routeSlug) return;

  const ctx = useRestaurantContextStore.getState();
  const cart = useCartStore.getState();
  const contextMismatch = Boolean(ctx.restaurantSlug && ctx.restaurantSlug !== routeSlug);
  const cartMismatch = Boolean(
    cart.restaurantSlug && cart.restaurantSlug !== routeSlug && cart.lines.length > 0,
  );

  if (!contextMismatch && !cartMismatch) return;

  notifyToast(RESTAURANT_SLUG_MISMATCH_TOAST, 'warning');
  useRestaurantContextStore.getState().clear();
  cart.clear();
}

export function resolveCheckoutRestaurantId(
  restaurantId: string | null,
  restaurantSlug: string | null,
): string {
  if (restaurantId?.startsWith('obr_')) return restaurantId;
  if (restaurantId && !restaurantId.startsWith('rest_')) return restaurantId;
  if (restaurantSlug) return restaurantSlug;
  return restaurantId ?? '';
}
