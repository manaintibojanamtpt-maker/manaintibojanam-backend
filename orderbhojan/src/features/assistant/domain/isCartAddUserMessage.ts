/** Free-form cart-add intent — builds non-executable plans for validate + confirm. */

import { expandIndicOrderingUtterance } from './orderingTextNormalize';
import { normalizeKitchenAsr } from './kitchenAsrNormalize';
import {
  normalizeQuantityAsr,
  parseQuantityToken,
} from './quantityAsrNormalize';

export interface ParsedCartAddIntent {
  readonly quantity: number;
  readonly itemName: string;
  readonly kitchenHint?: string;
}

/** ASR-tolerant “from” separator (from / feom / fom / form / nundi). */
const FROM_SEP = String.raw`(?:from|feom|fom|form|fro|nundi|నుండి|నుంచి)\s+`;

const QTY_WORD =
  'one|won|two|three|tree|four|five|six|seven|eight|ate|nine|ten|a|an|rendu|moodu|nalugu|రెండు|మూడు|నాలుగు';

const ADD_PATTERNS: readonly RegExp[] = [
  // add 2 quantity Masala Dosa from Inti bhojanam
  new RegExp(
    String.raw`^(?:please\s+)?add\s+(\d+)\s*(?:x|×|times|quantity|qty)?\s+(.+?)\s+${FROM_SEP}(.+)$`,
    'i',
  ),
  new RegExp(
    String.raw`^(?:please\s+)?add\s+(\d+)\s*(?:x|×|times|quantity|qty)?\s+(.+)$`,
    'i',
  ),
  // add two / to quantity Masala Dosa from Inti…
  new RegExp(
    String.raw`^(?:please\s+)?add\s+(${QTY_WORD})\s*(?:x|×|times|quantity|qty)?\s+(.+?)\s+${FROM_SEP}(.+)$`,
    'i',
  ),
  new RegExp(
    String.raw`^(?:please\s+)?add\s+(${QTY_WORD})\s*(?:x|×|times|quantity|qty)?\s+(.+)$`,
    'i',
  ),
  /^(?:please\s+)?add\s+(\d+)\s+(.+?)\s+to\s+(?:my\s+)?cart\s*[.!]?$/i,
  /^(?:please\s+)?add\s+(.+?)\s+to\s+(?:my\s+)?cart\s*[.!]?$/i,
  /^(?:please\s+)?(?:put|include)\s+(\d+)\s+(.+?)\s+in\s+(?:my\s+)?cart\s*[.!]?$/i,
  // I want 2 Andhra Veg Thali from …
  new RegExp(
    String.raw`^(?:please\s+)?(?:i\s+want|i'?d\s+like|get\s+me|give\s+me|order)\s+(\d+)\s+(.+?)\s+${FROM_SEP}(.+)$`,
    'i',
  ),
  new RegExp(
    String.raw`^(?:please\s+)?(?:i\s+want|i'?d\s+like|get\s+me|give\s+me|order)\s+(\d+)\s+(.+)$`,
    'i',
  ),
  new RegExp(
    String.raw`^(?:please\s+)?(?:i\s+want|i'?d\s+like|get\s+me|give\s+me|order)\s+(${QTY_WORD})\s+(.+?)\s+${FROM_SEP}(.+)$`,
    'i',
  ),
  new RegExp(
    String.raw`^(?:please\s+)?(?:i\s+want|i'?d\s+like|get\s+me|give\s+me|order)\s+(${QTY_WORD})\s+(.+)$`,
    'i',
  ),
  // I want Andhra Veg Thali / order masala dosa from …
  new RegExp(
    String.raw`^(?:please\s+)?(?:i\s+want|i'?d\s+like|get\s+me|give\s+me|order)\s+(.+?)\s+${FROM_SEP}(.+)$`,
    'i',
  ),
  new RegExp(
    String.raw`^(?:please\s+)?(?:i\s+want|i'?d\s+like|get\s+me|give\s+me|order)\s+(.+)$`,
    'i',
  ),
  // add Masala Dosa from Inti bhojanam
  new RegExp(String.raw`^(?:please\s+)?add\s+(.+?)\s+${FROM_SEP}(.+)$`, 'i'),
  // add Masala Dosa
  /^(?:please\s+)?add\s+(.+)$/i,
  /^(\d+)\s*[x×]\s*(.+)$/i,
  // Telugu / Hinglish waiter style
  new RegExp(
    String.raw`^(rendu|two|2|రెండు|moodu|three|3|మూడు|nalugu|four|4|నాలుగు)\s+(.+?)\s+${FROM_SEP}(.+)$`,
    'i',
  ),
  /^(rendu|two|2|రెండు|moodu|three|3|మూడు)\s+(.+)$/iu,
];

function cleanItemName(raw: string): string {
  return raw
    .replace(/\bto\s+(?:my\s+)?cart\b/gi, '')
    .replace(/\b(?:please|quantity|qty)\b/gi, '')
    // ASR often prefixes dishes with articles: “An Andhra Veg Thali”.
    .replace(/^(?:a|an|the)\s+/i, '')
    .replace(/[.!?]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Normalize common ASR typos before regex parse. */
function normalizeAddUtterance(raw: string): string {
  return normalizeKitchenAsr(normalizeQuantityAsr(expandIndicOrderingUtterance(raw)))
    .replace(/\b(feom|fom|frm|fro|form)\b/gi, 'from')
    .replace(/\b(masla|masaala|malasa)\b/gi, 'masala')
    .replace(/\b(inti\s*bojanam|intibojanam|inti\s*bhojan|antibody)\b/gi, 'inti bhojanam')
    .replace(/\s+/g, ' ')
    .trim();
}

function isQuantityToken(token: string | undefined): boolean {
  if (!token) return false;
  return parseQuantityToken(token) != null;
}

/** Telugu/SOV: “రెండు మసాలా దోశ ఇంటి భోజనం నుండి” / “two masala dosa inti bhojanam”. */
function parseIndicSovOrder(text: string): ParsedCartAddIntent | null {
  const sov = text.match(
    /^(rendu|two|2|రెండు|moodu|three|3|మూడు|nalugu|four|4|నాలుగు)\s+(.+?)\s+(inti\s*bhojanam|ఇంటి\s*భోజనం|mana\s*inti|మన\s*ఇంటి)(?:\s*(?:నుండి|నుంచి|from))?.*$/iu,
  );
  if (!sov) return null;
  const quantity = parseQuantityToken(sov[1]);
  const itemName = cleanItemName(sov[2] ?? '');
  const kitchenHint = cleanItemName(sov[3] ?? '');
  if (quantity == null || itemName.length < 2) return null;
  return {
    quantity,
    itemName,
    ...(kitchenHint ? { kitchenHint } : {}),
  };
}

export function parseCartAddUserMessage(message: string): ParsedCartAddIntent | null {
  const text = normalizeAddUtterance(message);
  if (!text || text.length > 200) return null;

  const sov = parseIndicSovOrder(text);
  if (sov) return sov;

  for (const pattern of ADD_PATTERNS) {
    const match = text.match(pattern);
    if (!match) continue;

    // Patterns with qty in group 1 and item in group 2 (+ optional kitchen 3)
    const qtyFromFirst = parseQuantityToken(match[1]);
    if (qtyFromFirst != null && match[2]) {
      let itemName = cleanItemName(match[2]);
      let kitchenHint = match[3] ? cleanItemName(match[3]) : undefined;
      // Strip trailing kitchen tokens glued into the dish name.
      const kitchenTrail = itemName.match(
        /^(.*?)\s+(inti\s*bhojanam|ఇంటి\s*భోజనం|antibody)\s*$/iu,
      );
      if (kitchenTrail && !kitchenHint) {
        itemName = cleanItemName(kitchenTrail[1] ?? itemName);
        kitchenHint = 'inti bhojanam';
      }
      if (itemName.length >= 2) {
        return {
          quantity: qtyFromFirst,
          itemName,
          ...(kitchenHint ? { kitchenHint } : {}),
        };
      }
      continue;
    }

    // add X to cart / add X from kitchen — item in group 1
    if (match[1] && !isQuantityToken(match[1])) {
      const itemName = cleanItemName(match[1]);
      const kitchenHint = match[2] ? cleanItemName(match[2]) : undefined;
      // Avoid treating pure confirm/discard as dish names via the bare "from" pattern.
      if (/^(yes|no|ok|okay|confirm|discard|stop)$/i.test(itemName)) continue;
      if (itemName.length >= 2) {
        return {
          quantity: 1,
          itemName,
          ...(kitchenHint ? { kitchenHint } : {}),
        };
      }
    }
  }

  return null;
}

/** Short reply that is likely a dish name clarifying a pending cart plan. */
export function parseDishClarificationMessage(message: string): string | null {
  const text = message.trim();
  if (!text || text.length > 80) return null;
  if (/^(yes|yeah|yep|yup|ok|okay|sure|confirm|no|nope|cancel|discard|stop)\b/i.test(text)) {
    return null;
  }
  if (/^(add|find|search|open|show|track|order)\b/i.test(text)) return null;
  const cleaned = cleanItemName(text.replace(/\bfrom\s+.+$/i, ''));
  if (cleaned.length < 2 || cleaned.split(/\s+/).length > 6) return null;
  return cleaned;
}

export function isCartAddUserMessage(message: string): boolean {
  return parseCartAddUserMessage(message) != null;
}

export {
  normalizeQuantityAsr,
  parseQuantityOnlyMessage,
  parseQuantityToken,
} from './quantityAsrNormalize';
