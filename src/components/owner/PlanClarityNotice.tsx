import React from 'react';
import { Info } from 'lucide-react';
import { onboardingPlanMessaging } from '../../config/pricing';

type PlanClarityVariant = 'register' | 'wizard' | 'publish';

interface PlanClarityNoticeProps {
  variant: PlanClarityVariant;
  className?: string;
}

const copyByVariant: Record<PlanClarityVariant, { title: string; body: string; footnote?: string }> = {
  register: {
    title: 'Free storefront · Growth for live orders',
    body: onboardingPlanMessaging.registerSubtitle,
    footnote: onboardingPlanMessaging.registerFootnote,
  },
  wizard: {
    title: 'Setting up your free storefront',
    body: onboardingPlanMessaging.wizardIntro,
  },
  publish: {
    title: onboardingPlanMessaging.publishTitle,
    body: onboardingPlanMessaging.publishBody,
    footnote: onboardingPlanMessaging.publishReminder,
  },
};

export const PlanClarityNotice: React.FC<PlanClarityNoticeProps> = ({ variant, className = '' }) => {
  const copy = copyByVariant[variant];

  return (
    <div
      className={`rounded-2xl border border-[#FF7A00]/25 bg-[#FF7A00]/[0.06] p-4 sm:p-5 ${className}`}
      role="note"
      aria-label="Plan and trial information"
    >
      <div className="flex gap-3">
        <Info className="w-5 h-5 text-[#FF7A00] shrink-0 mt-0.5" aria-hidden />
        <div className="min-w-0 space-y-2">
          <p className="text-sm font-bold text-[#ffb347]">{copy.title}</p>
          <p className="text-sm text-white/75 leading-relaxed">{copy.body}</p>
          {copy.footnote && (
            <p className="text-xs text-white/45 leading-relaxed border-t border-white/10 pt-2">{copy.footnote}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlanClarityNotice;
