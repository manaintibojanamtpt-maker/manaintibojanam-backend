import React, { useState } from 'react';
import { cn } from '../../utils/cn';

export interface AppetitePictureSource {
  type: string;
  srcSet: string;
  sizes?: string;
}

export interface AppetiteImageProps {
  src: string;
  alt: string;
  className?: string;
  aspectRatio?: string;
  priority?: boolean;
  srcSet?: string;
  sizes?: string;
  blurDataURL?: string;
  sources?: readonly AppetitePictureSource[];
}

export function AppetiteImage({
  src,
  alt,
  className,
  aspectRatio,
  priority = false,
  srcSet,
  sizes,
  blurDataURL,
  sources,
}: AppetiteImageProps) {
  const [loaded, setLoaded] = useState(false);

  const placeholderStyle = !loaded && blurDataURL
    ? {
        backgroundImage: `url(${blurDataURL})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : undefined;

  return (
    <div
      className={cn('bds-appetite-image', className)}
      style={aspectRatio ? { aspectRatio, ...placeholderStyle } : placeholderStyle}
    >
      {!loaded ? (
        <div
          className={cn('bds-appetite-image__placeholder', blurDataURL && 'bds-appetite-image__placeholder--blur')}
          aria-hidden
          style={blurDataURL ? { backgroundImage: `url(${blurDataURL})` } : undefined}
        />
      ) : null}
      <picture className="bds-appetite-image__picture">
        {sources?.map((source) => (
          <source key={source.type} type={source.type} srcSet={source.srcSet} sizes={source.sizes} />
        ))}
        <img
          src={src}
          srcSet={srcSet}
          sizes={sizes}
          alt={alt}
          className={cn('bds-appetite-image__img', !loaded && 'bds-appetite-image__img--loading')}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          onLoad={() => setLoaded(true)}
        />
      </picture>
    </div>
  );
}
