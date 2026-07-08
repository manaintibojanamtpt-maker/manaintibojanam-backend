import { isFeatureEnabled, loadFeatureFlags } from '@/featureFlags';
import { useRestaurantContextStore } from '@/features/restaurant/store/restaurantContextStore';
import { useCartStore } from '@/features/cart/store/cartStore';

const MOCK_RESTAURANT_SLUGS = new Set([
  'mana-inti-kitchen',
  'demo-biryani-house',
  'demo-dosa-corner',
  'demo-cloud-kitchen',
]);

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

export function resolveCheckoutRestaurantId(
  restaurantId: string | null,
  restaurantSlug: string | null,
): string {
  if (restaurantId?.startsWith('obr_')) return restaurantId;
  if (restaurantId && !restaurantId.startsWith('rest_')) return restaurantId;
  if (restaurantSlug) return restaurantSlug;
  return restaurantId ?? '';
}
