/**
 * ASR quantity repairs for voice ordering.
 * Common failure: spoken “two” → transcript “to” / “too” before “quantity”.
 */

const NUMBER_WORDS: Readonly<Record<string, number>> = {
  a: 1,
  an: 1,
  one: 1,
  won: 1,
  two: 2,
  three: 3,
  tree: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  ate: 8,
  nine: 9,
  ten: 10,
  rendu: 2,
  moodu: 3,
  nalugu: 4,
  రెండు: 2,
  మూడు: 3,
  నాలుగు: 4,
};

/** Unambiguous number words after normalizeQuantityAsr has rewritten homophones. */
const WORD_ALT =
  'one|won|two|three|tree|four|five|six|seven|eight|ate|nine|ten|a|an|rendu|moodu|nalugu|రెండు|మూడు|నాలుగు';

/** Map a single token to 1–20 (unambiguous number words / digits). */
export function parseQuantityToken(token: string | undefined): number | null {
  if (!token) return null;
  const cleaned = token.trim().toLowerCase();
  if (!cleaned) return null;
  if (/^\d+$/.test(cleaned)) return Math.min(20, Math.max(1, Number(cleaned)));
  const word = NUMBER_WORDS[cleaned];
  return word != null ? word : null;
}

/**
 * Rewrite quantity-shaped ASR mistakes without breaking “add X to cart”.
 */
export function normalizeQuantityAsr(raw: string): string {
  let text = raw.replace(/\s+/g, ' ').trim();
  if (!text) return text;

  // “to quantity Masala…” / “add to qty …” → two
  text = text.replace(
    /\b(to|too|tu|tow)\s*(quantity|qty|pieces?|nos?|number)\b/gi,
    'two $2',
  );
  text = text.replace(
    /\b(for|fore|fur)\s*(quantity|qty|pieces?|nos?|number)\b/gi,
    'four $2',
  );
  text = text.replace(/\b(tree|free)\s*(quantity|qty|pieces?)\b/gi, 'three $2');

  // “quantity to” / “qty too”
  text = text.replace(/\b(quantity|qty)\s*(?:is|=|:)?\s*(to|too|tu|tow)\b/gi, '$1 two');
  text = text.replace(/\b(quantity|qty)\s*(?:is|=|:)?\s*(for|fore|fur)\b/gi, '$1 four');
  text = text.replace(/\b(quantity|qty)\s*(?:is|=|:)?\s*(tree|free)\b/gi, '$1 three');

  // “make it to” / “set it too” — do not swallow the final “to” into the verb phrase
  text = text.replace(
    /\b((?:make|set|change|update)(?:\s+it)?)\s+(to|too|tu|tow)\b/gi,
    '$1 two',
  );

  // “add to quantity …”
  text = text.replace(
    /\b(add|order|get(?:\s+me)?|i\s+want|give\s+me)\s+(to|too|tu|tow)\s+(quantity|qty)\b/gi,
    '$1 two $3',
  );

  // Bare “to quantity” / “too qty”
  if (/^(to|too|tu|tow)\s+(quantity|qty)\.?$/i.test(text)) {
    text = 'two quantity';
  }
  if (/^(for|fore|fur)\s+(quantity|qty)\.?$/i.test(text)) {
    text = 'four quantity';
  }

  return text.replace(/\s+/g, ' ').trim();
}

/**
 * True when the utterance is only (or mainly) setting a quantity —
 * e.g. “two”, “2 quantity”, “make it 2”, “to quantity”.
 */
export function parseQuantityOnlyMessage(message: string): number | null {
  const trimmed = message.replace(/\s+/g, ' ').trim();
  // Bare ASR homophones while clarifying qty on a pending plan (“to” / “too”).
  if (/^(to|too|tu|tow)$/i.test(trimmed)) return 2;
  if (/^(for|fore|fur)$/i.test(trimmed)) return 4;

  const text = normalizeQuantityAsr(message);
  if (!text || text.length > 48) return null;

  const patterns: RegExp[] = [
    new RegExp(
      String.raw`^(?:make\s+it|set\s+it|change\s+it|update(?:\s+it)?)\s+(\d+|${WORD_ALT})\s*(?:x|×|times|quantity|qty|pieces?|nos?|number)?\.?$`,
      'i',
    ),
    new RegExp(
      String.raw`^(?:set|change|update)\s+(?:to\s+)?(\d+|${WORD_ALT})\s*(?:x|×|times|quantity|qty)?\.?$`,
      'i',
    ),
    new RegExp(
      String.raw`^(\d+|${WORD_ALT})\s*(?:x|×|times|quantity|qty|pieces?|nos?|number)?\.?$`,
      'i',
    ),
    new RegExp(
      String.raw`^(?:quantity|qty)\s*(?:is|=|:)?\s*(\d+|${WORD_ALT})\.?$`,
      'i',
    ),
    new RegExp(String.raw`^(\d+|${WORD_ALT})\s*(?:of\s+them)?\.?$`, 'i'),
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match?.[1]) continue;
    const qty = parseQuantityToken(match[1]);
    if (qty == null) continue;
    const rest = text
      .replace(match[0], '')
      .replace(/\b(?:quantity|qty|times|pieces?|nos?|number|x|×)\b/gi, '')
      .trim();
    if (rest.length > 0) continue;
    return qty;
  }

  return null;
}

export { NUMBER_WORDS as QUANTITY_NUMBER_WORDS };
