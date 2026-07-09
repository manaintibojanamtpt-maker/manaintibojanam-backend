/**
 * Lightweight motion tier for hero animations — separate from prefers-reduced-motion.
 * Targets mid-range Android: fall back to static hero when hardware/network is weak.
 */

export type MotionTier = 'rich' | 'static';

type NetworkInformationLike = {
  effectiveType?: string;
  saveData?: boolean;
};

function readNetworkHints(): { slow: boolean; saveData: boolean } {
  if (typeof navigator === 'undefined') {
    return { slow: false, saveData: false };
  }
  const connection = (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
  if (!connection) {
    return { slow: false, saveData: false };
  }
  const effectiveType = connection.effectiveType ?? '';
  const slow =
    effectiveType === 'slow-2g' ||
    effectiveType === '2g' ||
    effectiveType === '3g';
  return { slow, saveData: Boolean(connection.saveData) };
}

/** Sync heuristics — safe for first paint. */
export function getInitialMotionTier(): MotionTier {
  if (typeof window === 'undefined') return 'static';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return 'static';
  }

  const cores = navigator.hardwareConcurrency ?? 4;
  const { slow, saveData } = readNetworkHints();

  if (saveData || slow) return 'static';
  if (cores <= 4) return 'static';

  // Low device memory hint (Chrome/Android) — 4GB or less → static hero
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (typeof deviceMemory === 'number' && deviceMemory > 0 && deviceMemory <= 4) {
    return 'static';
  }

  return 'rich';
}

/** ~500ms rAF sample — downgrade if frame rate is poor. */
export function measureFrameRate(callback: (fps: number) => void): () => void {
  if (typeof window === 'undefined') {
    callback(60);
    return () => undefined;
  }

  let frames = 0;
  let start = 0;
  let rafId = 0;

  const tick = (timestamp: number) => {
    if (!start) start = timestamp;
    frames += 1;
    const elapsed = timestamp - start;
    if (elapsed < 500) {
      rafId = window.requestAnimationFrame(tick);
      return;
    }
    const fps = frames / (elapsed / 1000);
    callback(fps);
  };

  rafId = window.requestAnimationFrame(tick);
  return () => window.cancelAnimationFrame(rafId);
}

export const MOTION_FPS_FLOOR = 50;
