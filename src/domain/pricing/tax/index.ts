/**
 * Domain — Tax placeholder (M8 PR-2).
 * Structural types only — calculations deferred to future PRs.
 */

export type { GSTCategory, GSTRate, GSTBreakdown, TaxRate, TaxComponent } from '../gst/GST';
export { validateGSTRate, validateGSTCategory, validateGSTBreakdown } from '../gst/GSTValidation';
