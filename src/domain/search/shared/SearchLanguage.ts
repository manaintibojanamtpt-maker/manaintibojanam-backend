/**
 * Search domain — locale normalization (M4 PR-2).
 * India marketplace v1: case-insensitive ASCII folding.
 */

const COMBINING_MARKS = /[\u0300-\u036f]/g;

/** Strip combining diacritic marks after NFD decomposition. */
export function stripDiacritics(value: string): string {
  return value.normalize('NFD').replace(COMBINING_MARKS, '');
}

/** Collapse internal whitespace to single spaces. */
export function collapseWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

/** Lowercase + trim — base locale step. */
export function toSearchLocale(value: string): string {
  return collapseWhitespace(value).toLowerCase();
}

/** Full normalization pipeline for deterministic text matching. */
export function normalizeForMatch(value: string): string {
  return toSearchLocale(stripDiacritics(value));
}

/** Slug-style normalization for tag and cuisine comparisons. */
export function normalizeTagToken(value: string): string {
  return normalizeForMatch(value).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
