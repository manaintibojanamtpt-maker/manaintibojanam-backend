/** Order read source types (M6 PR-11). Pure domain — no SDK imports. */

export type OrderReadSource = 'legacy' | 'projection';

export function isProjectionReadSource(source: OrderReadSource): boolean {
  return source === 'projection';
}

export function isLegacyReadSource(source: OrderReadSource): boolean {
  return source === 'legacy';
}
