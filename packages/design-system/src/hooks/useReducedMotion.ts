import { mediaQueries } from '../tokens/breakpoints';
import { useMediaQuery } from './useMediaQuery';

export function useReducedMotion(): boolean {
  return useMediaQuery(mediaQueries.reducedMotion);
}

export function useBreakpoint(breakpoint: Exclude<keyof typeof mediaQueries, 'reducedMotion'>): boolean {
  return useMediaQuery(mediaQueries[breakpoint]);
}
