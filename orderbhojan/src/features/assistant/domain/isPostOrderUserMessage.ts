import { isPostOrderHighRiskMessage } from './postOrderHighRiskIntents';

/**
 * Lightweight heuristic for routing a typed/voice message to post-order assist
 * when the dual-gate is ON. Does not fetch orders.
 */
export function isPostOrderUserMessage(message: string): boolean {
  const text = message.trim().toLowerCase();
  if (!text) return false;

  if (isPostOrderHighRiskMessage(text)) return true;

  return (
    /\b(track|tracking|where('?s| is) my order|order status|my order)\b/.test(text) ||
    /\b(delivery|eta|late|delayed|rider|driver|out for delivery)\b/.test(text) ||
    /\b(reorder|order again|same items)\b/.test(text) ||
    /\b(missing item|wrong item|looks wrong|something('?s| is) wrong|issue with|complaint|problem with|cold food|spilled)\b/.test(
      text,
    )
  );
}
