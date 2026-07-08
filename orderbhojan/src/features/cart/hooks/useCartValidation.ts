import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { getMarketplaceApiClient } from '@/marketplace-api';
import { useCartStore } from '@/features/cart/store/cartStore';
import { useRestaurantContextStore } from '@/features/restaurant/store/restaurantContextStore';
import { useActiveLocation } from '@/features/location';
import { resolveRestaurantCoords } from '@/features/restaurant/engine/restaurantExperienceLayer';

export function useCartValidation() {
  const lines = useCartStore((s) => s.lines);
  const restaurantId = useRestaurantContextStore((s) => s.restaurantId);
  const contextToken = useRestaurantContextStore((s) => s.contextToken);
  const activeLocation = useActiveLocation();

  const mutation = useMutation({
    mutationFn: async () => {
      if (!restaurantId || !contextToken) {
        throw new Error('Restaurant context is missing');
      }
      const coords = resolveRestaurantCoords(activeLocation ?? null);
      return getMarketplaceApiClient().validateCart({
        restaurantId,
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
