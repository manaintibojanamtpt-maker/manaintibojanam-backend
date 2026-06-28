import { useEffect, useState } from 'react';

export function useCountUp(
  target: number,
  duration = 1800,
  enabled = true,
  decimals = 0,
): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setValue(target);
      return;
    }

    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = target * eased;
      setValue(decimals > 0 ? parseFloat(next.toFixed(decimals)) : Math.round(next));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, enabled, decimals]);

  return value;
}
