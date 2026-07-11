import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SoftButton, SoftButtonTone, SoftButtonSize } from './SoftButton';

interface CTAButtonProps {
  children: React.ReactNode;
  to?: string;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  className?: string;
}

const variantTone: Record<NonNullable<CTAButtonProps['variant']>, SoftButtonTone> = {
  primary: 'primary',
  secondary: 'secondary',
  outline: 'ghost',
};

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

  return (
    <SoftButton
      type={type}
      tone={variantTone[variant]}
      disabled={disabled}
      onClick={handleClick}
      className={className}
    >
      {children}
    </SoftButton>
  );
};
