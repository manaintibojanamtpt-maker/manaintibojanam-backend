/** Icon name registry for BDS — consumers may map to lucide or custom SVG sets. */
export const bdsIconNames = [
  'search',
  'cart',
  'heart',
  'star',
  'home',
  'user',
  'menu',
  'close',
  'chevron-right',
  'chevron-left',
  'location',
  'clock',
  'veg',
  'non-veg',
] as const;

export type BdsIconName = (typeof bdsIconNames)[number];
