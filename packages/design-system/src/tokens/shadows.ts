export const shadows = {
  none: 'none',
  sm: '0 1px 2px rgba(0, 0, 0, 0.06)',
  md: '0 4px 12px rgba(0, 0, 0, 0.08)',
  lg: '0 12px 32px rgba(0, 0, 0, 0.12)',
  xl: '0 18px 36px -22px rgba(255, 107, 53, 0.85)',
  glow: '0 0 15px rgba(255, 122, 0, 0.25)',
  inner: 'inset 0 1px 0 rgba(255, 255, 255, 0.04)',
} as const;

export const elevation = {
  0: shadows.none,
  1: shadows.sm,
  2: shadows.md,
  3: shadows.lg,
  4: shadows.xl,
} as const;
