/** Free-form cart-add intent — builds non-executable plans for validate + confirm. */

export interface ParsedCartAddIntent {
  readonly quantity: number;
  readonly itemName: string;
  readonly kitchenHint?: string;
}

const NUMBER_WORDS: Readonly<Record<string, number>> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

/** ASR-tolerant “from” separator (from / feom / fom / form). */
const FROM_SEP = String.raw`(?:from|feom|fom|form|fro)\s+`;

const ADD_PATTERNS: readonly RegExp[] = [
  // add 2 quantity Masala Dosa from Inti bhojanam
  new RegExp(
    String.raw`^(?:please\s+)?add\s+(\d+)\s*(?:x|×|times|quantity|qty)?\s+(.+?)(?:\s+${FROM_SEP}(.+))?$`,
    'i',
  ),
  // add two quantity Masala Dosa from Inti…
  new RegExp(
    String.raw`^(?:please\s+)?add\s+(one|two|three|four|five|six|seven|eight|nine|ten|a|an)\s*(?:x|×|times|quantity|qty)?\s+(.+?)(?:\s+${FROM_SEP}(.+))?$`,
    'i',
  ),
  /^(?:please\s+)?add\s+(\d+)\s+(.+?)\s+to\s+(?:my\s+)?cart\s*[.!]?$/i,
  /^(?:please\s+)?add\s+(.+?)\s+to\s+(?:my\s+)?cart\s*[.!]?$/i,
  /^(?:please\s+)?(?:put|include)\s+(\d+)\s+(.+?)\s+in\s+(?:my\s+)?cart\s*[.!]?$/i,
  // add Masala Dosa from Inti bhojanam
  new RegExp(String.raw`^(?:please\s+)?add\s+(.+?)(?:\s+${FROM_SEP}(.+))$`, 'i'),
  // add Masala Dosa
  /^(?:please\s+)?add\s+(.+)$/i,
  /^(\d+)\s*[x×]\s*(.+)$/i,
];

function cleanItemName(raw: string): string {
  return raw
    .replace(/\bto\s+(?:my\s+)?cart\b/gi, '')
    .replace(/\b(?:please|quantity|qty)\b/gi, '')
    .replace(/[.!?]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseQuantityToken(token: string | undefined): number | null {
  if (!token) return null;
  if (/^\d+$/.test(token)) return Math.min(20, Math.max(1, Number(token)));
  const word = NUMBER_WORDS[token.toLowerCase()];
  return word != null ? word : null;
}

/** Normalize common ASR typos before regex parse. */
function normalizeAddUtterance(raw: string): string {
  return raw
    .replace(/\b(feom|fom|frm|fro|form)\b/gi, 'from')
    .replace(/\b(masla|masaala)\b/gi, 'masala')
    .replace(/\b(inti\s*bojanam|intibojanam|inti\s*bhojan)\b/gi, 'inti bhojanam')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseCartAddUserMessage(message: string): ParsedCartAddIntent | null {
  const text = normalizeAddUtterance(message);
  if (!text || text.length > 200) return null;

  for (const pattern of ADD_PATTERNS) {
    const match = text.match(pattern);
    if (!match) continue;

    // Patterns with qty in group 1 and item in group 2 (+ optional kitchen 3)
    const qtyFromFirst = parseQuantityToken(match[1]);
    if (qtyFromFirst != null && match[2]) {
      const itemName = cleanItemName(match[2]);
      const kitchenHint = match[3] ? cleanItemName(match[3]) : undefined;
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
    if (match[1] && !/^\d+$/.test(match[1]) && !NUMBER_WORDS[match[1].toLowerCase()]) {
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
