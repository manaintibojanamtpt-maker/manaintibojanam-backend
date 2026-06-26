import React from 'react';
import { useNavigate } from 'react-router-dom';

interface CTAButtonProps {
  children: React.ReactNode;
  to?: string;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  className?: string;
}

export const CTAButton: React.FC<CTAButtonProps> = ({
  children,
  to,
  onClick,
  type = 'button',
  disabled = false,
  variant = 'primary',
  className = '',
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    onClick?.();
    if (to) navigate(to);
  };

  const baseClasses =
    'inline-flex items-center justify-center gap-2 font-semibold text-sm sm:text-base rounded-xl transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#030303] disabled:opacity-60 disabled:pointer-events-none active:scale-[0.98]';

  const variants = {
    primary:
      'bg-[#FF6B00] text-white hover:bg-[#E56D00] border border-[#FF6B00] px-6 py-3.5 sm:py-4',
    secondary:
      'bg-white text-[#111111] hover:bg-neutral-100 border border-white px-6 py-3.5 sm:py-4',
    outline:
      'bg-transparent text-neutral-200 hover:text-white hover:bg-white/[0.04] border border-white/15 hover:border-white/25 px-6 py-3.5 sm:py-4',
  };

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={disabled}
      className={`${baseClasses} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};
