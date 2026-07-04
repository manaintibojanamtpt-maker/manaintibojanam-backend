import { useNavigate } from 'react-router-dom';
import { FloatingCart } from '@bhojan/design-system';
import { formatCartTotal, useCartPreviewStore } from '../../store/cartPreviewStore';

export function MarketplaceFloatingCart() {
  const navigate = useNavigate();
  const { itemCount, totalPaise, visible } = useCartPreviewStore();

  if (!visible || itemCount <= 0) {
    return null;
  }

  return (
    <div className="ob-floating-cart-wrap ob-floating-cart-wrap--enter">
      <FloatingCart
        itemCount={itemCount}
        total={formatCartTotal(totalPaise)}
        label="View Cart"
        onCheckout={() => navigate('/cart')}
      />
    </div>
  );
}
