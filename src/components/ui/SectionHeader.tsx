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
      className={`mb-6 sm:mb-10 ${align === 'center' ? 'text-center mx-auto' : 'text-left'} max-w-3xl ${className}`}
    >
      {label && (
        <div className="marketing-section-eyebrow mb-4 sm:mb-5">
          {label}
        </div>
      )}

      {title && (
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-[1.12] mb-3 sm:mb-4">
          {title}
        </h2>
      )}

      {description && (
        <p
          className={`text-[15px] sm:text-lg text-neutral-400 font-medium leading-relaxed max-w-2xl ${
            align === 'center' ? 'mx-auto' : ''
          }`}
        >
          {description}
        </p>
      )}
    </header>
  );
};
