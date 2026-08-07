/**
 * Kitchen-name ASR repairs for voice ordering.
 * Classic failure: “Mana Inti” → “money” / “many” / “mani”.
 */

const KITCHEN_PHRASE_REWRITES: ReadonlyArray<{
  readonly pattern: RegExp;
  readonly replacement: string;
}> = [
  // Mana Inti / Manaintibojanam family
  {
    pattern: /\bfrom\s+(?:money|mony|many|mani|manor|manna)(?:\s+(?:inti|kitchen|bhojanam|bojanam))?\b/gi,
    replacement: 'from mana inti',
  },
  {
    pattern: /\b(?:money|mony|many|mani|manor|manna)\s+(?:inti|intibojanam|bhojanam|bojanam)\b/gi,
    replacement: 'mana inti',
  },
  { pattern: /\b(?:money|mony|many|mani|manor|manna)(?:inti|intibojanam)?\b/gi, replacement: 'mana' },
  // Inti bhojanam (already partly covered elsewhere)
  { pattern: /\bantibody\b/gi, replacement: 'inti bhojanam' },
  { pattern: /\binti\s*(?:bojanam|bhajanam|bhojan)\b/gi, replacement: 'inti bhojanam' },
];

/** Expand / rewrite kitchen ASR mistakes in an utterance or kitchen hint. */
export function normalizeKitchenAsr(raw: string): string {
  let text = raw.replace(/\s+/g, ' ').trim();
  if (!text) return text;
  for (const { pattern, replacement } of KITCHEN_PHRASE_REWRITES) {
    pattern.lastIndex = 0;
    text = text.replace(pattern, replacement);
  }
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Score a kitchen hint against a display name with ASR-aware expansion.
 * Returns 0–1.
 */
export function scoreKitchenHint(hint: string, kitchenName: string): number {
  const h = normalizeKitchenAsr(hint).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  const n = kitchenName.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  if (!h || !n) return 0;
  if (h === n) return 1;
  if (n.includes(h) || h.includes(n)) return 0.92;
  const hTokens = h.split(' ').filter(Boolean);
  const nTokens = n.split(' ').filter(Boolean);
  let hits = 0;
  for (const ht of hTokens) {
    if (
      nTokens.some(
        (nt) =>
          nt === ht ||
          nt.startsWith(ht) ||
          ht.startsWith(nt) ||
          (ht.length >= 4 && nt.length >= 4 && levenshtein(ht, nt) <= 1),
      )
    ) {
      hits += 1;
    }
  }
  if (hTokens.length > 0 && hits === hTokens.length) return hTokens.length === 1 ? 0.88 : 0.9;
  // “mana” alone vs “mana inti kitchen”
  if (hTokens.length === 1 && hTokens[0] && nTokens[0] === hTokens[0]) return 0.86;
  return 0;
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array<number>(a.length + 1);
  const curr = new Array<number>(a.length + 1);
  for (let i = 0; i <= a.length; i += 1) prev[i] = i;
  for (let j = 1; j <= b.length; j += 1) {
    curr[0] = j;
    for (let i = 1; i <= a.length; i += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[i] = Math.min(curr[i - 1]! + 1, prev[i]! + 1, prev[i - 1]! + cost);
    }
    for (let i = 0; i <= a.length; i += 1) prev[i] = curr[i]!;
  }
  return prev[a.length]!;
}
