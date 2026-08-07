/**
 * Unicode-safe text normalize for kitchen/dish matching.
 * Keeps letters from all scripts (Telugu, Hindi, etc.) — never strips to ASCII-only.
 */

const FOOD_TOKEN_ALIASES: Readonly<Record<string, string>> = {
  idly: 'idli',
  idlis: 'idli',
  vada: 'wada',
  vadai: 'wada',
  malasa: 'masala',
  masaala: 'masala',
  masla: 'masala',
  dosai: 'dosa',
  dosa: 'dosa',
  దోస: 'dosa',
  దోశ: 'dosa',
  మసాలా: 'masala',
  biriyani: 'biryani',
  briyani: 'biryani',
  inti: 'inti',
  intibojanam: 'inti bhojanam',
  antibody: 'inti', // observed STT garble for “inti bhojanam”
};

/** Map common Indic phrases into Latin match tokens (appended, not replaced). */
const SCRIPT_PHRASE_EXPAND: ReadonlyArray<{ readonly pattern: RegExp; readonly latin: string }> = [
  { pattern: /ఇంటి\s*భోజనం|ఇంటిభోజనం/gu, latin: 'inti bhojanam' },
  { pattern: /మన\s*ఇంటి|మనయింటి|మనయింటి భోజనం/gu, latin: 'mana inti' },
  { pattern: /मना\s*इंटी|इंटि\s*भोजनम|इन्टी\s*भोजन/gu, latin: 'inti bhojanam' },
  { pattern: /మసాలా\s*దోశ|మసాలా\s*దోస/gu, latin: 'masala dosa' },
  { pattern: /రెండు/gu, latin: 'two' },
  { pattern: /మూడు/gu, latin: 'three' },
  { pattern: /నాలుగు/gu, latin: 'four' },
  { pattern: /నుండి|నుంచి/gu, latin: 'from' },
];

export function expandIndicOrderingUtterance(raw: string): string {
  let out = raw;
  for (const { pattern, latin } of SCRIPT_PHRASE_EXPAND) {
    pattern.lastIndex = 0;
    if (pattern.test(out)) {
      pattern.lastIndex = 0;
      out = `${out} ${latin}`;
    }
  }
  if (/\bantibody\b/i.test(out) && !/inti\s*bhojanam/i.test(out)) {
    out = `${out} inti bhojanam`;
  }
  return out.replace(/\s+/g, ' ').trim();
}

/**
 * Lowercase + collapse punctuation, preserving Unicode letters/numbers.
 */
export function normalizeOrderingText(value: string): string {
  return expandIndicOrderingUtterance(value)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function canonicalizeOrderingText(value: string): string {
  return normalizeOrderingText(value)
    .replace(/^(?:a|an|the)\s+/i, '')
    .split(' ')
    .filter((t) => t !== 'a' && t !== 'an' && t !== 'the')
    .map((t) => FOOD_TOKEN_ALIASES[t] ?? t)
    .join(' ');
}

export { FOOD_TOKEN_ALIASES };
