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
      className={`relative group bg-[#120d0c] rounded-[2rem] p-8 border border-white/[0.08] ${
        hoverEffect ? 'hover:shadow-[0_12px_40px_rgba(0,0,0,0.35)] hover:border-[#e85d04]/20 transition-all duration-500' : ''
      } ${className}`}
    >
      {hoverEffect && (
        <div className="absolute inset-0 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-[#e85d04]/15 via-transparent to-[#f4a261]/10 pointer-events-none -z-10" />
      )}
      {children}
    </div>
  );
};
