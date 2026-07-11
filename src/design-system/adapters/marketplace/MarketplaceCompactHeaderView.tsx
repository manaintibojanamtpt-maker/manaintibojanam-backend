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
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="h-14 px-4 flex items-center justify-between gap-3 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {brandSlot}
          {locationSlot}
        </div>
        {children}
      </div>
    </header>
  );
};

export default MarketplaceCompactHeaderView;
