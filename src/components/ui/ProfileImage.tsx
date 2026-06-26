import React, { useState } from 'react';

interface ProfileImageProps {
  name: string;
  imageUrl?: string;
  alt: string;
  className?: string;
}

export const ProfileImage: React.FC<ProfileImageProps> = ({ name, imageUrl, alt, className = '' }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Get initials for fallback
  const getInitials = (name: string) => {
    const parts = name.split(' ').filter(p => p.length > 0 && p.toLowerCase() !== 'm.');
    if (parts.length === 0) return 'EX';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const initials = getInitials(name);
  const showFallback = !imageUrl || imageError;

  return (
    <div className={`relative w-32 h-32 rounded-full flex-shrink-0 group ${className}`}>
      {/* Soft orange-purple gradient glow */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#FF6B00] to-[#A855F7] animate-pulse opacity-20 blur-md group-hover:opacity-60 transition-opacity duration-500" />
      
      <div className="absolute inset-[3px] rounded-full bg-[#0A0A0A] overflow-hidden z-10 flex items-center justify-center">
        {showFallback ? (
          <div 
            className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#111] to-[#1a1a1a]"
            aria-label={`Avatar for ${alt}`}
            role="img"
          >
            <span className="text-3xl font-black bg-gradient-to-tr from-[#FF6B00] to-[#A855F7] bg-clip-text text-transparent opacity-80">
              {initials}
            </span>
          </div>
        ) : (
          <>
            {!imageLoaded && (
              <div className="absolute inset-0 bg-white/5 animate-pulse" />
            )}
            <img
              src={imageUrl}
              alt={alt}
              loading="lazy"
              decoding="async"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
          </>
        )}
      </div>
    </div>
  );
};
