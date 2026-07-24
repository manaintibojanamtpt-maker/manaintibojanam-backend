export const POST_ORDER_HIGH_RISK_INTENTS = [
  'cancel_order',
  'refund',
  'payment_issue',
] as const;

export type PostOrderHighRiskIntent = (typeof POST_ORDER_HIGH_RISK_INTENTS)[number];

const HIGH_RISK_SET = new Set<string>(POST_ORDER_HIGH_RISK_INTENTS);

export function isPostOrderHighRiskIntent(intent: string): boolean {
  return HIGH_RISK_SET.has(intent);
}

/**
 * Detect cancel / refund / payment-issue triage messages.
 * Does not imply any mutation will be performed.
 */
export function isPostOrderHighRiskMessage(message: string): boolean {
  const text = message.trim().toLowerCase();
  if (!text) return false;

  if (/\b(cancel|cancellation|cancelling|canceling)\b/.test(text)) return true;
  if (/\b(refund|money back|charged twice|double.?charg)/.test(text)) return true;
  if (
    /\b(payment failed|payment (not |never )?confirm|amount deducted|money deducted|upi.*(pending|failed|stuck)|razorpay.*(fail|pending)|paid but)\b/.test(
      text,
    )
  ) {
    return true;
  }
  return false;
}

export function classifyPostOrderHighRiskMessage(
  message: string,
): PostOrderHighRiskIntent | undefined {
  const text = message.trim().toLowerCase();
  if (!text) return undefined;

  if (/\b(cancel|cancellation|cancelling|canceling)\b/.test(text)) return 'cancel_order';
  if (/\b(refund|money back|charged twice|double.?charg)/.test(text)) return 'refund';
  if (
    /\b(payment failed|payment (not |never )?confirm|amount deducted|money deducted|upi.*(pending|failed|stuck)|razorpay.*(fail|pending)|paid but)\b/.test(
      text,
    )
  ) {
    return 'payment_issue';
  }
  return undefined;
}
