import React from 'react';

interface SectionHeaderProps {
  label?: string;
  title?: string;
  description?: string;
  align?: 'left' | 'center';
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  label,
  title,
  description,
  align = 'center',
  className = '',
}) => {
  return (
    <header
      className={`mb-8 sm:mb-12 ${align === 'center' ? 'text-center mx-auto' : 'text-left'} max-w-3xl ${className}`}
    >
      {label && (
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#FF7A00] sm:mb-5">
          {label}
        </div>
      )}

      {title && (
        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-[-0.02em] leading-[1.08] mb-3 sm:mb-4">
          {title}
        </h2>
      )}

      {description && (
        <p
          className={`text-base sm:text-lg text-neutral-400 font-medium leading-relaxed max-w-2xl ${
            align === 'center' ? 'mx-auto' : ''
          }`}
        >
          {description}
        </p>
      )}
    </header>
  );
};
