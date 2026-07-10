import { useState } from 'react';
import { TrackingFeedbackView } from '@bhojan/storefront-design-system/orders/tracking';
import { getMarketplaceApiClient } from '@/marketplace-api';
import { notifyToast } from '@/shared/providers/BdsToastProvider';
import type { OrderTrackingResponse } from '@/types/marketplace';

export function OrderBhojanOrderFeedbackPanel({
  orderId,
  feedback,
  onSubmitted,
}: {
  readonly orderId: string;
  readonly feedback: NonNullable<OrderTrackingResponse['feedback']>;
  readonly onSubmitted: () => void;
}) {
  const [rating, setRating] = useState(feedback.rating ?? 5);
  const [comment, setComment] = useState(feedback.comment ?? '');
  const [busy, setBusy] = useState(false);

  return (
    <TrackingFeedbackView
      feedback={{
        eligible: feedback.eligible,
        submitted: feedback.submitted,
        title: feedback.submitted ? 'Thanks for your feedback' : 'Rate your meal',
        description: feedback.submitted
          ? ''
          : 'How was the food and delivery experience?',
        submittedSummary: feedback.submitted
          ? `You rated this order ${feedback.rating ?? rating}★${feedback.comment ? ` — “${feedback.comment}”` : ''}`
          : undefined,
        rating,
        comment,
        submitLabel: busy ? 'Submitting…' : 'Submit feedback',
        submitting: busy,
      }}
      onRatingChange={setRating}
      onCommentChange={setComment}
      onSubmit={() => {
        void (async () => {
          setBusy(true);
          try {
            await getMarketplaceApiClient().submitOrderFeedback(orderId, { rating, feedback: comment });
            notifyToast('Thank you for your feedback!', 'success');
            onSubmitted();
          } catch {
            notifyToast('Could not submit feedback. Try again.', 'danger');
          } finally {
            setBusy(false);
          }
        })();
      }}
    />
  );
}
