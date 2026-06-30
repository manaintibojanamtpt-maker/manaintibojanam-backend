import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Section } from '../ui/Section';
import { PricingPlanCard, PricingComparisonTable } from './PricingPlanCard';
import {
  ALL_PLANS,
  PRICING_FAQ,
  PRICING_ZERO_COMMISSION_NOTE,
  pricingPageCopy,
} from '../../config/pricing';

export const PricingSection: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const copy = pricingPageCopy.landing;

  return (
    <Section id="pricing" background="subtle" density="hero" className="scroll-mt-24">
      <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
        <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-[#FF6B00] mb-4">
          {copy.eyebrow}
        </p>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
          {copy.title}
        </h2>
        <p className="text-base sm:text-lg text-white/50 leading-relaxed">{copy.subtitle}</p>
        <p className="mt-3 text-sm font-medium text-[#ffb347]/90">{copy.trialBanner}</p>
        <p className="mt-4 text-sm font-semibold text-emerald-400/90">{PRICING_ZERO_COMMISSION_NOTE}</p>
      </div>

      {/* Eager render — no scroll-triggered opacity; min-height prevents layout collapse */}
      <div
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 lg:gap-4 items-stretch mb-10 min-h-[28rem] sm:min-h-[30rem] xl:min-h-[26rem]"
        aria-label="Pricing plans"
      >
        {ALL_PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`opacity-100 translate-y-0 ${plan.highlighted ? 'md:col-span-2 xl:col-span-1' : ''}`}
          >
            <PricingPlanCard plan={plan} variant="landing" />
          </div>
        ))}
      </div>

      <div className="max-w-3xl mx-auto mb-16 rounded-2xl border border-white/10 bg-[#0A0A0A] p-6 sm:p-8">
        <h3 className="text-lg font-bold text-white mb-2">{copy.whyPayTitle}</h3>
        <p className="text-sm text-white/55 leading-relaxed">{copy.whyPayBody}</p>
      </div>

      <div className="mb-10">
        <h3 className="text-xl font-black text-white text-center mb-8">Compare plans</h3>
        <PricingComparisonTable />
      </div>

      <div className="max-w-2xl mx-auto">
        <h3 className="text-xl font-black text-white text-center mb-6">{copy.faqTitle}</h3>
        <div className="space-y-2">
          {PRICING_FAQ.map((item, i) => (
            <div key={item.question} className="rounded-xl border border-white/10 overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between gap-4 p-4 text-left bg-[#0A0A0A] hover:bg-white/[0.03] transition-colors"
              >
                <span className="font-semibold text-white text-sm">{item.question}</span>
                <ChevronDown
                  size={18}
                  className={`text-white/40 shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`}
                />
              </button>
              {openFaq === i && (
                <div className="px-4 pb-4 pt-0 text-sm text-white/55 leading-relaxed bg-[#0A0A0A]">
                  {item.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
};

export default PricingSection;
