import { classifyTextMatch, normalizeForMatch } from '../shared/serverBundleHelpers.js';

/**
 * Common Indian food spelling / ASR variants → canonical tokens.
 * Applied after normalizeForMatch so "Medu Vada" and "Medu Wada" align.
 */
const FOOD_TOKEN_ALIASES: Readonly<Record<string, string>> = {
  idly: 'idli',
  idlis: 'idli',
  idlies: 'idli',
  vada: 'wada',
  vadai: 'wada',
  vadas: 'wada',
  wadai: 'wada',
  meduvada: 'meduwada',
  meduwada: 'meduwada',
  malasa: 'masala',
  masalla: 'masala',
  dosai: 'dosa',
  dosha: 'dosa',
  thosai: 'dosa',
  poori: 'puri',
  poories: 'puri',
  chappathi: 'chapati',
  chapathi: 'chapati',
  roti: 'roti',
  biriyani: 'biryani',
  briyani: 'biryani',
  sambar: 'sambar',
  sambhar: 'sambar',
  chutny: 'chutney',
  curd: 'curd',
  raitha: 'raita',
};

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const rows = b.length + 1;
  const cols = a.length + 1;
  const prev = new Array<number>(cols);
  const curr = new Array<number>(cols);
  for (let i = 0; i < cols; i += 1) prev[i] = i;
  for (let j = 1; j < rows; j += 1) {
    curr[0] = j;
    for (let i = 1; i < cols; i += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[i] = Math.min(curr[i - 1]! + 1, prev[i]! + 1, prev[i - 1]! + cost);
    }
    for (let i = 0; i < cols; i += 1) prev[i] = curr[i]!;
  }
  return prev[a.length]!;
}

export function canonicalizeFoodName(value: string): string {
  const normalized = normalizeForMatch(value)
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) return '';
  return normalized
    .split(' ')
    .map((token) => FOOD_TOKEN_ALIASES[token] ?? token)
    .join(' ');
}

/**
 * Score how well a spoken/typed dish name matches a menu row name.
 * Prefer exact/canonical matches; allow short edit-distance for ASR typos.
 */
export function scoreFoodNameMatch(query: string, menuName: string): number {
  const base = classifyTextMatch(query, menuName, 'name').signal;
  const qCanon = canonicalizeFoodName(query);
  const mCanon = canonicalizeFoodName(menuName);
  if (!qCanon || !mCanon) return base;

  let best = base;
  if (qCanon === mCanon) best = Math.max(best, 0.98);

  if (mCanon.startsWith(qCanon) || qCanon.startsWith(mCanon)) {
    best = Math.max(best, 0.9);
  }
  if (mCanon.includes(qCanon) || qCanon.includes(mCanon)) {
    best = Math.max(best, 0.8);
  }

  const maxLen = Math.max(qCanon.length, mCanon.length);
  if (maxLen > 0 && maxLen <= 28) {
    const dist = levenshtein(qCanon.replace(/\s/g, ''), mCanon.replace(/\s/g, ''));
    if (dist <= 2) {
      best = Math.max(best, 1 - dist / Math.max(4, maxLen));
    }
  }

  // Token-wise: each query token must nearly match some menu token
  const qTokens = qCanon.split(' ').filter(Boolean);
  const mTokens = mCanon.split(' ').filter(Boolean);
  if (qTokens.length > 0 && mTokens.length > 0) {
    let matched = 0;
    for (const qt of qTokens) {
      const hit = mTokens.some((mt) => {
        if (mt === qt || mt.startsWith(qt) || qt.startsWith(mt)) return true;
        return levenshtein(qt, mt) <= 1 && Math.max(qt.length, mt.length) >= 3;
      });
      if (hit) matched += 1;
    }
    const coverage = matched / qTokens.length;
    if (coverage === 1) best = Math.max(best, qTokens.length === mTokens.length ? 0.94 : 0.88);
    else if (coverage >= 0.66) best = Math.max(best, 0.72);
  }

  return best;
}
