/**
 * Search domain — query tokenization (M4 PR-2).
 */

import {
  SEARCH_MAX_TOKEN_COUNT,
  SEARCH_MIN_TOKEN_LENGTH,
  SEARCH_STOP_WORDS,
} from '../shared/SearchConstants';
import { normalizeForMatch } from '../shared/SearchLanguage';

const splitTokens = (normalizedText: string): string[] => {
  if (!normalizedText) {
    return [];
  }

  return normalizedText
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= SEARCH_MIN_TOKEN_LENGTH)
    .filter((token) => !SEARCH_STOP_WORDS.has(token));
};

/**
 * Tokenize normalized search text into deterministic keyword tokens.
 */
export function tokenizeSearchText(text: string): readonly string[] {
  const normalized = normalizeForMatch(text);
  const tokens = splitTokens(normalized);
  return tokens.slice(0, SEARCH_MAX_TOKEN_COUNT);
}

/**
 * Tokenize already-normalized text (skips normalizeForMatch).
 */
export function tokenizeNormalizedText(normalizedText: string): readonly string[] {
  const tokens = splitTokens(normalizedText);
  return tokens.slice(0, SEARCH_MAX_TOKEN_COUNT);
}
