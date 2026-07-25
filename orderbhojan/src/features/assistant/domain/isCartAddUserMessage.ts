/** Free-form cart-add intent — builds non-executable plans for validate + confirm. */

export interface ParsedCartAddIntent {
  readonly quantity: number;
  readonly itemName: string;
}

const ADD_PATTERNS: readonly RegExp[] = [
  /^(?:please\s+)?add\s+(\d+)\s+(.+?)\s+to\s+(?:my\s+)?cart\s*[.!]?$/i,
  /^(?:please\s+)?add\s+(.+?)\s+to\s+(?:my\s+)?cart\s*[.!]?$/i,
  /^(?:please\s+)?(?:put|include)\s+(\d+)\s+(.+?)\s+in\s+(?:my\s+)?cart\s*[.!]?$/i,
  /^(\d+)\s*[x×]\s*(.+)$/i,
];

function cleanItemName(raw: string): string {
  return raw
    .replace(/\bto\s+(?:my\s+)?cart\b/gi, '')
    .replace(/[.!?]+$/g, '')
    .trim();
}

export function parseCartAddUserMessage(message: string): ParsedCartAddIntent | null {
  const text = message.trim();
  if (!text || text.length > 200) return null;

  for (const pattern of ADD_PATTERNS) {
    const match = text.match(pattern);
    if (!match) continue;

    if (match[2] !== undefined && /^\d+$/.test(match[1] ?? '')) {
      const quantity = Math.min(20, Math.max(1, Number(match[1])));
      const itemName = cleanItemName(match[2] ?? '');
      if (itemName.length >= 2) return { quantity, itemName };
      continue;
    }

    if (match[1] && !/^\d+$/.test(match[1])) {
      const itemName = cleanItemName(match[1]);
      if (itemName.length >= 2) return { quantity: 1, itemName };
    }
  }

  return null;
}

export function isCartAddUserMessage(message: string): boolean {
  return parseCartAddUserMessage(message) != null;
}
