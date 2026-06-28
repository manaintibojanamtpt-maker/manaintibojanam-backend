import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  ClipboardList,
  Sparkles,
} from 'lucide-react';
import { m, AnimatePresence } from 'framer-motion';
import type { TenantInfo } from '../../context/TenantContext';
import {
  computeStoreSetupProgress,
  getSetupContinuePath,
  type StoreSetupStepStatus,
} from '../../lib/storeSetupProgress';

interface StoreSetupGuideProps {
  tenantInfo: TenantInfo | null;
  menuCount: number;
  variant?: 'full' | 'compact';
  className?: string;
}

const StepRow: React.FC<{
  step: StoreSetupStepStatus;
  index: number;
  onGo: () => void;
}> = ({ step, index, onGo }) => {
  const Icon = step.icon;
  return (
    <button
      type="button"
      onClick={onGo}
      className={`w-full text-left flex items-start gap-3 p-3 rounded-xl border transition-all group ${
        step.isCurrent
          ? 'bg-orange-500/10 border-orange-500/30 ring-1 ring-orange-500/20'
          : step.complete
            ? 'bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10'
            : 'bg-black/30 border-white/5 hover:bg-white/5 hover:border-white/10'
      }`}
    >
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
          step.complete
            ? 'bg-emerald-500/20 text-emerald-400'
            : step.isCurrent
              ? 'bg-orange-500/20 text-orange-400'
              : 'bg-white/5 text-white/30'
        }`}
      >
        {step.complete ? <CheckCircle2 size={16} /> : <Icon size={16} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/30">
            Step {index + 1}
          </span>
          {!step.required && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400/80 bg-blue-500/10 px-1.5 py-0.5 rounded">
              Optional
            </span>
          )}
          {step.isCurrent && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded">
              Do this next
            </span>
          )}
        </div>
        <p className={`font-bold text-sm mt-0.5 ${step.complete ? 'text-emerald-100' : 'text-white'}`}>
          {step.title}
        </p>
        <p className="text-xs text-white/45 mt-0.5 line-clamp-2">{step.instruction}</p>
      </div>
      {!step.complete && (
        <ChevronRight
          size={16}
          className="text-white/20 group-hover:text-white/50 shrink-0 mt-2 transition-colors"
        />
      )}
    </button>
  );
};

export const StoreSetupGuide: React.FC<StoreSetupGuideProps> = ({
  tenantInfo,
  menuCount,
  variant = 'full',
  className = '',
}) => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(variant === 'full');
  const progress = computeStoreSetupProgress(tenantInfo, menuCount);

  if (!progress.needsSetup) return null;

  const continuePath = getSetupContinuePath(progress);
  const nextTitle = progress.nextStep?.title ?? 'Finish setup';

  const goToStep = (step: StoreSetupStepStatus) => {
    if (step.wizardStep) {
      navigate(`/owner/setup?step=${step.wizardStep}`);
      return;
    }
    navigate(step.path);
  };

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={() => navigate(continuePath)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-orange-500/15 to-rose-500/10 border border-orange-500/25 hover:border-orange-500/40 transition-all text-left ${className}`}
      >
        <div className="relative w-10 h-10 shrink-0">
          <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              stroke="#f97316"
              strokeWidth="3"
              strokeDasharray={`${progress.percentComplete} 100`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-orange-400">
            {progress.percentComplete}%
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-orange-300 uppercase tracking-wider">Store setup</p>
          <p className="text-sm font-bold text-white truncate">{nextTitle}</p>
          <p className="text-[11px] text-white/45">
            {progress.requiredCompletedCount} of {progress.totalRequired} required steps done
          </p>
        </div>
        <ArrowRight size={18} className="text-orange-400 shrink-0" />
      </button>
    );
  }

  return (
    <section
      id="store-setup-guide"
      className={`bg-gradient-to-br from-[#1C0E0A] via-[#140a08] to-[#0f0a0a] border border-orange-500/25 rounded-2xl overflow-hidden relative ${className}`}
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="p-6 relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/15 border border-orange-500/25 flex items-center justify-center shrink-0">
              <ClipboardList className="text-orange-400" size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black text-white">Set up your store</h2>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  <Sparkles size={10} /> Guided
                </span>
              </div>
              <p className="text-sm text-orange-100/70 mt-1 max-w-xl">
                Follow these steps in order — each one unlocks the next. You can pause anytime and pick up where you left off.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-2xl font-black text-white">{progress.percentComplete}%</p>
              <p className="text-xs text-white/40">
                {progress.requiredCompletedCount}/{progress.totalRequired} required
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate(continuePath)}
              className="px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
            >
              Continue setup
              <ArrowRight size={18} />
            </button>
          </div>
        </div>

        <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-4">
          <m.div
            className="h-full bg-gradient-to-r from-orange-500 to-rose-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress.percentComplete}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-2 text-sm font-bold text-white/50 hover:text-white/80 transition-colors mb-3 lg:hidden"
        >
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          {expanded ? 'Hide all steps' : `Show all ${progress.steps.length} steps`}
        </button>

        <AnimatePresence initial={false}>
          {(expanded || variant === 'full') && (
            <m.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-2 overflow-hidden"
            >
              {progress.steps.map((step, index) => (
                <StepRow key={step.id} step={step} index={index} onGo={() => goToStep(step)} />
              ))}
            </m.div>
          )}
        </AnimatePresence>

        {!expanded && (
          <div className="lg:hidden flex items-center gap-2 p-3 rounded-xl bg-black/40 border border-white/5">
            <Circle size={8} className="text-orange-400 fill-orange-400" />
            <span className="text-sm text-white/70">
              Next: <strong className="text-white">{nextTitle}</strong>
            </span>
          </div>
        )}

        <p className="text-[11px] text-white/30 mt-4 leading-relaxed">
          Start → finish in about 25 minutes. Required steps must be done before your store accepts orders.
          Mobile verification is optional for sandbox testing.
        </p>
      </div>
    </section>
  );
};

export default StoreSetupGuide;
