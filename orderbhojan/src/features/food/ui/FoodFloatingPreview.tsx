import { useNavigate } from 'react-router-dom';
import { FloatingCart } from '@bhojan/design-system';
import { cartItemCount, cartSubtotal, useCartStore } from '@/features/cart/store/cartStore';

export function FoodFloatingPreview() {
  const navigate = useNavigate();
  const lines = useCartStore((s) => s.lines);
  const count = cartItemCount(lines);
  const total = cartSubtotal(lines);

  if (lines.length === 0) return null;

  return (
    <div className="ob-food-preview ob-food-px6__preview" role="status" aria-live="polite">
      <FloatingCart
        key={count}
        itemCount={count}
        total={`₹${total}`}
        label="View cart"
        onCheckout={() => navigate('/cart')}
        className="ob-food-preview__bar ob-food-px6__preview-bar ob-food-px6__preview-bar--enter"
      />
    </div>
  );
}
