import React from 'react';

export interface SectionHeaderProps {
  label?: string;
  title?: string;
  description?: string;
  align?: 'left' | 'center';
  className?: string;
  theme?: 'light' | 'dark';
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  label,
  title,
  description,
  align = 'center',
  className = '',
  theme = 'dark',
}) => {
  const isDark = theme !== 'light';
  const titleColor = 'text-[#FAFAFA]';
  const descColor = 'text-[#A1A1AA]';
  const badgeStyle = 'border-white/[0.15] bg-white/[0.05] text-[#D97706]';

  return (
    <header
      className={`mb-8 sm:mb-12 ${align === 'center' ? 'text-center mx-auto' : 'text-left'} max-w-3xl ${className}`}
    >
      {label && (
        <div className={`mb-4 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-mono font-semibold uppercase tracking-[0.14em] sm:mb-5 ${badgeStyle}`}>
          {label}
        </div>
      )}

      {title && (
        <h2 className={`font-sans text-3xl sm:text-4xl lg:text-5xl font-extrabold ${titleColor} tracking-tight leading-[1.12] mb-3 sm:mb-4`}>
          {title}
        </h2>
      )}

      {description && (
        <p
          className={`text-base sm:text-lg ${descColor} font-normal leading-relaxed max-w-2xl ${
            align === 'center' ? 'mx-auto' : ''
          }`}
        >
          {description}
        </p>
      )}
    </header>
  );
};

export default SectionHeader;
