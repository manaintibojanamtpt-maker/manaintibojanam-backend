/** Design system token constants — verified Phase 5 */
export const colors = {
  primary: '#FF7A00',
  primaryLight: '#FF9F43',
  accent: '#FFB366',
  brandBg: '#070504',
  cardBg: '#120D0A',
  surface: '#0E0A08',
  textMain: '#FFFAF3',
  textSecondary: '#B9ADA1',
  accentRed: '#FF6B35',
  mibOrange: '25, 100%, 50%',
  mibGold: '45, 100%, 51%',
} as const;

export const fonts = {
  sans: 'Plus Jakarta Sans',
  display: 'Outfit',
} as const;

export const spacing = {
  0: '0',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  6: '1.5rem',
  8: '2rem',
  12: '3rem',
  16: '4rem',
  safeBottom: 'calc(0.75rem + env(safe-area-inset-bottom))',
} as const;

export const radius = {
  sm: '0.75rem',
  md: '1rem',
  lg: '1.25rem',
  xl: '1.5rem',
  '2xl': '1.75rem',
  '3xl': '2rem',
  pill: '9999px',
  card: '1.75rem',
} as const;

export const elevation = {
  card: '0 10px 40px -10px rgba(0, 0, 0, 0.5), 0 1px 0 rgba(255, 255, 255, 0.02) inset',
  glow: '0 0 30px -10px rgba(255, 107, 53, 0.25)',
  cta: '0 12px 24px -12px rgba(255, 107, 53, 0.5)',
  nav: '0 20px 50px rgba(0, 0, 0, 0.5)',
} as const;

export const motion = {
  durationFast: '150ms',
  durationNormal: '300ms',
  durationSlow: '500ms',
  easeSpring: 'cubic-bezier(0.22, 1, 0.36, 1)',
  easeStandard: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export const glass = {
  background: 'rgba(18, 13, 10, 0.7)',
  blur: '20px',
  border: '1px solid rgba(255, 255, 255, 0.08)',
} as const;

/** Token CSS entry paths (import for verification; not wired to founder index.css yet) */
export const tokenStyles = {
  colors: './colors.css',
  typography: './typography.css',
  spacing: './spacing.css',
  radius: './radius.css',
  elevation: './elevation.css',
  glass: './glass.css',
  motion: './motion.css',
} as const;
