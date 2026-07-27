import { UtensilsCrossed } from 'lucide-react';
import { GlassCard } from '../primitives/GlassCard';
import { QuantityStepperView } from '../primitives/QuantityStepperView';
import type { CartLineViewModel } from './types';

export interface CartLineViewProps {
  readonly line: CartLineViewModel;
  readonly onQuantityChange: (lineId: string, quantity: number) => void;
}

export function CartLineView({ line, onQuantityChange }: CartLineViewProps) {
  const addons = line.addons ?? [];

  return (
    <li>
      <GlassCard hoverEffect={false} className="!rounded-2xl !p-3">
        <div className="grid grid-cols-[auto_1fr_auto] items-start gap-3">
          <div
            className="flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-xl border border-[#e85d04]/15 bg-[#e85d04]/10 text-[#e85d04]"
            aria-hidden
          >
            <UtensilsCrossed className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex flex-col gap-1">
            <p className="font-bold leading-tight text-[#fff8f0]">{line.name}</p>
            {line.variantLabel ? (
              <p className="text-sm text-[#c4b5a5]">{line.variantLabel}</p>
            ) : null}
            {addons.length > 0 ? (
              <div className="mt-0.5 flex flex-wrap gap-1">
                {addons.map((addon) => (
                  <span
                    key={addon.id}
                    className="rounded-full border border-[#e85d04]/15 bg-[#e85d04]/10 px-2 py-0.5 text-[11px] font-semibold text-[#c4b5a5]"
                  >
                    + {addon.label}
                    {addon.price > 0 ? ` (₹${addon.price})` : ''}
                  </span>
                ))}
              </div>
            ) : null}
            {line.instructions?.trim() ? (
              <p className="text-sm italic text-[#c4b5a5]">Note: {line.instructions.trim()}</p>
            ) : null}
            <p className="text-sm text-[#c4b5a5]">
              {line.priceLabel} · {line.totalLabel}
            </p>
          </div>
          <div className="self-center">
            <QuantityStepperView
              value={line.quantity}
              ariaLabel={`Quantity for ${line.name}`}
              onChange={(next) => onQuantityChange(line.lineId, next)}
            />
          </div>
        </div>
      </GlassCard>
    </li>
  );
}
