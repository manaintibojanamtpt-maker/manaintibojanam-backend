import { useCallback, useState } from 'react';

/** Visual-only progressive image reveal (blur-up). */
export function useBlurUpImage() {
  const [loaded, setLoaded] = useState(false);
  const onLoad = useCallback(() => setLoaded(true), []);
  return { loaded, onLoad, className: loaded ? 'ob-img ob-img--loaded' : 'ob-img ob-img--loading' };
}
