import { useState } from 'react';
import { Button, GlassSurface, Input, Text } from '@bhojan/design-system';
import { getMarketplaceApiClient } from '@/marketplace-api';
import { notifyToast } from '@/shared/providers/BdsToastProvider';
import type { OrderTrackingResponse } from '@/types/marketplace';

export function OrderFeedbackPanel({
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

  if (!feedback.eligible) return null;

  if (feedback.submitted) {
    return (
      <GlassSurface className="ob-tracking-px2__feedback">
        <Text variant="titleSm" as="h2">Thanks for your feedback</Text>
        <Text variant="body">
          You rated this order {feedback.rating ?? rating}★
          {feedback.comment ? ` — “${feedback.comment}”` : ''}
        </Text>
      </GlassSurface>
    );
  }

  return (
    <GlassSurface className="ob-tracking-px2__feedback">
      <Text variant="titleSm" as="h2">Rate your meal</Text>
      <Text variant="body" className="ob-tracking-px2__feedback-copy">
        How was the food and delivery experience?
      </Text>
      <div className="ob-tracking-px2__stars" role="radiogroup" aria-label="Order rating">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            className={`ob-tracking-px2__star${rating >= value ? ' ob-tracking-px2__star--active' : ''}`}
            onClick={() => setRating(value)}
            aria-label={`${value} star`}
          >
            ★
          </button>
        ))}
      </div>
      <Input
        label="Comments (optional)"
        value={comment}
        onChange={(event) => setComment(event.target.value)}
      />
      <Button
        variant="primary"
        disabled={busy}
        onClick={async () => {
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
        }}
      >
        {busy ? 'Submitting…' : 'Submit feedback'}
      </Button>
    </GlassSurface>
  );
}
