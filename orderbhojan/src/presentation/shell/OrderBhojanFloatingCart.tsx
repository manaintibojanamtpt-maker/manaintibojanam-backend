import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MarketplaceFloatingCartView } from '@bhojan/storefront-design-system/adapters/marketplace/MarketplaceFloatingCartView';
import { cartItemCount, cartSubtotal, useCartStore } from '@/features/cart/store/cartStore';
import { useCheckoutPrefetch } from '@/features/checkout/hooks/useCheckoutPrefetch';

function formatInr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function OrderBhojanFloatingCart() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const lines = useCartStore((s) => s.lines);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const count = cartItemCount(lines);
  const total = cartSubtotal(lines);
  useCheckoutPrefetch(count > 0);

  const viewLines = useMemo(
    () =>
      lines.map((line) => ({
        id: line.lineId,
        name: line.name,
        priceLabel: formatInr(line.price),
        quantity: line.quantity,
      })),
    [lines],
  );

  const onMenuRoute = /\/restaurant\/[^/]+\/menu(?:\/|$)/.test(pathname);

  return (
    <MarketplaceFloatingCartView
      itemCount={count}
      // Subtotal only — delivery/taxes appear on cart/checkout (never imply grand total here).
      totalLabel={`Items ${formatInr(total)}`}
      lines={viewLines}
      // Kitchen menu owns the View cart stripe; hide the bag FAB there to avoid a double chrome.
      hidden={
        pathname.startsWith('/checkout') ||
        pathname.startsWith('/cart') ||
        onMenuRoute
      }
      onUpdateQuantity={(lineId, quantity) => setQuantity(lineId, quantity)}
      onCheckout={() => navigate('/cart')}
    />
  );
}
