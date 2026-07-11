import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  /** @deprecated animations removed — kept for call-site compatibility */
  delay?: number;
  hoverEffect?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  hoverEffect = true,
}) => {
  return (
    <div
      className={`relative group bg-[#0A0A0A] rounded-[2rem] p-8 border border-white/[0.08] ${
        hoverEffect ? 'hover:shadow-xl hover:border-white/20 transition-all duration-500' : ''
      } ${className}`}
    >
      {hoverEffect && (
        <div className="absolute inset-0 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-[#FF6B00]/20 via-transparent to-[#A855F7]/20 pointer-events-none -z-10" />
      )}
      {children}
    </div>
  );
};
