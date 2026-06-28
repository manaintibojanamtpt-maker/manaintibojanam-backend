import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SoftButtonTone, SoftButtonSize } from '../ui/SoftButton';

interface MarketingSoftCTAProps {
  children: React.ReactNode;
  to?: string;
  onClick?: () => void;
  size?: SoftButtonSize;
  tone?: SoftButtonTone;
  className?: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
}

/** Marketing alias — uses shared .soft-btn / .marketing-soft-cta styles */
export const MarketingSoftCTA: React.FC<MarketingSoftCTAProps> = ({
  children,
  to,
  onClick,
  size = 'default',
  tone = 'primary',
  className = '',
  type = 'button',
  disabled = false,
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (disabled) return;
    onClick?.();
    if (!to) return;
    if (
      to.startsWith('/owner') ||
      to.startsWith('/admin') ||
      to.startsWith('/super-admin') ||
      to.startsWith('/k/')
    ) {
      window.location.href = to;
      return;
    }
    navigate(to);
  };

  const toneClass: Record<SoftButtonTone, string> = {
    primary: '',
    ghost: 'marketing-soft-cta--ghost soft-btn--ghost',
    danger: 'soft-btn--danger',
    secondary: 'soft-btn--secondary',
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={handleClick}
      className={[
        'marketing-soft-cta',
        'soft-btn',
        toneClass[tone],
        size === 'compact' ? 'marketing-soft-cta--compact soft-btn--compact' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="marketing-soft-cta-inner soft-btn__inner">{children}</span>
    </button>
  );
};

export default MarketingSoftCTA;
