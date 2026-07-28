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
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.08] bg-[#120d0c]/96 px-3 py-2.5 pb-[max(0.65rem,env(safe-area-inset-bottom))] backdrop-blur-md shadow-[0_-10px_28px_rgba(0,0,0,0.45)]"
      role="status"
      aria-live="polite"
    >
      <GlassCard hoverEffect={false} className="ob-menu-container flex items-center justify-between gap-3 !rounded-2xl !border-[#e85d04]/20 !bg-[#120d0c] !p-2.5">
        <div className="min-w-0">
          <p className="text-sm font-bold text-[#fff8f0]">
            {count} item{count === 1 ? '' : 's'} · ₹{total}
          </p>
          <p className="text-[11px] text-white/45">Taxes at checkout</p>
        </div>
        <SoftButton
          type="button"
          className="!min-h-10 !border-[#e85d04]/50 !bg-[#e85d04] !px-4 !text-[#fff8f0] !shadow-[0_6px_16px_-4px_rgba(232,93,4,0.55)] hover:!bg-[#f0701a]"
          onClick={() => navigate('/cart')}
        >
          View cart
        </SoftButton>
      </GlassCard>
    </div>
  );
}
