import React from 'react';
import { m } from 'framer-motion';
import { X, Clock, ArrowRight, LucideIcon } from 'lucide-react';

export interface AIInsightCardProps {
  title: string;
  insight: string;
  why: string;
  expectedOutcome: string;
  actionLabel: string;
  onAction: () => void;
  onDismiss?: () => void;
  onSnooze?: () => void;
  icon?: LucideIcon;
  tone?: 'risk' | 'opportunity' | 'recovery';
  potentialValue?: string;
}

const toneStyles = {
  risk: 'border-red-500/30 bg-red-500/[0.04]',
  opportunity: 'border-amber-500/30 bg-amber-500/[0.04]',
  recovery: 'border-blue-500/30 bg-blue-500/[0.04]',
};

export const AIInsightCard: React.FC<AIInsightCardProps> = ({
  title,
  insight,
  why,
  expectedOutcome,
  actionLabel,
  onAction,
  onDismiss,
  onSnooze,
  icon: Icon,
  tone = 'opportunity',
  potentialValue,
}) => (
  <m.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className={`rounded-2xl border p-5 ${toneStyles[tone]}`}
  >
    <div className="flex items-start justify-between gap-3 mb-3">
      <div className="flex items-center gap-2 min-w-0">
        {Icon && <Icon size={18} className="text-white/70 shrink-0" />}
        <h3 className="font-bold text-white text-sm leading-snug">{title}</h3>
      </div>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40" aria-label="Dismiss">
          <X size={16} />
        </button>
      )}
    </div>

    <p className="text-sm text-white/80 leading-relaxed mb-4">{insight}</p>

    <div className="space-y-2 mb-4 text-xs">
      <div className="rounded-lg bg-black/30 border border-white/5 px-3 py-2">
        <span className="font-bold text-white/40 uppercase tracking-wider text-[10px]">Why this matters</span>
        <p className="text-white/70 mt-1">{why}</p>
      </div>
      <div className="rounded-lg bg-black/30 border border-white/5 px-3 py-2">
        <span className="font-bold text-white/40 uppercase tracking-wider text-[10px]">Expected outcome</span>
        <p className="text-white/70 mt-1">
          {expectedOutcome}
          {potentialValue ? ` · ${potentialValue}` : ''}
        </p>
      </div>
    </div>

    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onAction}
        className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-orange-500 text-white text-sm font-bold hover:opacity-95 transition-opacity"
      >
        {actionLabel} <ArrowRight size={16} />
      </button>
      {onSnooze && (
        <button
          type="button"
          onClick={onSnooze}
          className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-white/10 text-white/60 text-xs font-semibold hover:bg-white/5"
        >
          <Clock size={14} /> Later
        </button>
      )}
    </div>
  </m.div>
);

export default AIInsightCard;
