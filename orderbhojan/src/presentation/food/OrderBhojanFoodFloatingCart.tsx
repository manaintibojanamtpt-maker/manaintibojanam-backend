import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '@bhojan/storefront-design-system/primitives/GlassCard';
import { SoftButton } from '@bhojan/storefront-design-system/primitives/SoftButton';
import { cartItemCount, cartSubtotal, useCartStore } from '@/features/cart/store/cartStore';

/**
 * Viewport-fixed View cart stripe for kitchen menus (FullScreenLayout — no bottom nav).
 * Must portal to document.body — `.ob-menu-page` must not trap `position:fixed`
 * at the end of the scroll content.
 */
export function OrderBhojanFoodFloatingCart() {
  const navigate = useNavigate();
  const lines = useCartStore((s) => s.lines);
  const count = cartItemCount(lines);
  const total = cartSubtotal(lines);

  if (lines.length === 0 || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 z-[95] px-3"
      style={{
        // Menu routes use FullScreenLayout (no marketplace bottom nav).
        bottom: 'max(0.65rem, env(safe-area-inset-bottom, 0px))',
      }}
      role="status"
      aria-live="polite"
      data-testid="ob-menu-view-cart-stripe"
    >
      <div className="pointer-events-auto mx-auto w-full max-w-lg rounded-2xl border border-[#e85d04]/25 bg-[#120d0c]/96 shadow-[0_-10px_28px_rgba(0,0,0,0.45)] backdrop-blur-md">
        <GlassCard
          hoverEffect={false}
          className="ob-menu-container flex items-center justify-between gap-3 !rounded-2xl !border-transparent !bg-transparent !p-2.5"
        >
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
    </div>,
    document.body,
  );
}
