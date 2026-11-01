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
        <div className="absolute top-8 left-2.5 bottom-0 w-px bg-[#27272A]" />
      )}

      <div className="relative z-10 w-5 h-5 rounded-full bg-[#18181B] border-2 border-[#D97706] flex-shrink-0 mt-1.5 shadow-sm shadow-[#D97706]/30" />

      <div className="flex-1 min-w-0">
        <span className="text-[#D97706] font-bold tracking-wider uppercase text-xs mb-1 block font-mono">
          {year}
        </span>
        <h4 className="text-lg font-bold text-[#FAFAFA] mb-2 tracking-tight">{title}</h4>
        {description && (
          <p className="text-sm text-[#D4D4D8] font-normal leading-relaxed">{description}</p>
        )}
      </div>
    </div>
  );
};
