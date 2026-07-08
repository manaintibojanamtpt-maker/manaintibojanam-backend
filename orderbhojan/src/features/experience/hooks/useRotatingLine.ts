import { useEffect, useState } from 'react';

export function useRotatingLine(lines: readonly string[], intervalMs = 8000): string {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (lines.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % lines.length);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [lines, intervalMs]);

  return lines[index] ?? lines[0] ?? '';
}
