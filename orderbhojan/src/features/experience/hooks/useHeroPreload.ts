import { useEffect } from 'react';

export function useHeroPreload(href: string, imageSrcSet?: string): void {
  useEffect(() => {
    if (!href) return undefined;

    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = href;
    link.type = 'image/webp';
    if (imageSrcSet) {
      link.setAttribute('imagesrcset', imageSrcSet);
      link.setAttribute('imagesizes', '100vw');
    }
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
    };
  }, [href, imageSrcSet]);
}
