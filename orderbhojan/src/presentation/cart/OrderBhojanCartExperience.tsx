import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartEmptyView, CartPageView } from '@bhojan/storefront-design-system/cart/CartPageView';
import type { CartLineViewModel } from '@bhojan/storefront-design-system/cart/types';
import type { CartLine } from '@/features/cart/store/cartStore';
import {
  cartItemCount,
  cartSubtotal,
  formatCartLineTotal,
  useCartStore,
} from '@/features/cart/store/cartStore';
import { useCartValidation } from '@/features/cart/hooks/useCartValidation';

function formatRestaurantLabel(slug: string): string {
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function mapLineToViewModel(line: CartLine): CartLineViewModel {
  return {
    lineId: line.lineId,
    name: line.name,
    variantLabel: line.variantLabel,
    addons: line.addons,
    instructions: line.instructions,
    priceLabel: `₹${line.price} each`,
    totalLabel: formatCartLineTotal(line),
    quantity: line.quantity,
  };
}

export function OrderBhojanCartExperience() {
  const navigate = useNavigate();
  const lines = useCartStore((s) => s.lines);
  const restaurantSlug = useCartStore((s) => s.restaurantSlug);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const clear = useCartStore((s) => s.clear);
  const itemCount = cartItemCount(lines);
  const subtotal = cartSubtotal(lines);
  const { validate, isValidating, result, error, reset } = useCartValidation();

  const restaurantLabel = useMemo(
    () =>
      restaurantSlug ?? lines[0]?.restaurantSlug
        ? formatRestaurantLabel(restaurantSlug ?? lines[0]!.restaurantSlug)
        : null,
    [lines, restaurantSlug],
  );

  useEffect(() => {
    if (itemCount === 0) {
      reset();
    }
  }, [itemCount, reset]);

  const handleCheckout = async () => {
    try {
      const validation = await validate();
      if (!validation.valid) {
        return;
      }
      navigate('/checkout');
    } catch {
      // error surfaced via hook
    }
  };

  if (itemCount === 0) {
    return <CartEmptyView onBrowse={() => navigate('/')} />;
  }

  const slug = restaurantSlug ?? lines[0]?.restaurantSlug;
  const validationMessages =
    result && !result.valid ? result.issues.map((issue) => issue.message) : [];
  const errorMessage =
    error === 'Restaurant not found'
      ? 'This kitchen is not available for checkout. Clear your cart, pick a live restaurant from home, and add items again.'
      : error ?? undefined;

  return (
    <CartPageView
      title="Your cart"
      subtitle={`${itemCount} item${itemCount === 1 ? '' : 's'} · Subtotal ₹${subtotal}`}
      lines={lines.map(mapLineToViewModel)}
      restaurant={
        restaurantLabel && slug
          ? {
              name: restaurantLabel,
              meta: 'Ordering from this kitchen',
              menuActionLabel: 'Menu',
            }
          : undefined
      }
      summary={{
        subtotalLabel: `₹${subtotal}`,
        itemCountLabel: String(itemCount),
      }}
      validationMessages={validationMessages}
      errorMessage={errorMessage}
      checkoutLabel={isValidating ? 'Checking cart…' : 'Proceed to checkout'}
      checkoutBusy={isValidating}
      onCheckout={() => void handleCheckout()}
      onBrowse={() => navigate('/')}
      onClear={clear}
      onMenu={slug ? () => navigate(`/restaurant/${slug}/menu`) : undefined}
      onQuantityChange={setQuantity}
    />
  );
}
