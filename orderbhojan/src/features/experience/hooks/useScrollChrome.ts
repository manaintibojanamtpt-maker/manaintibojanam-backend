import { useEffect, useState } from 'react';
import { useReducedMotion } from '@bhojan/design-system';

/** Visual-only scroll state for glass header / pinned search chrome. */
export function useScrollChrome(threshold = 32): boolean {
  const reducedMotion = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (reducedMotion) return undefined;

    const onScroll = () => {
      setScrolled(window.scrollY > threshold);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold, reducedMotion]);

  return scrolled;
}
