import React from 'react';

interface SectionProps {
  id?: string;
  children: React.ReactNode;
  className?: string;
  background?: 'default' | 'subtle' | 'dark' | 'gradient';
  /** comfortable = default; spacious = emphasis blocks; hero = page title under fixed header */
  density?: 'comfortable' | 'spacious' | 'hero';
}

export const Section: React.FC<SectionProps> = ({
  id,
  children,
  className = '',
  background = 'default',
  density = 'comfortable',
}) => {
  const bgClasses = {
    default: 'bg-[#09090B] text-[#FAFAFA]',
    subtle: 'bg-[#111114] text-[#FAFAFA]',
    dark: 'bg-[#09090B] text-[#FAFAFA]',
    gradient: 'bg-[#09090B] relative overflow-visible text-[#FAFAFA]',
  };

  const densityClasses =
    density === 'spacious'
      ? 'py-16 sm:py-20 lg:py-32'
      : density === 'hero'
        ? 'pt-2 sm:pt-4 pb-8 sm:pb-10'
        : 'py-16 sm:py-20 lg:py-24';

  const sanitizedClassName = className
    .replace(/\bbg-\[#FAFAFA\]\b/g, '')
    .replace(/\bbg-white\b/g, '')
    .replace(/\btext-\[#09090B\]\b/g, '')
    .trim();

  return (
    <section id={id} className={`w-full ${densityClasses} relative ${bgClasses[background]} border-b border-[#27272A] ${sanitizedClassName}`}>
      {background === 'gradient' && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[480px] bg-gradient-to-b from-[#D97706]/[0.06] via-[#D97706]/[0.01] to-transparent blur-[100px] pointer-events-none" />
      )}
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {children}
      </div>
    </section>
  );
};
