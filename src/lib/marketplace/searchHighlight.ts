/**
 * M4 PR-7 — highlight matched query tokens in display text (presentation only).
 */

export interface HighlightSegment {
  readonly text: string;
  readonly highlight: boolean;
}

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function tokenizeHighlightQuery(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length >= 2);
}

export function buildHighlightSegments(text: string, query: string): HighlightSegment[] {
  const tokens = tokenizeHighlightQuery(query);
  if (!text || tokens.length === 0) {
    return [{ text, highlight: false }];
  }

  const pattern = new RegExp(`(${tokens.map(escapeRegExp).join('|')})`, 'gi');
  const parts = text.split(pattern).filter((part) => part.length > 0);

  if (parts.length <= 1) {
    return [{ text, highlight: false }];
  }

  const loweredTokens = new Set(tokens);
  return parts.map((part) => ({
    text: part,
    highlight: loweredTokens.has(part.toLowerCase()),
  }));
}
