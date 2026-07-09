import { useEffect, useState } from 'react';
import {
  getInitialMotionTier,
  measureFrameRate,
  MOTION_FPS_FLOOR,
  type MotionTier,
} from '@/lib/deviceMotionCapability';

export interface KitchenHeroMotionState {
  tier: MotionTier;
  prefersReducedMotion: boolean;
  richMotion: boolean;
}

export function useKitchenHeroMotion(): KitchenHeroMotionState {
  const [tier, setTier] = useState<MotionTier>(() => getInitialMotionTier());
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (tier !== 'rich') return undefined;

    return measureFrameRate((fps) => {
      if (fps < MOTION_FPS_FLOOR) {
        setTier('static');
      }
    });
  }, [tier]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => {
      if (media.matches) setTier('static');
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const richMotion = tier === 'rich' && !prefersReducedMotion;

  return { tier, prefersReducedMotion, richMotion };
}
