import React from 'react';

export interface MarketplaceCompactHeaderViewProps {
  children?: React.ReactNode;
  locationSlot?: React.ReactNode;
  brandSlot?: React.ReactNode;
  className?: string;
}

export const MarketplaceCompactHeaderView: React.FC<MarketplaceCompactHeaderViewProps> = ({
  children,
  locationSlot = null,
  brandSlot = null,
  className = '',
}) => {
  return (
    <header
      className={`sticky top-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/5 ${className}`}
      style={{ paddingTop: 0 }}
    >
      <div className="px-4 py-2 max-w-7xl mx-auto">
        <div className="flex min-h-10 items-center justify-between gap-3">
          <div className="min-w-0 shrink-0">{brandSlot}</div>
          {children}
        </div>
        {locationSlot ? (
          <div className="mt-1 min-w-0 max-w-full">{locationSlot}</div>
        ) : null}
      </div>
    </header>
  );
};

export default MarketplaceCompactHeaderView;
