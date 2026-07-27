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
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.08] bg-[#120d0c]/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md shadow-[0_-12px_40px_rgba(0,0,0,0.45)]"
      role="status"
      aria-live="polite"
    >
      <GlassCard hoverEffect={false} className="ob-menu-container flex items-center justify-between gap-4 !rounded-2xl !border-[#e85d04]/15 !bg-[#120d0c] !p-3">
        <div>
          <p className="text-sm font-semibold text-[#fff8f0]">
            {count} item{count === 1 ? '' : 's'}
          </p>
          <p className="text-xs font-bold text-[#f4a261]">₹{total}</p>
        </div>
        <SoftButton
          type="button"
          className="!border-[#e85d04]/50 !bg-[#e85d04] !text-[#fff8f0] !shadow-[0_6px_16px_-4px_rgba(232,93,4,0.55)] hover:!bg-[#f0701a]"
          onClick={() => navigate('/cart')}
        >
          View cart
        </SoftButton>
      </GlassCard>
    </div>
  );
}
