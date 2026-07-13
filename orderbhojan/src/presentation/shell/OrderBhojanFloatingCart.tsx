import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MarketplaceFloatingCartView } from '@bhojan/storefront-design-system/adapters/marketplace/MarketplaceFloatingCartView';
import { cartItemCount, cartSubtotal, useCartStore } from '@/features/cart/store/cartStore';

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

  return (
    <MarketplaceFloatingCartView
      itemCount={count}
      totalLabel={formatInr(total)}
      lines={viewLines}
      hidden={pathname.startsWith('/checkout') || pathname.startsWith('/cart')}
      onUpdateQuantity={(lineId, quantity) => setQuantity(lineId, quantity)}
      onCheckout={() => navigate('/cart')}
    />
  );
}
