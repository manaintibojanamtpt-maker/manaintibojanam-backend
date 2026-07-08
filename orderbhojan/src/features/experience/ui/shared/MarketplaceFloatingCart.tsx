import { useNavigate } from 'react-router-dom';
import { FloatingCart } from '@bhojan/design-system';
import { cartItemCount, cartSubtotal, useCartStore } from '@/features/cart/store/cartStore';

export function MarketplaceFloatingCart() {
  const navigate = useNavigate();
  const lines = useCartStore((s) => s.lines);
  const visible = useCartStore((s) => s.visible);
  const count = cartItemCount(lines);
  const total = cartSubtotal(lines);

  if (!visible || count <= 0) {
    return null;
  }

  return (
    <div className="ob-floating-cart-wrap ob-floating-cart-wrap--enter">
      <FloatingCart
        itemCount={count}
        total={`₹${total}`}
        label="View Cart"
        onCheckout={() => navigate('/cart')}
      />
    </div>
  );
}
