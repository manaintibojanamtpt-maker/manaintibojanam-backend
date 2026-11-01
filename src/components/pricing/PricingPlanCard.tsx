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
  const isLanding = variant === 'landing';
  const highlighted = plan.highlighted;
  const ctaText = actionLabel || (variant === 'owner' ? plan.ownerCta : plan.cta);

  return (
    <div
      className={`relative flex flex-col rounded-sm border p-6 sm:p-7 h-full transition-all duration-200 ${
        isLanding
          ? highlighted
            ? 'border-2 border-[#D97706] bg-[#18181B] shadow-sm z-10 text-[#FAFAFA]'
            : isCurrent
              ? 'border-emerald-500/40 bg-emerald-950/20 text-[#FAFAFA]'
              : 'border border-[#27272A] bg-[#18181B] hover:border-[#D97706]/50 shadow-none text-[#FAFAFA]'
          : highlighted
            ? 'border-[#FF6B00]/50 bg-gradient-to-b from-[#FF6B00]/10 to-[#0A0A0A] shadow-[0_0_40px_-12px_rgba(255,107,0,0.35)] scale-[1.02] z-10 text-white'
            : isCurrent
              ? 'border-emerald-500/40 bg-emerald-500/[0.04] text-white'
              : 'border-white/10 bg-[#0A0A0A]/80 hover:border-white/20 text-white'
      }`}
    >
      {plan.badge && (
        <span
          className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
            isLanding
              ? highlighted
                ? 'bg-[#D97706] text-white rounded-sm font-mono'
                : 'bg-[#111114] text-[#A1A1AA] border border-[#27272A]'
              : highlighted
                ? 'bg-[#FF6B00] text-white'
                : 'bg-white/10 text-white/70 border border-white/10'
          }`}
        >
          {plan.badge}
        </span>
      )}

      {isCurrent && (
        <span
          className={`absolute top-4 right-4 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
            isLanding
              ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-500/30'
              : 'text-emerald-400 bg-emerald-500/15'
          }`}
        >
          Active
        </span>
      )}

      <div className="mb-5">
        <p
          className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${
            isLanding ? 'text-[#A1A1AA]' : 'text-white/40'
          }`}
        >
          {plan.positioning}
        </p>
        <h3 className={`text-xl font-black ${isLanding ? 'text-[#FAFAFA]' : 'text-white'}`}>{plan.name}</h3>
        <p
          className={`text-sm mt-1 min-h-[2.5rem] leading-relaxed ${
            isLanding ? 'text-[#A1A1AA]' : 'text-white/50'
          }`}
        >
          {plan.tagline}
        </p>
      </div>

      <div className="mb-6">
        <div className="flex items-end gap-1">
          <span
            className={`text-4xl font-black tabular-nums ${
              isLanding ? 'text-[#FAFAFA]' : 'text-white'
            }`}
          >
            {plan.priceLabel}
          </span>
          {plan.price > 0 && (
            <span className={`text-sm mb-1.5 ${isLanding ? 'text-[#A1A1AA]' : 'text-white/45'}`}>
              {plan.period}
            </span>
          )}
        </div>
        {plan.price === 0 && (
          <p className={`text-xs mt-1 ${isLanding ? 'text-emerald-400 font-semibold' : 'text-emerald-400/90'}`}>
            {plan.period}
          </p>
        )}
        {plan.trialNote && (
          <p
            className={`text-[11px] font-semibold mt-2 leading-snug ${
              isLanding ? 'text-[#D97706]' : 'text-[#ffb347]/90'
            }`}
          >
            {plan.trialNote}
          </p>
        )}
        <p className={`text-[11px] mt-2 ${isLanding ? 'text-[#71717A]' : 'text-white/35'}`}>
          Zero commission on every order
        </p>
      </div>

      <ul className="space-y-3 mb-8 flex-1">
        {plan.features.map((feature) => (
          <li
            key={feature}
            className={`flex items-start gap-2.5 text-sm ${
              isLanding ? 'text-[#FAFAFA]' : 'text-white/75'
            }`}
          >
            <Check
              size={16}
              className={`${isLanding ? 'text-[#10B981]' : 'text-emerald-400'} shrink-0 mt-0.5`}
            />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {variant === 'landing' ? (
        plan.id === 'enterprise' ? (
          <Link
            to="/contact"
            className={`w-full py-3 rounded-full font-bold text-sm text-center transition-all ${
              highlighted
                ? 'bg-[#D97706] hover:bg-[#F59E0B] text-white shadow-md shadow-[#D97706]/20'
                : 'border border-[#27272A] text-[#FAFAFA] bg-[#111114] hover:bg-[#27272A]'
            }`}
          >
            Talk to sales
          </Link>
        ) : (
          <a
            href="/owner/register"
            className={`w-full py-3 rounded-full font-bold text-sm text-center transition-all ${
              plan.id === 'starter'
                ? 'border border-[#27272A] text-[#FAFAFA] bg-[#111114] hover:bg-[#27272A]'
                : highlighted
                  ? 'bg-[#D97706] hover:bg-[#F59E0B] text-white shadow-md shadow-[#D97706]/20'
                  : 'border border-[#27272A] text-[#FAFAFA] bg-[#111114] hover:bg-[#27272A]'
            }`}
          >
            {ctaText}
          </a>
        )
      ) : (
        <button
          type="button"
          onClick={onSelect}
          disabled={disabled || isCurrent || loading}
          className={`w-full py-3 rounded-full font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
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
  variant?: 'landing' | 'owner';
}

export const PricingComparisonTable: React.FC<PricingComparisonTableProps> = ({
  variant = 'owner',
}) => {
  const isLanding = variant === 'landing';

  const renderCell = (value: boolean | string) => {
    if (value === true) {
      return (
        <Check
          size={18}
          className={`${isLanding ? 'text-[#10B981]' : 'text-emerald-400'} mx-auto`}
        />
      );
    }
    if (value === false) {
      return (
        <Minus
          size={18}
          className={`${isLanding ? 'text-zinc-600' : 'text-white/20'} mx-auto`}
        />
      );
    }
    return (
      <span
        className={`text-xs font-semibold ${isLanding ? 'text-[#A1A1AA]' : 'text-white/60'}`}
      >
        {value}
      </span>
    );
  };

  return (
    <div
      className={`overflow-x-auto rounded-sm border ${
        isLanding ? 'border-[#27272A] bg-[#18181B] shadow-none' : 'border-white/10 bg-transparent'
      }`}
    >
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr
            className={`border-b ${
              isLanding ? 'border-[#27272A] bg-[#111114]' : 'border-b border-white/10 bg-white/[0.02]'
            }`}
          >
            <th
              className={`text-left p-4 font-bold ${
                isLanding ? 'text-[#A1A1AA]' : 'text-white/50'
              }`}
            >
              Feature
            </th>
            <th className={`p-4 font-bold ${isLanding ? 'text-[#FAFAFA]' : 'text-white/70'}`}>
              Free
            </th>
            <th className={`p-4 font-bold ${isLanding ? 'text-[#FAFAFA]' : 'text-white/70'}`}>
              Growth
            </th>
            <th className={`p-4 font-bold ${isLanding ? 'text-[#D97706]' : 'text-[#FF6B00]'}`}>
              Pro
            </th>
            <th className={`p-4 font-bold ${isLanding ? 'text-[#FAFAFA]' : 'text-white/70'}`}>
              Enterprise
            </th>
          </tr>
        </thead>
        <tbody>
          {COMPARISON_ROWS.map((row) => (
            <tr
              key={row.label}
              className={`border-b ${
                isLanding
                  ? 'border-[#27272A] hover:bg-[#111114]'
                  : 'border-white/5 hover:bg-white/[0.02]'
              }`}
            >
              <td
                className={`p-4 font-medium ${isLanding ? 'text-[#FAFAFA]' : 'text-white/80'}`}
              >
                {row.label}
              </td>
              <td className="p-4 text-center">{renderCell(row.starter)}</td>
              <td className="p-4 text-center">{renderCell(row.growth)}</td>
              <td
                className={`p-4 text-center ${
                  isLanding ? 'bg-[#D97706]/[0.08]' : 'bg-[#FF6B00]/[0.03]'
                }`}
              >
                {renderCell(row.pro)}
              </td>
              <td className="p-4 text-center">{renderCell(row.enterprise)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PricingPlanCard;
