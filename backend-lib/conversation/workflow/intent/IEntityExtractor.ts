/**
 * Purpose: Defines a pluggable interface for extracting structured entities
 * (e.g. Quantity, FoodItem, Address) from a normalized transcript.
 * 
 * Public API: IEntityExtractor interface
 * Dependencies: ConversationEntity
 */

import type { ConversationEntity } from '../../models/ConversationEntity.js';

export interface IEntityExtractor {
  /**
   * The name of the extractor (e.g., 'RegexQuantityExtractor', 'FuzzyMenuExtractor').
   */
  readonly name: string;

  /**
   * Extracts entities from the provided normalized transcript.
   * Note: The transcript should be pre-normalized before being passed here.
   * 
   * @param normalizedTranscript The transcript to extract entities from.
   * @returns An array of extracted entities.
   */
  extract(normalizedTranscript: string): ConversationEntity[];
}
