import React from 'react';

interface TimelineCardProps {
  year: string;
  title: string;
  description?: string;
  isLast?: boolean;
  delay?: number;
}

export const TimelineCard: React.FC<TimelineCardProps> = ({
  year,
  title,
  description,
  isLast = false,
}) => {
  return (
    <div className="relative flex gap-6 pb-12">
      {!isLast && (
        <div className="absolute top-10 left-3 bottom-0 w-0.5 bg-gradient-to-b from-[#FF7A00]/50 to-transparent" />
      )}

      <div className="relative z-10 w-6 h-6 rounded-full bg-[#0A0A0A] border-4 border-[#FF7A00] flex-shrink-0 mt-1 shadow-[0_0_15px_rgba(255,122,0,0.3)]" />

      <div className="flex-1 min-w-0">
        <span className="text-[#FF7A00] font-bold tracking-widest uppercase text-sm mb-1 block">
          {year}
        </span>
        <h4 className="text-xl font-bold text-white mb-2">{title}</h4>
        {description && (
          <p className="text-neutral-400 font-medium leading-relaxed">{description}</p>
        )}
      </div>
    </div>
  );
};
