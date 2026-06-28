import React from 'react';
import { Link } from 'react-router-dom';

export type SoftButtonTone = 'primary' | 'ghost' | 'danger' | 'secondary';
export type SoftButtonSize = 'default' | 'compact';

export interface SoftButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: SoftButtonTone;
  size?: SoftButtonSize;
  fullWidth?: boolean;
  to?: string;
  href?: string;
  children: React.ReactNode;
}

const toneClass: Record<SoftButtonTone, string> = {
  primary: '',
  ghost: 'soft-btn--ghost',
  danger: 'soft-btn--danger',
  secondary: 'soft-btn--secondary',
};

export const SoftButton: React.FC<SoftButtonProps> = ({
  tone = 'primary',
  size = 'default',
  fullWidth = false,
  to,
  href,
  className = '',
  children,
  type = 'button',
  ...rest
}) => {
  const classes = [
    'soft-btn',
    toneClass[tone],
    size === 'compact' ? 'soft-btn--compact' : '',
    fullWidth ? 'soft-btn--block' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const inner = <span className="soft-btn__inner">{children}</span>;

  if (to) {
    return (
      <Link to={to} className={classes}>
        {inner}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} className={classes}>
        {inner}
      </a>
    );
  }

  return (
    <button type={type} className={classes} {...rest}>
      {inner}
    </button>
  );
};

export default SoftButton;
