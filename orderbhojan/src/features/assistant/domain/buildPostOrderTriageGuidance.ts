import type { PostOrderContext } from './postOrderAssistContract';
import {
  classifyPostOrderHighRiskMessage,
  isPostOrderHighRiskMessage,
  type PostOrderHighRiskIntent,
} from './postOrderHighRiskIntents';
import { OB_SUPPORT_EMAIL, buildObSupportMailto } from '../../../config/support';

export interface PostOrderTriageGuidance {
  readonly highRisk: boolean;
  readonly riskKind?: PostOrderHighRiskIntent;
  readonly clarificationQuestions: readonly string[];
  readonly escalationHints: readonly {
    readonly type: 'navigate' | 'open_url';
    readonly target: string;
    readonly label: string;
  }[];
  readonly systemNote: string;
}

/**
 * Deterministic triage checklist for high-risk post-order intents.
 * Collects missing context and routes to human/manual flows — never executes.
 */
export function buildPostOrderTriageGuidance(params: {
  readonly message: string;
  readonly orderContext?: PostOrderContext;
}): PostOrderTriageGuidance | null {
  if (!isPostOrderHighRiskMessage(params.message)) return null;

  const riskKind = classifyPostOrderHighRiskMessage(params.message);
  const orderId = params.orderContext?.orderId?.trim();
  const snapshot = params.orderContext?.snapshot;
  const questions: string[] = [];

  if (!orderId && !snapshot?.orderNumber) {
    questions.push('Which order number is this about? Open tracking or My Orders if you are unsure.');
  }
  if (riskKind === 'payment_issue' && !snapshot?.paymentStatus) {
    questions.push('Was this UPI, Razorpay/card, or cash on delivery — and did any amount leave your account?');
  }
  if (riskKind === 'cancel_order' && !snapshot?.status) {
    questions.push('What status do you see on the tracking page right now (preparing, out for delivery, delivered)?');
  }
  if (riskKind === 'refund' && !snapshot?.paymentStatus && !snapshot?.status) {
    questions.push('Share the order number and whether the order shows cancelled, delivered, or still active.');
  }

  const subject =
    riskKind === 'cancel_order'
      ? 'Order cancel request'
      : riskKind === 'refund'
        ? 'Refund request'
        : riskKind === 'payment_issue'
          ? 'Payment issue'
          : 'OrderBhojan Support';

  const mailto = buildObSupportMailto(
    orderId || snapshot?.orderNumber
      ? `${subject} — ${snapshot?.orderNumber ?? orderId}`
      : subject,
  );

  const trackingOrOrdersHint = orderId
    ? ({
        type: 'navigate' as const,
        target: `/orders/${orderId}/track`,
        label: 'Open tracking',
      })
    : ({
        type: 'navigate' as const,
        target: '/orders',
        label: 'My Orders',
      });

  const escalationHints: PostOrderTriageGuidance['escalationHints'] = [
    trackingOrOrdersHint,
    {
      type: 'open_url',
      target: mailto,
      label: `Email ${OB_SUPPORT_EMAIL}`,
    },
    {
      type: 'navigate',
      target: '/profile',
      label: 'Help & support',
    },
  ];

  const systemNote = [
    'This chat cannot cancel orders, issue refunds, or capture/fix payments.',
    'Support will review manually — no outcome is guaranteed in this chat.',
    questions.length
      ? `To help support: ${questions.join(' ')}`
      : 'Include your order number when you contact support.',
  ].join(' ');

  return {
    highRisk: true,
    ...(riskKind ? { riskKind } : {}),
    clarificationQuestions: questions,
    escalationHints,
    systemNote,
  };
}
