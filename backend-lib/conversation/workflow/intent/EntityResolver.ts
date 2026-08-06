/**
 * Purpose: Orchestrates pluggable IEntityExtractor implementations over a
 * pre-normalized transcript and returns a merged, ordered entity list.
 *
 * Public API: EntityResolver
 * Dependencies: IEntityExtractor, ConversationEntity
 * Consumers: Future workflow wiring (not ConversationEngine yet)
 *
 * Non-goals: Fuzzy menu matching, LLM extraction, ConversationEngine integration.
 */

import type { ConversationEntity } from '../../models/ConversationEntity.js';
import type { IEntityExtractor } from './IEntityExtractor.js';

export class EntityResolver {
  constructor(private readonly extractors: readonly IEntityExtractor[]) {}

  /**
   * Runs every registered extractor and concatenates results in registration order.
   * Duplicate (type + rawValue + startIndex) entities from later extractors are skipped.
   */
  public extract(normalizedTranscript: string): ConversationEntity[] {
    const transcript = normalizedTranscript.trim();
    if (!transcript) {
      return [];
    }

    const merged: ConversationEntity[] = [];
    const seen = new Set<string>();

    for (const extractor of this.extractors) {
      for (const entity of extractor.extract(transcript)) {
        const key = [
          entity.type,
          entity.rawValue,
          entity.startIndex ?? '',
          entity.endIndex ?? '',
        ].join('|');
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        merged.push(entity);
      }
    }

    return merged;
  }
}
