import { useNavigate } from 'react-router-dom';
import { GlassCard } from '@bhojan/storefront-design-system/primitives/GlassCard';
import { SoftButton } from '@bhojan/storefront-design-system/primitives/SoftButton';
import { cartItemCount, cartSubtotal, useCartStore } from '@/features/cart/store/cartStore';

export function OrderBhojanFoodFloatingCart() {
  const navigate = useNavigate();
  const lines = useCartStore((s) => s.lines);
  const count = cartItemCount(lines);
  const total = cartSubtotal(lines);

  if (lines.length === 0) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#030303]/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md"
      role="status"
      aria-live="polite"
    >
      <GlassCard hoverEffect={false} className="mx-auto flex max-w-3xl items-center justify-between gap-4 !rounded-2xl !p-3">
        <div>
          <p className="text-sm font-semibold text-white">
            {count} item{count === 1 ? '' : 's'}
          </p>
          <p className="text-xs text-white/60">₹{total}</p>
        </div>
        <SoftButton type="button" onClick={() => navigate('/cart')}>
          View cart
        </SoftButton>
      </GlassCard>
    </div>
  );
}
