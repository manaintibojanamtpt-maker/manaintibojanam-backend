import React from 'react';
import { cn } from '../../utils/cn';
import { Badge } from '../Badge';
import { Card } from '../Card';

export interface RestaurantCardProps {
  name: string;
  cuisine?: string;
  rating?: number;
  eta?: string;
  imageUrl?: string;
  offer?: string;
  className?: string;
  onClick?: () => void;
}

export function RestaurantCard({ name, cuisine, rating, eta, imageUrl, offer, className, onClick }: RestaurantCardProps) {
  return (
    <Card interactive className={cn('bds-restaurant-card', className)} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
      {imageUrl ? <img src={imageUrl} alt="" className="bds-restaurant-card__media" /> : <div className="bds-restaurant-card__media" aria-hidden />}
      <div className="bds-restaurant-card__body">
        <div className="bds-text-subtitle">{name}</div>
        {cuisine ? <div className="bds-text-caption" style={{ color: 'var(--bds-color-text-secondary)' }}>{cuisine}</div> : null}
        <div style={{ display: 'flex', gap: 'var(--bds-space-2)', flexWrap: 'wrap' }}>
          {rating != null ? <Badge variant="rating">★ {rating.toFixed(1)}</Badge> : null}
          {eta ? <Badge variant="delivery">{eta}</Badge> : null}
          {offer ? <Badge variant="offer">{offer}</Badge> : null}
        </div>
      </div>
    </Card>
  );
}
