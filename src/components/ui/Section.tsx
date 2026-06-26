import React from 'react';

interface SectionProps {
  id?: string;
  children: React.ReactNode;
  className?: string;
  background?: 'default' | 'subtle' | 'dark' | 'gradient';
}

export const Section: React.FC<SectionProps> = ({ id, children, className = '', background = 'default' }) => {
  const bgClasses = {
    default: 'bg-[#030303]',
    subtle: 'bg-[#0A0A0A]',
    dark: 'bg-[#000000]',
    gradient: 'bg-[#030303] relative overflow-hidden'
  };

  return (
    <section id={id} className={`w-full py-24 sm:py-32 relative ${bgClasses[background]} ${className}`}>
      {background === 'gradient' && (
        <>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-[#FF6B00]/[0.03] via-[#A855F7]/[0.02] to-transparent blur-[120px] pointer-events-none" />
        </>
      )}
      <div className="max-w-[1200px] mx-auto px-6 lg:px-8 relative z-10">
        {children}
      </div>
    </section>
  );
};
