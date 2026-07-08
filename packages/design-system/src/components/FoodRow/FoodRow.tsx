import React from 'react';
import { cn } from '../../utils/cn';
import { Button } from '../Button';
import { AppetiteImage, type AppetitePictureSource } from '../AppetiteImage';

export interface FoodRowProps {
  name: string;
  description?: string;
  price: React.ReactNode;
  imageUrl?: string;
  imageAlt?: string;
  imageSrcSet?: string;
  imageSizes?: string;
  imageBlurDataURL?: string;
  imageSources?: readonly AppetitePictureSource[];
  imagePriority?: boolean;
  badge?: React.ReactNode;
  meta?: React.ReactNode;
  action?: React.ReactNode;
  onPress?: () => void;
  density?: 'default' | 'compact' | 'editorial';
  className?: string;
}

export function FoodRow({
  name,
  description,
  price,
  imageUrl,
  imageAlt = '',
  imageSrcSet,
  imageSizes,
  imageBlurDataURL,
  imageSources,
  imagePriority = false,
  badge,
  meta,
  action,
  onPress,
  density = 'default',
  className,
}: FoodRowProps) {
  const Tag = onPress ? 'button' : 'div';
  const densityClass =
    density === 'compact'
      ? 'bds-food-row--compact'
      : density === 'editorial'
        ? 'bds-food-row--editorial'
        : undefined;

  return (
    <Tag
      type={onPress ? 'button' : undefined}
      className={cn('bds-food-row', densityClass, className)}
      onClick={onPress}
    >
      <div className="bds-food-row__body">
        {badge ? <div className="bds-food-row__badges">{badge}</div> : null}
        <div className="bds-food-row__name bds-text-title-sm">{name}</div>
        {description ? (
          <p
            className={cn(
              'bds-text-body-sm bds-food-row__description',
              density === 'editorial' && 'bds-food-row__description--single',
            )}
            style={{ color: 'var(--bds-color-text-secondary)' }}
          >
            {description}
          </p>
        ) : null}
        {meta ? <div className="bds-food-row__meta">{meta}</div> : null}
        <div className="bds-food-row__price bds-text-price-lg" style={{ color: 'var(--bds-color-primary)' }}>
          {price}
        </div>
      </div>
      <div className="bds-food-row__thumb-wrap">
        {imageUrl ? (
          <AppetiteImage
            src={imageUrl}
            alt={imageAlt}
            className="bds-food-row__thumb"
            srcSet={imageSrcSet}
            sizes={imageSizes}
            blurDataURL={imageBlurDataURL}
            sources={imageSources}
            priority={imagePriority}
          />
        ) : (
          <div className="bds-food-row__thumb bds-food-row__thumb--empty" aria-hidden />
        )}
        {action ? <div className="bds-food-row__add">{action}</div> : null}
      </div>
    </Tag>
  );
}

export interface FoodRowAddButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
}

export function FoodRowAddButton({ label = 'Add', className, ...props }: FoodRowAddButtonProps) {
  return (
    <Button variant="primary" className={cn('bds-btn--appetite', className)} {...props}>
      {label}
    </Button>
  );
}
