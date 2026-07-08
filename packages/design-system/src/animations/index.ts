export const bdsMotionPresets = {
  pageEnter: 'bds-motion-page-enter',
  dialogEnter: 'bds-motion-dialog-enter',
  sheetEnter: 'bds-motion-sheet-enter',
  cartPulse: 'bds-motion-cart-pulse',
  favoritePop: 'bds-motion-favorite-pop',
  skeleton: 'bds-skeleton',
} as const;

export type BdsMotionPreset = keyof typeof bdsMotionPresets;
