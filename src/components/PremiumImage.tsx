import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

// Global cache to track which URLs have already been loaded in this session
const loadedImageCache = new Set<string>();

interface PremiumImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  containerClassName?: string;
  fallbackImage?: string;
  useShimmer?: boolean;
}

export const PremiumImage: React.FC<PremiumImageProps> = ({
  src,
  alt,
  className,
  containerClassName,
  fallbackImage = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=40&w=200&auto=format&fit=crop',
  useShimmer = true,
  ...props
}) => {
  const imgRef = useRef<HTMLImageElement>(null);
  
  // If the src is in our cache, we know it's instantly available
  const isAlreadyCached = src ? loadedImageCache.has(src) : false;
  
  const [isLoaded, setIsLoaded] = useState(isAlreadyCached);
  const [hasError, setHasError] = useState(false);
  const [imgSrc, setImgSrc] = useState<string | undefined>(src);

  useEffect(() => {
    // Reset state if src changes, unless it's already in cache
    setImgSrc(src);
    if (src && loadedImageCache.has(src)) {
      setIsLoaded(true);
      setHasError(false);
    } else {
      setIsLoaded(false);
      setHasError(false);
    }
  }, [src]);

  // Check if image is already decoded/complete by the browser
  useEffect(() => {
    if (imgRef.current && imgRef.current.complete) {
      if (imgRef.current.naturalWidth > 0) {
        setIsLoaded(true);
        if (src) loadedImageCache.add(src);
      }
    }
  }, [src]);

  const handleLoad = () => {
    setIsLoaded(true);
    if (imgSrc) loadedImageCache.add(imgSrc);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(true);
  };

  return (
    <div className={cn("relative overflow-hidden bg-[#1A1F26]", containerClassName)}>
      {/* Shimmer/Blur Placeholder */}
      {(!isLoaded || hasError) && useShimmer && !isAlreadyCached && (
        <div className="absolute inset-0 z-0">
          <div className="w-full h-full bg-[#12161B] shimmer" />
        </div>
      )}

      {/* Actual Image */}
      <motion.img
        ref={imgRef}
        src={hasError ? fallbackImage : (imgSrc || fallbackImage)}
        alt={alt || "Image"}
        onLoad={handleLoad}
        onError={handleError}
        initial={isAlreadyCached ? false : { opacity: 0, filter: 'blur(10px)', scale: 1.05 }}
        animate={{ 
          opacity: isLoaded ? 1 : 0, 
          filter: isLoaded ? 'blur(0px)' : 'blur(10px)',
          scale: isLoaded ? 1 : 1.05
        }}
        transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
        className={cn(
          "w-full h-full object-cover z-10 relative",
          className
        )}
        {...(props as any)}
      />
    </div>
  );
};

export default PremiumImage;
