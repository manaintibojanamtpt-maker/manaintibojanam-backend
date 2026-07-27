import { Tag } from 'lucide-react';
import { SoftButton } from '../primitives/SoftButton';
import type { CheckoutPromoViewModel } from './types';

export interface CheckoutPromoViewProps {
  readonly promo: CheckoutPromoViewModel;
  readonly onChange: (value: string) => void;
  readonly onApply: () => void;
  readonly onSelectChip: (code: string) => void;
  readonly onClear?: () => void;
}

export function CheckoutPromoView({
  promo,
  onChange,
  onApply,
  onSelectChip,
  onClear,
}: CheckoutPromoViewProps) {
  if (promo.chips.length === 0 && !promo.value && !promo.appliedCode) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4" aria-label="Promo codes">
      <div className="mb-3 flex items-center gap-2">
        <Tag className="h-4 w-4 text-[#e85d04]" aria-hidden />
        <h2 className="text-sm font-bold text-white">Available offers</h2>
      </div>

      {promo.chips.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {promo.chips.map((chip) => {
            const selected = promo.appliedCode === chip.code;
            return (
              <button
                key={chip.code}
                type="button"
                onClick={() => onSelectChip(chip.code)}
                className={`rounded-full border px-3 py-1.5 text-left text-xs font-bold tracking-wider transition-colors ${
                  selected
                    ? 'border-[#e85d04] bg-[#e85d04]/15 text-[#e85d04]'
                    : 'border-white/15 bg-black/30 text-white hover:border-[#e85d04]/40'
                }`}
                aria-pressed={selected}
              >
                <span>{chip.code}</span>
                <span className="ml-2 font-medium normal-case tracking-normal text-white/60">
                  {chip.label}
                  {chip.minOrder && chip.minOrder > 0 ? ` · min ₹${chip.minOrder}` : ''}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="flex gap-2">
        <input
          type="text"
          value={promo.value}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          placeholder="Enter promo code"
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-white placeholder:font-medium placeholder:normal-case placeholder:tracking-normal placeholder:text-white/35"
          aria-label="Promo code"
        />
        <SoftButton
          type="button"
          tone="secondary"
          size="compact"
          disabled={promo.busy || !promo.value.trim()}
          onClick={onApply}
        >
          {promo.busy ? 'Applying…' : 'Apply'}
        </SoftButton>
      </div>

      {promo.appliedCode ? (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
          <p className="text-sm text-emerald-200">
            <span className="font-bold tracking-wider">{promo.appliedCode}</span> applied
          </p>
          {onClear ? (
            <button
              type="button"
              onClick={onClear}
              className="text-xs font-semibold text-emerald-100/80 underline-offset-2 hover:underline"
            >
              Remove
            </button>
          ) : null}
        </div>
      ) : null}

      {promo.hint ? <p className="mt-2 text-xs text-white/50">{promo.hint}</p> : null}
      {promo.error ? (
        <p role="alert" className="mt-2 text-xs text-red-300">
          {promo.error}
        </p>
      ) : null}
    </section>
  );
}
