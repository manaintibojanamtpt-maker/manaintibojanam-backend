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
    const { disabled, onClick, onKeyDown, tabIndex, 'aria-disabled': ariaDisabled } = rest;
    return (
      <Link
        to={to}
        className={classes}
        onClick={onClick as unknown as React.MouseEventHandler<HTMLAnchorElement>}
        onKeyDown={onKeyDown as unknown as React.KeyboardEventHandler<HTMLAnchorElement>}
        tabIndex={tabIndex}
        aria-disabled={ariaDisabled ?? disabled}
      >
        {inner}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} className={classes} aria-disabled={rest.disabled}>
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
