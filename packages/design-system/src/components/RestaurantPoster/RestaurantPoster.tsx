import React from 'react';
import { cn } from '../../utils/cn';
import { AppetiteImage, type AppetitePictureSource } from '../AppetiteImage';

export interface RestaurantPosterProps {
  name: string;
  imageUrl: string;
  imageAlt?: string;
  imageSrcSet?: string;
  imageSizes?: string;
  imageBlurDataURL?: string;
  imageSources?: readonly AppetitePictureSource[];
  imagePriority?: boolean;
  rating: number;
  eta: string;
  cuisine?: string;
  closed?: boolean;
  className?: string;
  onClick?: () => void;
}

export function RestaurantPoster({
  name,
  imageUrl,
  imageAlt = '',
  imageSrcSet,
  imageSizes,
  imageBlurDataURL,
  imageSources,
  imagePriority = false,
  rating,
  eta,
  cuisine,
  closed = false,
  className,
  onClick,
}: RestaurantPosterProps) {
  const stats = [cuisine, `★ ${rating.toFixed(1)}`, eta].filter(Boolean).join(' · ');

  return (
    <button
      type="button"
      className={cn('bds-restaurant-poster', closed && 'bds-restaurant-poster--closed', className)}
      onClick={onClick}
      aria-label={`${name}, ${stats}`}
    >
      <AppetiteImage
        src={imageUrl}
        alt={imageAlt || name}
        className="bds-restaurant-poster__image"
        srcSet={imageSrcSet}
        sizes={imageSizes}
        blurDataURL={imageBlurDataURL}
        sources={imageSources}
        priority={imagePriority}
      />
      <div className="bds-restaurant-poster__scrim" aria-hidden />
      {closed ? <span className="bds-restaurant-poster__closed">Closed</span> : null}
      <div className="bds-restaurant-poster__meta">
        <span className="bds-restaurant-poster__name">{name}</span>
        <span className="bds-restaurant-poster__stats">{stats}</span>
      </div>
    </button>
  );
}
