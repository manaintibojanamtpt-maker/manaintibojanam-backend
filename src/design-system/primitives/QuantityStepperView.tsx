import { Check } from 'lucide-react';

export interface QuantityStepperViewProps {
  readonly value: number;
  readonly min?: number;
  readonly max?: number;
  readonly ariaLabel: string;
  readonly onChange: (value: number) => void;
  readonly className?: string;
}

export function QuantityStepperView({
  value,
  min = 1,
  max = 99,
  ariaLabel,
  onChange,
  className = '',
}: QuantityStepperViewProps) {
  const decrease = () => onChange(Math.max(min, value - 1));
  const increase = () => onChange(Math.min(max, value + 1));

  return (
    <div
      className={`inline-flex h-11 items-center gap-3 rounded-full border border-[#FF7A00]/30 bg-[#2A1A12] px-2 ${className}`.trim()}
      role="group"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        className="flex h-8 w-8 items-center justify-center rounded-full text-[#F4C27A] transition hover:bg-white/10 disabled:opacity-40"
        onClick={decrease}
        disabled={value <= min}
        aria-label="Decrease quantity"
      >
        −
      </button>
      <span className="min-w-[2ch] text-center text-sm font-black tabular-nums text-white" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className="flex h-8 w-8 items-center justify-center rounded-full text-[#F4C27A] transition hover:bg-white/10 disabled:opacity-40"
        onClick={increase}
        disabled={value >= max}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}

export interface QuantityStepperViewCheckProps {
  readonly selected: boolean;
  readonly label: string;
  readonly onToggle: () => void;
}

export function CustomizationToggleButton({
  selected,
  label,
  onToggle,
}: QuantityStepperViewCheckProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={label}
      onClick={onToggle}
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition ${
        selected
          ? 'border-[#FF7A00] bg-[#FF7A00] text-white'
          : 'border-white/20 bg-white/5 text-transparent'
      }`}
    >
      <Check size={14} strokeWidth={3} className={selected ? 'opacity-100' : 'opacity-0'} aria-hidden />
    </button>
  );
}
