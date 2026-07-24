export type PersonalizationIntent =
  | 'reorder_last'
  | 'usual_at_restaurant'
  | 'favorite_restaurants'
  | 'none';

/**
 * Detect reorder / usuals / favorites guidance intents.
 * Does not imply cart mutation — plans are built only from caller-owned data.
 */
export function classifyPersonalizationIntent(message: string): PersonalizationIntent {
  const text = message.trim().toLowerCase();
  if (!text) return 'none';

  if (/\b(favorite|favourites|favorites|saved kitchen|saved restaurant)\b/.test(text)) {
    return 'favorite_restaurants';
  }
  if (/\b(my usual|the usual|what i usually|order my usual|usual order)\b/.test(text)) {
    return 'usual_at_restaurant';
  }
  if (/\b(reorder|order again|same items|repeat (my )?last order|last order again)\b/.test(text)) {
    return 'reorder_last';
  }
  return 'none';
}

export function isPersonalizationUserMessage(message: string): boolean {
  return classifyPersonalizationIntent(message) !== 'none';
}

export function isPersonalizationCartIntent(intent: PersonalizationIntent): boolean {
  return intent === 'reorder_last' || intent === 'usual_at_restaurant';
}
