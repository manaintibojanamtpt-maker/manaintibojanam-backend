import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMarketplaceApiClient } from '@/marketplace-api';
import { buildCartLineId, useCartStore } from '@/features/cart/store/cartStore';
import { useRestaurantContextStore } from '@/features/restaurant/store/restaurantContextStore';
import { resolveRestaurantCoords } from '@/features/restaurant/engine/restaurantExperienceLayer';
import { useActiveLocation } from '@/features/location';
import { notifyToast } from '@/shared/providers/BdsToastProvider';
import type { OrderTrackingResponse } from '@/types/marketplace';

export function useReorderFromTracking() {
  const navigate = useNavigate();
  const activeLocation = useActiveLocation();
  const [busy, setBusy] = useState(false);

  const reorder = async (payload: NonNullable<OrderTrackingResponse['reorder']>) => {
    setBusy(true);
    try {
      const coords = resolveRestaurantCoords(activeLocation);
      const experience = await getMarketplaceApiClient().restaurantExperience(payload.restaurantSlug, coords);
      useRestaurantContextStore.getState().setContext({
        restaurantId: payload.restaurantId,
        restaurantSlug: payload.restaurantSlug,
        contextToken: experience.contextToken,
      });

      const lines = payload.items.map((item) => ({
        lineId: buildCartLineId({ foodId: item.itemId }),
        foodId: item.itemId,
        name: item.name,
        price: item.unitPrice,
        quantity: item.quantity,
        restaurantSlug: payload.restaurantSlug,
        restaurantId: payload.restaurantId,
      }));

      useCartStore.setState({
        restaurantSlug: payload.restaurantSlug,
        lines,
        visible: true,
      });

      notifyToast('Items added to cart from your previous order.', 'success');
      navigate('/cart');
    } catch {
      notifyToast('Could not reorder right now. Open the restaurant menu instead.', 'danger');
      navigate(`/restaurant/${payload.restaurantSlug}/menu`);
    } finally {
      setBusy(false);
    }
  };

  return { reorder, busy };
}
