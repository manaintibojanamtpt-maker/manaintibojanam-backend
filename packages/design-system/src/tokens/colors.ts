/**
 * BDS semantic colors — abstracted from Mana Inti Bojanam storefront (src/index.css).
 * Components MUST use semantic tokens only — never raw hex in component files.
 */

export const palette = {
  orange: {
    50: '#FFF7ED',
    100: '#FFEDD5',
    200: '#FED7AA',
    300: '#FDBA74',
    400: '#FF9F1C',
    500: '#FF6B35',
    600: '#FF6B35',
    700: '#E85D04',
    800: '#C2410C',
    900: '#9A3412',
  },
  neutral: {
    0: '#FFFFFF',
    50: '#FFFAF3',
    100: '#F4EDE4',
    200: '#D0C4B5',
    300: '#B9ADA1',
    400: '#8A8178',
    500: '#6B635C',
    600: '#4A4540',
    700: '#2A2623',
    800: '#120D0A',
    900: '#0E0A08',
    950: '#070504',
    1000: '#030303',
  },
  success: { 500: '#22C55E', 600: '#16A34A' },
  warning: { 500: '#F59E0B', 600: '#D97706' },
  danger: { 500: '#EF4444', 600: '#DC2626' },
  info: { 500: '#3B82F6', 600: '#2563EB' },
  veg: { 500: '#22C55E', border: '#15803D' },
  nonVeg: { 500: '#EF4444', border: '#B91C1C' },
  rating: { 500: '#FBBF24' },
  offer: { 500: '#FF6B35', bg: 'rgba(255, 107, 53, 0.12)' },
  delivery: { 500: '#38BDF8' },
  discount: { 500: '#A855F7' },
  analytics: { 500: '#818CF8', gradientEnd: '#A855F7' },
} as const;

export type ThemeMode = 'light' | 'dark' | 'brand' | 'food' | 'foodLight' | 'system';

export interface SemanticColors {
  primary: string;
  primaryHover: string;
  secondary: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  background: string;
  surface: string;
  card: string;
  divider: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textDisabled: string;
  offer: string;
  veg: string;
  nonVeg: string;
  delivery: string;
  rating: string;
  discount: string;
  analytics: string;
  focusRing: string;
}

export const lightSemantic: SemanticColors = {
  primary: palette.orange[500],
  primaryHover: palette.orange[600],
  secondary: palette.neutral[700],
  success: palette.success[500],
  warning: palette.warning[500],
  danger: palette.danger[500],
  info: palette.info[500],
  background: '#FAFAF8',
  surface: palette.neutral[0],
  card: palette.neutral[0],
  divider: 'rgba(0, 0, 0, 0.06)',
  border: 'rgba(0, 0, 0, 0.08)',
  textPrimary: palette.neutral[950],
  textSecondary: palette.neutral[500],
  textDisabled: palette.neutral[300],
  offer: palette.offer[500],
  veg: palette.veg[500],
  nonVeg: palette.nonVeg[500],
  delivery: palette.delivery[500],
  rating: palette.rating[500],
  discount: palette.discount[500],
  analytics: palette.analytics[500],
  focusRing: palette.orange[500],
};

/** Default — Mana Inti luxury dark storefront */
export const darkSemantic: SemanticColors = {
  primary: palette.orange[500],
  primaryHover: palette.orange[400],
  secondary: palette.neutral[300],
  success: palette.success[500],
  warning: palette.warning[500],
  danger: palette.danger[500],
  info: palette.info[500],
  background: palette.neutral[950],
  surface: palette.neutral[900],
  card: palette.neutral[800],
  divider: 'rgba(255, 255, 255, 0.06)',
  border: 'rgba(255, 255, 255, 0.08)',
  textPrimary: palette.neutral[50],
  textSecondary: palette.neutral[300],
  textDisabled: palette.neutral[400],
  offer: palette.offer[500],
  veg: palette.veg[500],
  nonVeg: palette.nonVeg[500],
  delivery: palette.delivery[500],
  rating: palette.rating[500],
  discount: palette.discount[500],
  analytics: palette.analytics[500],
  focusRing: palette.orange[500],
};

export const brandSemantic: SemanticColors = {
  ...darkSemantic,
  background: palette.neutral[1000],
  primary: palette.orange[500],
};

export const foodSemantic: SemanticColors = {
  ...darkSemantic,
  background: '#070504',
  surface: '#120d0a',
  card: '#120d0a',
  primary: palette.orange[500],
  primaryHover: palette.orange[400],
  offer: palette.offer[500],
  focusRing: palette.orange[500],
};

export const foodLightSemantic: SemanticColors = {
  ...lightSemantic,
  background: palette.neutral[50],
  surface: '#FFF8F0',
  card: '#FFF8F0',
  textPrimary: palette.neutral[800],
  textSecondary: palette.neutral[500],
  primary: palette.orange[500],
};

export function getSemanticColors(mode: Exclude<ThemeMode, 'system'>): SemanticColors {
  switch (mode) {
    case 'light':
      return lightSemantic;
    case 'foodLight':
      return foodLightSemantic;
    case 'brand':
      return brandSemantic;
    case 'food':
      return foodSemantic;
    case 'dark':
    default:
      return darkSemantic;
  }
}

export function semanticColorsToCssVars(colors: SemanticColors): Record<string, string> {
  return {
    '--bds-color-primary': colors.primary,
    '--bds-color-primary-hover': colors.primaryHover,
    '--bds-color-secondary': colors.secondary,
    '--bds-color-success': colors.success,
    '--bds-color-warning': colors.warning,
    '--bds-color-danger': colors.danger,
    '--bds-color-info': colors.info,
    '--bds-color-background': colors.background,
    '--bds-color-surface': colors.surface,
    '--bds-color-card': colors.card,
    '--bds-color-divider': colors.divider,
    '--bds-color-border': colors.border,
    '--bds-color-text-primary': colors.textPrimary,
    '--bds-color-text-secondary': colors.textSecondary,
    '--bds-color-text-disabled': colors.textDisabled,
    '--bds-color-offer': colors.offer,
    '--bds-color-veg': colors.veg,
    '--bds-color-non-veg': colors.nonVeg,
    '--bds-color-delivery': colors.delivery,
    '--bds-color-rating': colors.rating,
    '--bds-color-discount': colors.discount,
    '--bds-color-analytics': colors.analytics,
    '--bds-color-focus-ring': colors.focusRing,
  };
}
