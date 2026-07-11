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
    default: 'bg-[#030303]',
    subtle: 'bg-[#0A0A0A]',
    dark: 'bg-[#000000]',
    gradient: 'bg-[#030303] relative overflow-hidden',
  };

  const densityClasses =
    density === 'spacious'
      ? 'py-14 sm:py-16 lg:py-20'
      : density === 'hero'
        ? 'pt-2 sm:pt-4 pb-8 sm:pb-10'
        : 'py-10 sm:py-14 lg:py-16';

  return (
    <section id={id} className={`w-full ${densityClasses} relative ${bgClasses[background]} ${className}`}>
      {background === 'gradient' && (
        <>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[480px] bg-gradient-to-b from-[#FF7A00]/[0.04] via-[#A855F7]/[0.02] to-transparent blur-[100px] pointer-events-none" />
        </>
      )}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {children}
      </div>
    </section>
  );
};
