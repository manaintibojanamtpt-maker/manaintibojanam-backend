import React, { memo } from 'react';
import { Check } from 'lucide-react';

const PROOF_POINTS = [
  'Zero commission on every order',
  'Own your customers and data',
  'AI-powered insights',
  'No onboarding fee',
];

export const SocialProofStrip = memo(function SocialProofStrip() {
  return (
    <div className="w-full max-w-3xl mx-auto mt-8 sm:mt-10">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 sm:p-5">
        {PROOF_POINTS.map((point) => (
          <div key={point} className="flex items-center gap-2.5 text-sm">
            <Check size={16} className="text-[#FF7A00] shrink-0" strokeWidth={2.5} />
            <span className="text-neutral-300">{point}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

export default SocialProofStrip;
