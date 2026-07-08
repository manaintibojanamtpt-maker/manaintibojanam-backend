export const radius = {
  none: '0',
  sm: '0.5rem',
  md: '0.75rem',
  lg: '1rem',
  xl: '1.25rem',
  '2xl': '1.5rem',
  '3xl': '1.75rem',
  pill: '9999px',
  card: '1.5rem',
  sheet: '1.75rem 1.75rem 0 0',
} as const;

export type RadiusKey = keyof typeof radius;
