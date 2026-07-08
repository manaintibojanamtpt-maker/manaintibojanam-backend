import React from 'react';
import { cn } from '../../utils/cn';
import { Badge } from '../Badge';

export interface FoodCardProps {
  name: string;
  description?: string;
  price: string;
  imageUrl?: string;
  isVeg?: boolean;
  className?: string;
  action?: React.ReactNode;
}

export function FoodCard({ name, description, price, imageUrl, isVeg, className, action }: FoodCardProps) {
  return (
    <div className={cn('bds-food-card bds-card', className)}>
      {imageUrl ? <img src={imageUrl} alt="" className="bds-food-card__thumb" /> : <div className="bds-food-card__thumb" aria-hidden />}
      <div className="bds-food-card__body">
        {isVeg != null ? (
          <Badge variant={isVeg ? 'veg' : 'nonVeg'}>{isVeg ? 'Veg' : 'Non-Veg'}</Badge>
        ) : null}
        <div className="bds-food-card__name bds-text-subtitle">{name}</div>
        {description ? (
          <p className="bds-text-body-sm bds-food-card__description">{description}</p>
        ) : null}
        <div className="bds-food-card__footer">
          <div className="bds-text-price">{price}</div>
          {action ? <div className="bds-food-card__action">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}
