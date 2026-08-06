/**
 * Purpose: Menu-aware FoodItem extraction from a pre-normalized transcript.
 * Matches longest catalog names/aliases against the transcript with word boundaries.
 *
 * Public API: MenuFoodItemExtractor, MenuCatalogItem
 * Dependencies: IEntityExtractor, FoodItemEntity
 * Consumers: EntityResolver
 *
 * Non-goals: Firestore/network lookup, ConversationEngine wiring, LLM matching.
 */

import type { IEntityExtractor } from '../IEntityExtractor.js';
import type { FoodItemEntity } from '../../../models/ConversationEntity.js';

export interface MenuCatalogItem {
  readonly id: string;
  /** Display / search name (will be normalized for matching). */
  readonly name: string;
  /** Optional alternate phrases that map to the same menu item. */
  readonly aliases?: readonly string[];
}

interface IndexedPhrase {
  readonly menuItemId: string;
  readonly displayName: string;
  readonly phrase: string;
  readonly tokenCount: number;
  readonly isAlias: boolean;
}

function normalizePhrase(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class MenuFoodItemExtractor implements IEntityExtractor {
  public readonly name = 'MenuFoodItemExtractor';

  private readonly phrases: readonly IndexedPhrase[];

  constructor(menu: readonly MenuCatalogItem[]) {
    const indexed: IndexedPhrase[] = [];

    for (const item of menu) {
      const name = normalizePhrase(item.name);
      if (name) {
        indexed.push({
          menuItemId: item.id,
          displayName: item.name.trim(),
          phrase: name,
          tokenCount: name.split(/\s+/).length,
          isAlias: false,
        });
      }
      for (const alias of item.aliases ?? []) {
        const normalizedAlias = normalizePhrase(alias);
        if (!normalizedAlias) continue;
        indexed.push({
          menuItemId: item.id,
          displayName: item.name.trim(),
          phrase: normalizedAlias,
          tokenCount: normalizedAlias.split(/\s+/).length,
          isAlias: true,
        });
      }
    }

    // Longest phrases first so "chicken biryani" wins over "biryani".
    this.phrases = indexed.sort(
      (a, b) => b.tokenCount - a.tokenCount || b.phrase.length - a.phrase.length,
    );
  }

  public extract(normalizedTranscript: string): FoodItemEntity[] {
    const transcript = normalizedTranscript.trim();
    if (!transcript || this.phrases.length === 0) {
      return [];
    }

    const claimed = new Array<boolean>(transcript.length).fill(false);
    const entities: FoodItemEntity[] = [];

    for (const entry of this.phrases) {
      const regex = new RegExp(`\\b${escapeRegExp(entry.phrase)}\\b`, 'g');
      let match: RegExpExecArray | null;
      while ((match = regex.exec(transcript)) !== null) {
        const startIndex = match.index;
        const endIndex = startIndex + match[0].length;

        let overlaps = false;
        for (let i = startIndex; i < endIndex; i += 1) {
          if (claimed[i]) {
            overlaps = true;
            break;
          }
        }
        if (overlaps) {
          continue;
        }

        for (let i = startIndex; i < endIndex; i += 1) {
          claimed[i] = true;
        }

        const confidence =
          entry.isAlias ? 0.9 : entry.tokenCount >= 2 ? 1.0 : 0.95;

        entities.push({
          type: 'FoodItem',
          rawValue: match[0],
          normalizedValue: entry.displayName,
          menuItemId: entry.menuItemId,
          confidence,
          startIndex,
          endIndex,
        });
      }
    }

    // Stable left-to-right order for consumers.
    return entities.sort(
      (a, b) => (a.startIndex ?? 0) - (b.startIndex ?? 0),
    );
  }
}
