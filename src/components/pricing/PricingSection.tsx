import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Section } from '../ui/Section';
import { PricingComparisonTable } from './PricingPlanCard';
import { BhojanOSPricing } from '../ui/pricing';
import { triggerHaptic } from '../../utils/haptics';
import {
  PRICING_FAQ,
  pricingPageCopy,
} from '../../config/pricing';

export const PricingSection: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const copy = pricingPageCopy.landing;

  return (
    <div className="w-full">
      {/* Interactive animated pricing plans with NumberFlow */}
      <BhojanOSPricing />

      <Section id="pricing-details" background="subtle" density="default" className="pt-0">
        <div className="max-w-3xl mx-auto mb-16 rounded-sm border border-[#27272A] bg-[#18181B] p-6 sm:p-8 shadow-none">
          <h3 className="text-lg font-bold text-[#FAFAFA] mb-2">{copy.whyPayTitle}</h3>
          <p className="text-sm text-[#A1A1AA] leading-relaxed">{copy.whyPayBody}</p>
        </div>

        <div className="mb-14 max-w-5xl mx-auto">
          <h3 className="text-2xl font-extrabold text-[#FAFAFA] text-center mb-8">Compare Plans &amp; Capabilities</h3>
          <PricingComparisonTable variant="landing" />
        </div>

        <div className="max-w-2xl mx-auto">
          <h3 className="text-2xl font-extrabold text-[#FAFAFA] text-center mb-6">{copy.faqTitle}</h3>
          <div className="space-y-2.5">
            {PRICING_FAQ.map((item, i) => (
              <div key={item.question} className="rounded-sm border border-[#27272A] overflow-hidden bg-[#18181B] shadow-none">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('selection');
                    setOpenFaq(openFaq === i ? null : i);
                  }}
                  className="w-full flex items-center justify-between gap-4 p-4 text-left bg-[#18181B] hover:bg-[#27272A] transition-colors cursor-pointer"
                  aria-expanded={openFaq === i}
                >
                  <span className="font-semibold text-[#FAFAFA] text-sm">{item.question}</span>
                  <ChevronDown
                    size={18}
                    className={`text-[#A1A1AA] shrink-0 transition-transform ${openFaq === i ? 'rotate-180 text-[#D97706]' : ''}`}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-4 pt-1 text-sm text-[#A1A1AA] leading-relaxed bg-[#18181B] border-t border-[#27272A]">
                    {item.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </Section>
    </div>
  );
};

export default PricingSection;
