import React, { memo } from 'react';
import { MapPin, Quote, UtensilsCrossed } from 'lucide-react';
import { socialProofStrip } from '../../config/demoData';

export const SocialProofStrip = memo(function SocialProofStrip() {
  const { restaurantCount, restaurantCountLabel, cities, testimonial } = socialProofStrip;

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 sm:mt-10">
      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4 md:gap-6 items-stretch">
        <div className="flex flex-col sm:flex-row md:flex-col gap-3 sm:gap-4 md:gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF7A00]/15 text-[#FF7A00] shrink-0">
              <UtensilsCrossed size={18} aria-hidden />
            </div>
            <div>
              <p className="text-2xl font-black text-white tabular-nums leading-none">{restaurantCount}</p>
              <p className="text-xs text-neutral-500 mt-1">{restaurantCountLabel}</p>
            </div>
          </div>
          <div className="flex items-start gap-2 sm:border-t md:border-t border-white/[0.06] pt-3 sm:pt-3">
            <MapPin size={14} className="text-neutral-500 shrink-0 mt-0.5" aria-hidden />
            <p className="text-xs text-neutral-400 leading-relaxed">
              <span className="text-neutral-300 font-medium">Cities:</span>{' '}
              {cities.join(' · ')}
            </p>
          </div>
        </div>

        <blockquote className="rounded-2xl border border-white/[0.08] bg-[#0A0A0A]/80 p-4 sm:p-5 flex flex-col justify-center">
          <Quote size={16} className="text-[#FF7A00]/60 mb-2 shrink-0" aria-hidden />
          <p className="text-sm text-neutral-300 leading-relaxed mb-3">&ldquo;{testimonial.quote}&rdquo;</p>
          <footer className="text-xs text-neutral-500">
            <span className="font-semibold text-neutral-300">{testimonial.name}</span>
            {' · '}
            {testimonial.role}
          </footer>
        </blockquote>
      </div>
    </div>
  );
});

export default SocialProofStrip;
