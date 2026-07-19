import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMarketplaceApiClient } from '@/marketplace-api';
import { useCartStore } from '@/features/cart/store/cartStore';
import { useRestaurantContextStore } from '@/features/restaurant/store/restaurantContextStore';
import { hasActiveDeliveryLocation, hasReadyDeliveryLocation, useActiveLocation } from '@/features/location';
import { resolveCheckoutRestaurantId } from '@/lib/sanitizeLiveRestaurantContext';
import { buildCheckoutCartSignature } from '@/features/checkout/infrastructure/checkoutQuoteSession';
import { applyCartValidationResult } from '@/features/cart/domain/applyCartValidationResult';

export function useCartValidation(options?: { enabled?: boolean; autoApply?: boolean }) {
  const enabled = options?.enabled ?? true;
  const autoApply = options?.autoApply ?? true;
  const lines = useCartStore((s) => s.lines);
  const restaurantId = useRestaurantContextStore((s) => s.restaurantId);
  const restaurantSlug = useRestaurantContextStore((s) => s.restaurantSlug);
  const contextToken = useRestaurantContextStore((s) => s.contextToken);
  const appliedCouponCode = useRestaurantContextStore((s) => s.appliedCouponCode);
  const activeLocation = useActiveLocation();
  const [syncMessages, setSyncMessages] = useState<string[]>([]);
  const lastAppliedKeyRef = useRef<string | null>(null);

  const resolvedRestaurantId = resolveCheckoutRestaurantId(restaurantId, restaurantSlug);
  const coords = activeLocation?.coordinates;
  const canValidate =
    enabled &&
    lines.length > 0 &&
    Boolean(resolvedRestaurantId) &&
    Boolean(contextToken) &&
    hasActiveDeliveryLocation(activeLocation) &&
    hasReadyDeliveryLocation(activeLocation) &&
    Boolean(coords);

  const cartSignature = useMemo(() => {
    if (!resolvedRestaurantId || !contextToken) return null;
    return buildCheckoutCartSignature({
      restaurantId: resolvedRestaurantId,
      contextToken,
      lines,
      couponCode: appliedCouponCode,
    });
  }, [appliedCouponCode, contextToken, lines, resolvedRestaurantId]);

  const query = useQuery({
    queryKey: ['cart', 'validate', cartSignature ?? 'inactive'],
    queryFn: async () => {
      if (!resolvedRestaurantId || !contextToken || !coords) {
        throw new Error('Restaurant context is missing');
      }
      return getMarketplaceApiClient().validateCart({
        restaurantId: resolvedRestaurantId,
        contextToken,
        orderType: 'delivery',
        lines: lines.map((line) => ({
          itemId: line.foodId,
          quantity: line.quantity,
          unitPrice: line.price,
          name: line.name,
        })),
        deliveryAddress: { lat: coords.lat, lng: coords.lng },
        ...(appliedCouponCode ? { couponCode: appliedCouponCode } : {}),
      });
    },
    enabled: canValidate && Boolean(cartSignature),
    staleTime: 15_000,
    retry: 1,
  });

  useEffect(() => {
    if (!autoApply || !query.data || !cartSignature) return;
    const applyKey = `${cartSignature}:${query.dataUpdatedAt}:${JSON.stringify(query.data.issues)}`;
    if (lastAppliedKeyRef.current === applyKey) return;
    lastAppliedKeyRef.current = applyKey;
    const messages = applyCartValidationResult(lines, query.data);
    if (messages.length > 0) {
      setSyncMessages(messages);
    }
  }, [autoApply, cartSignature, lines, query.data, query.dataUpdatedAt]);

  useEffect(() => {
    if (lines.length === 0) {
      setSyncMessages([]);
      lastAppliedKeyRef.current = null;
    }
  }, [lines.length]);

  const validate = useCallback(async () => {
    const next = await query.refetch();
    if (next.error) {
      throw next.error;
    }
    return next.data ?? null;
  }, [query]);

  const reset = useCallback(() => {
    setSyncMessages([]);
    lastAppliedKeyRef.current = null;
  }, []);

  const blockingIssues =
    query.data?.issues.filter((issue) => issue.code === 'NOT_FOUND' || issue.code === 'UNAVAILABLE') ??
    [];

  return {
    validate,
    isValidating: query.isFetching,
    isReady: !canValidate || (!query.isFetching && (query.isSuccess || query.isError)),
    isValid: query.data?.valid ?? blockingIssues.length === 0,
    result: query.data ?? null,
    syncMessages,
    error:
      query.error instanceof Error
        ? query.error.message === 'Restaurant not found'
          ? 'This kitchen is not available for checkout. Clear your cart, pick a live restaurant from home, and add items again.'
          : query.error.message
        : null,
    reset,
  };
}
