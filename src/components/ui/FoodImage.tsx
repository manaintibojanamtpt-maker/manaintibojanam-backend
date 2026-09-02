import React, { memo, useState } from 'react';
import { UtensilsCrossed } from 'lucide-react';

interface FoodImageProps {
  src?: string;
  alt: string;
  /** Aspect ratio for the image container. Defaults to square (food-list thumb). */
  ratio?: 'square' | 'video' | 'tall';
  className?: string;
  /** Icon/element shown when the image is missing or fails to load. */
  fallback?: React.ReactNode;
  /** Applied on the wrapper — the hover zoom targets the <img>. */
  zoomOnHover?: boolean;
}

const RATIO_CLASS: Record<NonNullable<FoodImageProps['ratio']>, string> = {
  square: 'aspect-square',
  video: 'aspect-[4/3]',
  tall: 'aspect-[3/4]',
};

/**
 * Unified food image with a safe lifecycle:
 *   1. Loading → subtle skeleton shimmer (image wrapper stays sized → no layout shift)
 *   2. Success → smooth fade-in
 *   3. Error / empty → branded orange fallback (never a broken-image icon)
 *
 * Deliberately static JSX + CSS: content renders regardless of JS animation.
 */
export const FoodImage = memo(function FoodImage({
  src,
  alt,
  ratio = 'square',
  className = '',
  fallback,
  zoomOnHover = false,
}: FoodImageProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>(src ? 'loading' : 'error');

  const showSkeleton = status === 'loading';
  const showImage = status === 'loaded';
  const showFallback = status === 'error';

  const imgClasses = [
    'h-full w-full object-cover object-center transition-opacity duration-300',
    showImage ? 'opacity-100' : 'opacity-0',
    zoomOnHover ? 'group-hover:scale-[1.04] transition-transform duration-500' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={`relative ${RATIO_CLASS[ratio]} shrink-0 overflow-hidden rounded-lg bg-[#0A0A0A] ${className}`}
      role="img"
      aria-label={alt}
    >
      {showSkeleton && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-[#1a1410] to-[#0A0A0A]" aria-hidden />
      )}

      {src ? (
        <img
          src={src}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
          className={imgClasses}
        />
      ) : null}

      {showFallback && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#FF7A00]/15 to-[#1a1410]"
          aria-hidden
        >
          {fallback ?? <UtensilsCrossed size={20} className="text-[#FF7A00]/60" />}
        </div>
      )}
    </div>
  );
});

export default FoodImage;