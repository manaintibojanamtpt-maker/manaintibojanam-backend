import React from 'react';
import { cn } from '../../utils/cn';
import { AppetiteImage, type AppetitePictureSource } from '../AppetiteImage';

export interface DishPosterProps {
  name: string;
  price: React.ReactNode;
  imageUrl: string;
  imageAlt?: string;
  imageSrcSet?: string;
  imageSizes?: string;
  imageBlurDataURL?: string;
  imageSources?: readonly AppetitePictureSource[];
  imagePriority?: boolean;
  className?: string;
  onPress?: () => void;
  addAction?: React.ReactNode;
}

export function DishPoster({
  name,
  price,
  imageUrl,
  imageAlt = '',
  imageSrcSet,
  imageSizes,
  imageBlurDataURL,
  imageSources,
  imagePriority = false,
  className,
  onPress,
  addAction,
}: DishPosterProps) {
  const Tag = onPress ? 'button' : 'article';

  return (
    <Tag
      type={onPress ? 'button' : undefined}
      className={cn('bds-dish-poster', className)}
      onClick={onPress}
      aria-label={onPress ? `${name}, ${typeof price === 'string' ? price : 'view dish'}` : undefined}
    >
      <AppetiteImage
        src={imageUrl}
        alt={imageAlt || name}
        className="bds-dish-poster__image"
        srcSet={imageSrcSet}
        sizes={imageSizes}
        blurDataURL={imageBlurDataURL}
        sources={imageSources}
        priority={imagePriority}
      />
      <div className="bds-dish-poster__scrim" aria-hidden />
      {addAction ? <div className="bds-dish-poster__add">{addAction}</div> : null}
      <div className="bds-dish-poster__meta">
        <span className="bds-dish-poster__name">{name}</span>
        <span className="bds-dish-poster__price">{price}</span>
      </div>
    </Tag>
  );
}

export interface DishPosterAddButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
}

export function DishPosterAddButton({ label = 'Add', className, ...props }: DishPosterAddButtonProps) {
  return (
    <button type="button" className={cn('bds-dish-poster__add-btn', className)} {...props}>
      <span aria-hidden>+</span>
      <span className="bds-sr-only">{label}</span>
    </button>
  );
}
