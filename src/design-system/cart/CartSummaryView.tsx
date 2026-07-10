import { GlassCard } from '../primitives/GlassCard';
import type { CartSummaryViewModel } from './types';

export interface CartSummaryViewProps {
  readonly summary: CartSummaryViewModel;
}

export function CartSummaryView({ summary }: CartSummaryViewProps) {
  return (
    <GlassCard hoverEffect={false} className="!rounded-2xl !p-4" aria-label="Cart summary">
      <div className="flex items-baseline justify-between">
        <span className="text-white/80">Subtotal</span>
        <span className="font-bold text-white">{summary.subtotalLabel}</span>
      </div>
      <div className="mt-2 flex items-baseline justify-between border-t border-white/10 pt-3">
        <span className="font-bold text-white">Items</span>
        <span className="text-white/80">{summary.itemCountLabel}</span>
      </div>
    </GlassCard>
  );
}
