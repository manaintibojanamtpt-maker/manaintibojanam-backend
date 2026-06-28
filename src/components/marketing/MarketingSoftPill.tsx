import React from 'react';

type SoftPillVariant = 'eyebrow' | 'badge' | 'accent' | 'tab';

interface MarketingSoftPillProps {
  children: React.ReactNode;
  variant?: SoftPillVariant;
  active?: boolean;
  className?: string;
  as?: 'span' | 'button';
  onClick?: () => void;
  role?: string;
  'aria-selected'?: boolean;
}

const variantClass: Record<SoftPillVariant, string> = {
  eyebrow: 'marketing-soft-pill marketing-soft-pill--eyebrow',
  badge: 'marketing-soft-pill marketing-soft-pill--badge',
  accent: 'marketing-soft-pill marketing-soft-pill--accent',
  tab: 'marketing-soft-pill marketing-soft-pill--tab',
};

const innerClass: Record<SoftPillVariant, string> = {
  eyebrow: 'marketing-soft-pill-inner marketing-soft-pill-inner--eyebrow',
  badge: 'marketing-soft-pill-inner marketing-soft-pill-inner--badge',
  accent: 'marketing-soft-pill-inner marketing-soft-pill-inner--accent',
  tab: 'marketing-soft-pill-inner marketing-soft-pill-inner--tab',
};

export const MarketingSoftPill: React.FC<MarketingSoftPillProps> = ({
  children,
  variant = 'badge',
  active = false,
  className = '',
  as = 'span',
  onClick,
  role,
  'aria-selected': ariaSelected,
}) => {
  const Tag = as;
  const pillClasses = [
    variantClass[variant],
    active ? 'marketing-soft-pill--active' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Tag
      type={as === 'button' ? 'button' : undefined}
      className={pillClasses}
      onClick={onClick}
      role={role}
      aria-selected={ariaSelected}
    >
      <span className={innerClass[variant]}>{children}</span>
    </Tag>
  );
};

export default MarketingSoftPill;
