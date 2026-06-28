import React, { memo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Section } from '../ui/Section';
import { SectionHeader } from '../ui/SectionHeader';
import { landingFaq } from '../../config/landing';

export const LandingFAQ = memo(function LandingFAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <Section id="faq" background="subtle" className="scroll-mt-24">
      <SectionHeader
        label="FAQ"
        title="Questions From Restaurant Owners"
        description="Everything you need to know before launching your direct storefront."
      />

      <div className="marketing-faq-list max-w-2xl mx-auto">
        {landingFaq.map((item, i) => {
          const isOpen = open === i;
          return (
            <article
              key={item.question}
              className="marketing-faq-item"
              data-open={isOpen ? 'true' : 'false'}
            >
              <button
                type="button"
                id={`faq-trigger-${i}`}
                aria-expanded={isOpen}
                aria-controls={`faq-panel-${i}`}
                onClick={() => setOpen(isOpen ? null : i)}
                className="marketing-faq-trigger"
              >
                <span className="font-semibold text-white text-sm sm:text-[15px] leading-snug pr-1">
                  {item.question}
                </span>
                <ChevronDown
                  size={18}
                  className={`text-neutral-500 shrink-0 transition-transform duration-200 ${
                    isOpen ? 'rotate-180 text-[#FF7A00]' : ''
                  }`}
                  aria-hidden
                />
              </button>
              <div
                id={`faq-panel-${i}`}
                role="region"
                aria-labelledby={`faq-trigger-${i}`}
                aria-hidden={!isOpen}
                className="marketing-faq-panel"
              >
                <div className="marketing-faq-panel-inner">
                  <p className="marketing-faq-answer">{item.answer}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </Section>
  );
});

export default LandingFAQ;
