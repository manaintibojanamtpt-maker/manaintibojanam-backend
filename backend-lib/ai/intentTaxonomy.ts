import type { AssistantMode } from './types.js';

/** Shared intent taxonomy — Phase 2. Intents are classified; not executed as side effects. */
export const CONSUMER_INTENTS = [
  'greet',
  'browse_restaurants',
  'search_menu',
  'recommend_meals',
  'cart_question',
  'checkout_explain',
  'order_status_help',
  'payment_help',
  /** Post-order triage only — never execute cancel. */
  'cancel_order',
  /** Post-order triage only — never issue refunds. */
  'refund',
  /** Post-order payment problems — escalate; do not capture/fix payments. */
  'payment_issue',
  'delivery_help',
  'general_help',
  'out_of_scope',
] as const;

export const MARKETING_INTENTS = [
  'greet',
  'product_faq',
  'onboarding_help',
  'pricing_help',
  'lead_qualify',
  'signup_route',
  'demo_request',
  'general_help',
  'out_of_scope',
] as const;

export type ConsumerIntent = (typeof CONSUMER_INTENTS)[number];
export type MarketingIntent = (typeof MARKETING_INTENTS)[number];
export type AssistantIntent = ConsumerIntent | MarketingIntent;

const CONSUMER_SET = new Set<string>(CONSUMER_INTENTS);
const MARKETING_SET = new Set<string>(MARKETING_INTENTS);

export function isConsumerIntent(value: unknown): value is ConsumerIntent {
  return typeof value === 'string' && CONSUMER_SET.has(value);
}

export function isMarketingIntent(value: unknown): value is MarketingIntent {
  return typeof value === 'string' && MARKETING_SET.has(value);
}

export function isIntentAllowedForMode(mode: AssistantMode, intent: string): boolean {
  if (mode === 'consumer_ordering') return CONSUMER_SET.has(intent);
  return MARKETING_SET.has(intent);
}

export function getIntentsForMode(mode: AssistantMode): readonly AssistantIntent[] {
  return mode === 'consumer_ordering' ? CONSUMER_INTENTS : MARKETING_INTENTS;
}

/** Heuristic classifier for Phase 2 — deterministic; LLM structured intent preferred when present. */
export function classifyIntentHeuristic(mode: AssistantMode, message: string): AssistantIntent {
  const text = message.trim().toLowerCase();

  if (/^(hi|hello|hey|namaste|good\s+(morning|evening|afternoon))\b/.test(text)) {
    return 'greet';
  }

  if (mode === 'merchant_marketing') {
    if (/(price|pricing|commission|fee|cost|plan)/.test(text)) return 'pricing_help';
    if (/(demo|walkthrough|show me)/.test(text)) return 'demo_request';
    if (/(sign\s*up|register|create\s+account|onboard)/.test(text)) return 'signup_route';
    if (/(lead|interested|kitchen owner|restaurant owner|partner)/.test(text)) return 'lead_qualify';
    if (/(onboard|getting started|how (do|to) start|setup)/.test(text)) return 'onboarding_help';
    if (/(what is|bhojanos|feature|delivery|ordering|owner)/.test(text)) return 'product_faq';
    if (/(cart|checkout|place order|add to cart)/.test(text)) return 'out_of_scope';
    return 'general_help';
  }

  if (/(track|where is my order|order status|eta)/.test(text)) return 'order_status_help';
  // High-risk post-order triage — classify before generic payment_help.
  if (/\b(cancel|cancellation|cancelling|canceling)\b/.test(text)) return 'cancel_order';
  if (/\b(refund|money back|charged twice|double.?charg)/.test(text)) return 'refund';
  if (
    /\b(payment failed|payment (not |never )?confirm|amount deducted|money deducted|upi.*(pending|failed|stuck)|razorpay.*(fail|pending)|paid but)\b/.test(
      text,
    )
  ) {
    return 'payment_issue';
  }
  if (/(pay|upi|razorpay|cod|payment)/.test(text)) return 'payment_help';
  if (/(deliver|address|location|pincode)/.test(text)) return 'delivery_help';
  if (/(checkout|place order|how do i pay)/.test(text)) return 'checkout_explain';
  if (/(cart|remove from cart|add to cart|update cart)/.test(text)) return 'cart_question';
  if (/(recommend|suggest|what should i|hungry)/.test(text)) return 'recommend_meals';
  if (/(menu|dish|biryani|dosa|item)/.test(text)) return 'search_menu';
  if (/(restaurant|kitchen|near me|open now)/.test(text)) return 'browse_restaurants';
  if (/(kyc|owner dashboard|merchant admin|provision tenant)/.test(text)) return 'out_of_scope';
  return 'general_help';
}
