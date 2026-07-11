import React from 'react';
import { Linkedin, Mail } from 'lucide-react';
import { ProfileImage } from './ProfileImage';

export interface Executive {
  name: string;
  designation: string;
  imageUrl?: string;
  alt: string;
  bio: string;
  linkedIn?: string;
  email?: string;
}

interface ExecutiveCardProps {
  executive: Executive;
  compact?: boolean;
}

export const ExecutiveCard: React.FC<ExecutiveCardProps> = ({ executive, compact = false }) => {
  if (compact) {
    return (
      <article className="marketing-card h-full p-4 flex flex-col items-center text-center transition-colors hover:border-[#FF7A00]/20">
        <ProfileImage
          name={executive.name}
          imageUrl={executive.imageUrl}
          alt={executive.alt}
          className="w-14 h-14 sm:w-16 sm:h-16 mb-3"
        />
        <h3 className="text-sm font-bold text-white mb-0.5 tracking-tight leading-tight">{executive.name}</h3>
        <p className="text-[#FF7A00] font-semibold text-[11px] sm:text-xs mb-2 leading-snug">{executive.designation}</p>
        <p className="text-neutral-500 text-xs leading-relaxed line-clamp-3 mb-3 flex-1">{executive.bio}</p>
        <div className="flex gap-2 mt-auto">
          {executive.linkedIn && (
            <a
              href={executive.linkedIn}
              aria-label={`${executive.name} on LinkedIn`}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-white/5 text-white/60 hover:text-[#FF7A00] hover:bg-white/10 transition-colors"
            >
              <Linkedin size={16} />
            </a>
          )}
          {executive.email && (
            <a
              href={`mailto:${executive.email}`}
              aria-label={`Email ${executive.name}`}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-white/5 text-white/60 hover:text-[#FF7A00] hover:bg-white/10 transition-colors"
            >
              <Mail size={16} />
            </a>
          )}
        </div>
      </article>
    );
  }

  return (
    <article className="group relative flex flex-col rounded-[2rem] p-6 sm:p-8 transition-all duration-500 border border-white/[0.08] bg-[#0A0A0A] hover:border-[#FF7A00]/25 hover:shadow-[0_0_28px_-12px_rgba(255,122,0,0.25)]">
      <div className="absolute inset-0 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-[#FF7A00]/10 via-transparent to-[#A855F7]/10 pointer-events-none -z-10" />

      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-6">
        <ProfileImage name={executive.name} imageUrl={executive.imageUrl} alt={executive.alt} />

        <div className="flex flex-col items-center sm:items-start text-center sm:text-left flex-1 mt-2">
          <h3 className="text-2xl font-bold text-white mb-1 tracking-tight">{executive.name}</h3>
          <p className="text-[#FF7A00] font-semibold text-sm mb-4">{executive.designation}</p>
          <div className="flex gap-3">
            {executive.linkedIn && (
              <a
                href={executive.linkedIn}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 text-white/60 hover:text-[#FF7A00] hover:bg-white/10 transition-colors"
              >
                <Linkedin size={18} />
              </a>
            )}
            {executive.email && (
              <a
                href={`mailto:${executive.email}`}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 text-white/60 hover:text-[#FF7A00] hover:bg-white/10 transition-colors"
              >
                <Mail size={18} />
              </a>
            )}
          </div>
        </div>
      </div>

      <p className="text-neutral-400 leading-relaxed font-medium">{executive.bio}</p>
    </article>
  );
};
