import React, { memo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Section } from '../ui/Section';
import { SectionHeader } from '../ui/SectionHeader';
import { landingFaq } from '../../config/landing';

export const LandingFAQ = memo(function LandingFAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <Section id="faq" background="default" className="scroll-mt-24">
      <SectionHeader label="FAQ" title="Questions From Restaurant Owners" description="Everything you need to know before launching your direct storefront." />

      <div className="max-w-2xl mx-auto space-y-2">
        {landingFaq.map((item, i) => {
          const isOpen = open === i;
          return (
            <div
              key={item.question}
              className="rounded-[1.25rem] border border-white/[0.08] overflow-hidden bg-[#0A0A0A]/80"
            >
              <button
                type="button"
                id={`faq-trigger-${i}`}
                aria-expanded={isOpen}
                aria-controls={`faq-panel-${i}`}
                onClick={() => setOpen(isOpen ? null : i)}
                className="w-full flex items-center justify-between gap-4 p-4 sm:p-5 text-left hover:bg-white/[0.02] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00]/40"
              >
                <span className="font-semibold text-white text-sm sm:text-base">{item.question}</span>
                <ChevronDown
                  size={18}
                  className={`text-neutral-500 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  aria-hidden
                />
              </button>
              <div
                id={`faq-panel-${i}`}
                role="region"
                aria-labelledby={`faq-trigger-${i}`}
                hidden={!isOpen}
                className="px-4 sm:px-5 pb-4 sm:pb-5 text-sm text-neutral-400 leading-relaxed"
              >
                {item.answer}
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
});

export default LandingFAQ;
