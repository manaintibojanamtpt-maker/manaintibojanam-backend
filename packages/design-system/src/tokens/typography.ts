export const fontFamily = {
  sans: '"Plus Jakarta Sans", ui-sans-serif, system-ui, -apple-system, sans-serif',
  display: '"Outfit", "Plus Jakarta Sans", ui-sans-serif, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
} as const;

export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  black: 900,
} as const;

export const fontSize = {
  displayXl: '3rem',
  display: '2.25rem',
  heading: '1.875rem',
  title: '1.5rem',
  subtitle: '1.125rem',
  bodyLg: '1rem',
  body: '0.9375rem',
  bodySm: '0.875rem',
  caption: '0.75rem',
  label: '0.6875rem',
  button: '0.875rem',
  price: '1.125rem',
  discount: '0.8125rem',
  rating: '0.8125rem',
} as const;

export const lineHeight = {
  displayXl: 1.1,
  display: 1.15,
  heading: 1.2,
  title: 1.25,
  subtitle: 1.35,
  body: 1.5,
  caption: 1.4,
  price: 1.2,
} as const;

export const letterSpacing = {
  tight: '-0.02em',
  normal: '0',
  wide: '0.04em',
  wider: '0.08em',
} as const;

export type TypographyVariant =
  | 'displayHero'
  | 'displayXl'
  | 'display'
  | 'heading'
  | 'title'
  | 'titleSm'
  | 'subtitle'
  | 'bodyLg'
  | 'body'
  | 'bodySm'
  | 'caption'
  | 'label'
  | 'microLabel'
  | 'button'
  | 'price'
  | 'priceLg'
  | 'discount'
  | 'rating';

export const typographyVariants: Record<
  TypographyVariant,
  { fontSize: string; lineHeight: number; fontWeight: number; letterSpacing?: string; fontFamily?: string }
> = {
  displayHero: { fontSize: 'clamp(2.75rem, 8vw, 5rem)', lineHeight: 0.95, fontWeight: fontWeight.black, fontFamily: fontFamily.display, letterSpacing: '-0.04em' },
  displayXl: { fontSize: fontSize.displayXl, lineHeight: lineHeight.displayXl, fontWeight: fontWeight.black, fontFamily: fontFamily.display, letterSpacing: letterSpacing.tight },
  display: { fontSize: fontSize.display, lineHeight: lineHeight.display, fontWeight: fontWeight.extrabold, fontFamily: fontFamily.display, letterSpacing: letterSpacing.tight },
  heading: { fontSize: fontSize.heading, lineHeight: lineHeight.heading, fontWeight: fontWeight.bold, fontFamily: fontFamily.display },
  title: { fontSize: fontSize.title, lineHeight: lineHeight.title, fontWeight: fontWeight.bold },
  titleSm: { fontSize: '1.25rem', lineHeight: 1.15, fontWeight: fontWeight.bold },
  subtitle: { fontSize: fontSize.subtitle, lineHeight: lineHeight.subtitle, fontWeight: fontWeight.semibold },
  bodyLg: { fontSize: fontSize.bodyLg, lineHeight: lineHeight.body, fontWeight: fontWeight.regular },
  body: { fontSize: fontSize.body, lineHeight: lineHeight.body, fontWeight: fontWeight.regular },
  bodySm: { fontSize: fontSize.bodySm, lineHeight: lineHeight.body, fontWeight: fontWeight.regular },
  caption: { fontSize: fontSize.caption, lineHeight: lineHeight.caption, fontWeight: fontWeight.medium },
  label: { fontSize: fontSize.label, lineHeight: lineHeight.caption, fontWeight: fontWeight.bold, letterSpacing: letterSpacing.wider },
  microLabel: { fontSize: '0.625rem', lineHeight: 1.2, fontWeight: fontWeight.black, letterSpacing: '0.25em' },
  button: { fontSize: fontSize.button, lineHeight: 1.2, fontWeight: fontWeight.bold },
  price: { fontSize: fontSize.price, lineHeight: lineHeight.price, fontWeight: fontWeight.bold, letterSpacing: letterSpacing.tight },
  priceLg: { fontSize: '1.25rem', lineHeight: 1.2, fontWeight: fontWeight.extrabold, letterSpacing: letterSpacing.tight },
  discount: { fontSize: fontSize.discount, lineHeight: 1.2, fontWeight: fontWeight.semibold },
  rating: { fontSize: fontSize.rating, lineHeight: 1.2, fontWeight: fontWeight.semibold },
};
