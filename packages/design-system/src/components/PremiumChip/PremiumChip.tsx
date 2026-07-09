import React from 'react';

import { cn } from '../../utils/cn';

import { AppetiteImage, type AppetitePictureSource } from '../AppetiteImage';

export interface PremiumChipProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  label: string;
  imageUrl?: string;
  imageSrcSet?: string;
  imageSizes?: string;
  imageBlurDataURL?: string;
  imageSources?: readonly AppetitePictureSource[];
  imageFallbackSrc?: string;
  emoji?: string;

  selected?: boolean;

  className?: string;

}



export function PremiumChip({

  label,
  imageUrl,
  imageSrcSet,
  imageSizes,
  imageBlurDataURL,
  imageSources,
  imageFallbackSrc,
  emoji,

  selected,

  className,

  ...props

}: PremiumChipProps) {

  return (

    <button

      type="button"

      className={cn('bds-premium-chip', selected && 'bds-premium-chip--selected', className)}

      aria-pressed={selected}

      {...props}

    >

      <span className="bds-premium-chip__circle">

        {imageUrl ? (

          <AppetiteImage
            src={imageUrl}
            alt=""
            className="bds-premium-chip__photo"
            srcSet={imageSrcSet}
            sizes={imageSizes}
            blurDataURL={imageBlurDataURL}
            sources={imageSources}
            fallbackSrc={imageFallbackSrc}
          />

        ) : emoji ? (

          <span className="bds-premium-chip__emoji">{emoji}</span>

        ) : null}

      </span>

      <span className="bds-premium-chip__label">{label}</span>

    </button>

  );

}

