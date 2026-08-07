/**
 * Purpose: Deterministic quantity extraction from a normalized transcript.
 * Public API: RegexQuantityExtractor
 * Dependencies: IEntityExtractor, QuantityEntity
 * Consumers: EntityResolver
 */

import type { IEntityExtractor } from '../IEntityExtractor.js';
import type { QuantityEntity } from '../../../models/ConversationEntity.js';

const WORD_TO_NUMBER: ReadonlyMap<string, number> = new Map([
  ['one', 1],
  ['two', 2],
  ['three', 3],
  ['four', 4],
  ['five', 5],
  ['six', 6],
  ['seven', 7],
  ['eight', 8],
  ['nine', 9],
  ['ten', 10],
  ['a', 1],
  ['an', 1],
  // Telugu (romanized + common forms)
  ['okati', 1],
  ['oka', 1],
  ['rendu', 2],
  ['moodu', 3],
  ['nalugu', 4],
  ['aidu', 5],
  // Hindi (romanized)
  ['ek', 1],
  ['do', 2],
  ['teen', 3],
  ['char', 4],
  ['paanch', 5],
]);

export class RegexQuantityExtractor implements IEntityExtractor {
  public readonly name = 'RegexQuantityExtractor';

  public extract(normalizedTranscript: string): QuantityEntity[] {
    const entities: QuantityEntity[] = [];
    const tokens = normalizedTranscript.trim().split(/\s+/).filter(Boolean);
    let cursor = 0;

    for (const token of tokens) {
      const startIndex = normalizedTranscript.indexOf(token, cursor);
      const endIndex = startIndex >= 0 ? startIndex + token.length : undefined;
      if (startIndex >= 0) {
        cursor = startIndex + token.length;
      }

      const fromDigits = /^\d+$/.test(token) ? Number.parseInt(token, 10) : NaN;
      const fromWord = WORD_TO_NUMBER.get(token);
      const numericValue = Number.isFinite(fromDigits) ? fromDigits : fromWord;

      if (numericValue === undefined || !Number.isFinite(numericValue) || numericValue <= 0) {
        continue;
      }

      entities.push({
        type: 'Quantity',
        rawValue: token,
        normalizedValue: String(numericValue),
        numericValue,
        confidence: Number.isFinite(fromDigits) ? 1.0 : 0.9,
        startIndex: startIndex >= 0 ? startIndex : undefined,
        endIndex,
      });
    }

    return entities;
  }
}
