import { GlassCard } from '../primitives/GlassCard';
import type { CartSummaryViewModel } from './types';

export interface CartSummaryViewProps {
  readonly summary: CartSummaryViewModel;
}

export function CartSummaryView({ summary }: CartSummaryViewProps) {
  return (
    <GlassCard hoverEffect={false} className="!rounded-2xl !border-white/[0.08] !bg-[#120d0c] !p-4" aria-label="Cart summary">
      <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#c4b5a5]">Order summary</p>
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-[#c4b5a5]">Subtotal</span>
        <span className="text-base font-bold text-[#fff8f0]">{summary.subtotalLabel}</span>
      </div>
      <div className="mt-3 flex items-baseline justify-between border-t border-white/[0.08] pt-3">
        <span className="text-sm font-semibold text-[#fff8f0]">Items</span>
        <span className="text-sm font-bold text-[#f4a261]">{summary.itemCountLabel}</span>
      </div>
    </GlassCard>
  );
}
