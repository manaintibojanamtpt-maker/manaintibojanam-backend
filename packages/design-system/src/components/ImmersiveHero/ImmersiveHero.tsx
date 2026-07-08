import React from 'react';
import { cn } from '../../utils/cn';
import { AppetiteImage, type AppetitePictureSource } from '../AppetiteImage';

export interface ImmersiveHeroProps {
  imageUrl: string;
  imageAlt?: string;
  imageSrcSet?: string;
  imageSizes?: string;
  imageBlurDataURL?: string;
  imageSources?: readonly AppetitePictureSource[];
  microLabel?: string;
  headline?: React.ReactNode;
  subline?: React.ReactNode;
  locationSlot?: React.ReactNode;
  searchSlot?: React.ReactNode;
  className?: string;
  imagePriority?: boolean;
  /** Cinematic: 42vh, minimal copy, food dominates */
  variant?: 'default' | 'cinematic';
}

export function ImmersiveHero({
  imageUrl,
  imageAlt = '',
  imageSrcSet,
  imageSizes,
  imageBlurDataURL,
  imageSources,
  microLabel,
  headline,
  subline,
  locationSlot,
  searchSlot,
  className,
  imagePriority = false,
  variant = 'default',
}: ImmersiveHeroProps) {
  const cinematic = variant === 'cinematic';

  return (
    <section
      className={cn(
        'bds-immersive-hero',
        cinematic && 'bds-immersive-hero--cinematic',
        className,
      )}
      aria-label="Featured"
    >
      <div className="bds-immersive-hero__media">
        <AppetiteImage
          src={imageUrl}
          alt={imageAlt}
          priority={imagePriority}
          srcSet={imageSrcSet}
          sizes={imageSizes}
          blurDataURL={imageBlurDataURL}
          sources={imageSources}
        />
      </div>
      <div className="bds-immersive-hero__scrim" aria-hidden />
      {locationSlot ? <div className="bds-immersive-hero__location">{locationSlot}</div> : null}
      <div className="bds-immersive-hero__content">
        {!cinematic && microLabel ? (
          <div
            className="bds-text-micro-label bds-immersive-hero__micro"
          >
            {microLabel}
          </div>
        ) : null}
        {!cinematic && headline ? <div className="bds-text-display-hero">{headline}</div> : null}
        {subline ? (
          <p className={cn('bds-immersive-hero__subline', cinematic && 'bds-immersive-hero__subline--whisper')}>
            {subline}
          </p>
        ) : null}
        {searchSlot ? <div className="bds-immersive-hero__search">{searchSlot}</div> : null}
      </div>
    </section>
  );
}
