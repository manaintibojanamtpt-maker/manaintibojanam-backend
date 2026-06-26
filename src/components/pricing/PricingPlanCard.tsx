import React from 'react';
import { Check, Minus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PricingPlan, COMPARISON_ROWS } from '../../config/pricing';

interface PricingPlanCardProps {
  plan: PricingPlan;
  variant?: 'landing' | 'owner';
  isCurrent?: boolean;
  onSelect?: () => void;
  disabled?: boolean;
  loading?: boolean;
  actionLabel?: string;
}

export const PricingPlanCard: React.FC<PricingPlanCardProps> = ({
  plan,
  variant = 'landing',
  isCurrent = false,
  onSelect,
  disabled = false,
  loading = false,
  actionLabel,
}) => {
  const highlighted = plan.highlighted;
  const ctaText = actionLabel || (variant === 'owner' ? plan.ownerCta : plan.cta);

  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-6 sm:p-7 h-full transition-all ${
        highlighted
          ? 'border-[#FF6B00]/50 bg-gradient-to-b from-[#FF6B00]/10 to-[#0A0A0A] shadow-[0_0_40px_-12px_rgba(255,107,0,0.35)] scale-[1.02] z-10'
          : isCurrent
            ? 'border-emerald-500/40 bg-emerald-500/[0.04]'
            : 'border-white/10 bg-[#0A0A0A]/80 hover:border-white/20'
      }`}
    >
      {plan.badge && (
        <span
          className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
            highlighted ? 'bg-[#FF6B00] text-white' : 'bg-white/10 text-white/70 border border-white/10'
          }`}
        >
          {plan.badge}
        </span>
      )}

      {isCurrent && (
        <span className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full">
          Active
        </span>
      )}

      <div className="mb-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">{plan.positioning}</p>
        <h3 className="text-xl font-black text-white">{plan.name}</h3>
        <p className="text-sm text-white/50 mt-1 min-h-[2.5rem]">{plan.tagline}</p>
      </div>

      <div className="mb-6">
        <div className="flex items-end gap-1">
          <span className="text-4xl font-black text-white tabular-nums">{plan.priceLabel}</span>
          {plan.price > 0 && <span className="text-sm text-white/45 mb-1.5">{plan.period}</span>}
        </div>
        {plan.price === 0 && <p className="text-xs text-emerald-400/90 mt-1">{plan.period}</p>}
        <p className="text-[11px] text-white/35 mt-2">Zero commission on every order</p>
      </div>

      <ul className="space-y-3 mb-8 flex-1">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-sm text-white/75">
            <Check size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {variant === 'landing' ? (
        plan.id === 'enterprise' ? (
          <Link
            to="/contact"
            className={`w-full py-3 rounded-xl font-bold text-sm text-center transition-colors ${
              highlighted
                ? 'bg-[#FF6B00] hover:bg-[#E56D00] text-white'
                : 'border border-white/15 text-white hover:bg-white/5'
            }`}
          >
            Talk to sales
          </Link>
        ) : (
          <Link
            to="/owner/register"
            className={`w-full py-3 rounded-xl font-bold text-sm text-center transition-colors ${
              plan.id === 'starter'
                ? 'border border-white/15 text-white hover:bg-white/5'
                : highlighted
                  ? 'bg-[#FF6B00] hover:bg-[#E56D00] text-white shadow-lg shadow-orange-500/20'
                  : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
            }`}
          >
            {ctaText}
          </Link>
        )
      ) : (
        <button
          type="button"
          onClick={onSelect}
          disabled={disabled || isCurrent || loading}
          className={`w-full py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            highlighted && !isCurrent
              ? 'bg-[#FF6B00] hover:bg-[#E56D00] text-white'
              : isCurrent
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 cursor-default'
                : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
          }`}
        >
          {loading ? 'Updating…' : isCurrent ? 'Current plan' : ctaText}
        </button>
      )}
    </div>
  );
};

interface PricingComparisonTableProps {
  compact?: boolean;
}

export const PricingComparisonTable: React.FC<PricingComparisonTableProps> = () => {
  const renderCell = (value: boolean | string) => {
    if (value === true) return <Check size={18} className="text-emerald-400 mx-auto" />;
    if (value === false) return <Minus size={18} className="text-white/20 mx-auto" />;
    return <span className="text-xs font-semibold text-white/60">{value}</span>;
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-white/[0.02]">
            <th className="text-left p-4 font-bold text-white/50">Feature</th>
            <th className="p-4 font-bold text-white/70">Free</th>
            <th className="p-4 font-bold text-white/70">Growth</th>
            <th className="p-4 font-bold text-[#FF6B00]">Pro</th>
            <th className="p-4 font-bold text-white/70">Enterprise</th>
          </tr>
        </thead>
        <tbody>
          {COMPARISON_ROWS.map((row) => (
            <tr key={row.label} className="border-b border-white/5 hover:bg-white/[0.02]">
              <td className="p-4 text-white/80 font-medium">{row.label}</td>
              <td className="p-4 text-center">{renderCell(row.starter)}</td>
              <td className="p-4 text-center">{renderCell(row.growth)}</td>
              <td className="p-4 text-center bg-[#FF6B00]/[0.03]">{renderCell(row.pro)}</td>
              <td className="p-4 text-center">{renderCell(row.enterprise)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PricingPlanCard;
