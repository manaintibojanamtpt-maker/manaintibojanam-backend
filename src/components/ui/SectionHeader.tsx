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
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.05] text-[#FF7A00] font-semibold text-xs tracking-wide uppercase mb-6">
          {label}
        </div>
      )}

      {title && (
        <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-[1.12] mb-4">
          {title}
        </h2>
      )}

      {description && (
        <p className="text-lg sm:text-xl text-neutral-400 font-medium leading-relaxed">
          {description}
        </p>
      )}
    </header>
  );
};
