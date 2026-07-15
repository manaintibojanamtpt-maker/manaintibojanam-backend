import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { getMarketplaceApiClient } from '@/marketplace-api';
import { useCartStore } from '@/features/cart/store/cartStore';
import { useRestaurantContextStore } from '@/features/restaurant/store/restaurantContextStore';
import { hasActiveDeliveryLocation, hasReadyDeliveryLocation, useActiveLocation } from '@/features/location';
import { resolveCheckoutRestaurantId } from '@/lib/sanitizeLiveRestaurantContext';

export function useCartValidation() {
  const lines = useCartStore((s) => s.lines);
  const restaurantId = useRestaurantContextStore((s) => s.restaurantId);
  const restaurantSlug = useRestaurantContextStore((s) => s.restaurantSlug);
  const contextToken = useRestaurantContextStore((s) => s.contextToken);
  const activeLocation = useActiveLocation();

  const mutation = useMutation({
    mutationFn: async () => {
      const resolvedRestaurantId = resolveCheckoutRestaurantId(restaurantId, restaurantSlug);
      if (!resolvedRestaurantId || !contextToken) {
        throw new Error('Restaurant context is missing');
      }
      if (!hasActiveDeliveryLocation(activeLocation)) {
        throw new Error('Set your delivery location before checkout.');
      }
      if (!hasReadyDeliveryLocation(activeLocation)) {
        throw new Error('Confirm your flat or house number before checkout.');
      }
      const coords = activeLocation!.coordinates;
      return getMarketplaceApiClient().validateCart({
        restaurantId: resolvedRestaurantId,
        contextToken,
        orderType: 'delivery',
        lines: lines.map((line) => ({
          itemId: line.foodId,
          quantity: line.quantity,
          unitPrice: line.price,
        })),
        deliveryAddress: { lat: coords.lat, lng: coords.lng },
      });
    },
  });

  const validate = useCallback(() => mutation.mutateAsync(), [mutation]);

  return {
    validate,
    isValidating: mutation.isPending,
    result: mutation.data ?? null,
    error: mutation.error instanceof Error ? mutation.error.message : null,
    reset: mutation.reset,
  };
}
