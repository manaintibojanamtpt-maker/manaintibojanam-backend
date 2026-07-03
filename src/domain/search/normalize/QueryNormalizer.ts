/**
 * Search domain — query normalization (M4 PR-2).
 */

import { CUISINE_INFERENCE_PHRASES } from '../shared/SearchConstants';
import { normalizeForMatch } from '../shared/SearchLanguage';
import { validateRawSearchQuery } from '../shared/SearchValidation';
import type { NormalizedSearchQuery, RawSearchQueryInput, SearchValidationResult } from '../shared/types';
import { tokenizeNormalizedText, tokenizeSearchText } from './SearchTokenizer';

export interface QueryNormalizationResult {
  readonly ok: true;
  readonly query: NormalizedSearchQuery;
}

export interface QueryNormalizationFailure {
  readonly ok: false;
  readonly validation: SearchValidationResult;
}

export type QueryNormalizationOutcome = QueryNormalizationResult | QueryNormalizationFailure;

const inferCuisineTags = (normalizedText: string): readonly string[] => {
  if (!normalizedText) {
    return [];
  }

  const inferred = new Set<string>();

  for (const [phrase, tags] of Object.entries(CUISINE_INFERENCE_PHRASES)) {
    if (normalizedText === phrase || normalizedText.includes(phrase)) {
      tags.forEach((tag) => inferred.add(tag));
    }
  }

  return [...inferred].sort();
};

/**
 * Normalize raw customer search text into deterministic tokens and inferred cuisine tags.
 */
export function normalizeSearchQuery(input: RawSearchQueryInput): QueryNormalizationOutcome {
  const validation = validateRawSearchQuery(input);
  if (!validation.valid) {
    return { ok: false, validation };
  }

  const rawText = input.text?.trim();
  const normalizedText = rawText ? normalizeForMatch(rawText) : '';
  const tokens = rawText ? tokenizeSearchText(rawText) : tokenizeNormalizedText(normalizedText);
  const inferredCuisineTags = inferCuisineTags(normalizedText);

  return {
    ok: true,
    query: {
      text: rawText,
      normalizedText,
      tokens,
      inferredCuisineTags,
    },
  };
}

/** @deprecated Use normalizeSearchQuery — alias for spec naming */
export const QueryNormalizer = {
  normalize: normalizeSearchQuery,
};
