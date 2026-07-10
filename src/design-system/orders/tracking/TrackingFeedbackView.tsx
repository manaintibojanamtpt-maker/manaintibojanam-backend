import { GlassCard } from '../../primitives/GlassCard';
import { SectionHeader } from '../../primitives/SectionHeader';
import { SoftButton } from '../../primitives/SoftButton';
import { TextFieldView } from '../../primitives/TextFieldView';
import type { TrackingFeedbackViewModel } from './types';

export interface TrackingFeedbackViewProps {
  readonly feedback: TrackingFeedbackViewModel;
  readonly onRatingChange: (rating: number) => void;
  readonly onCommentChange: (comment: string) => void;
  readonly onSubmit: () => void;
}

export function TrackingFeedbackView({
  feedback,
  onRatingChange,
  onCommentChange,
  onSubmit,
}: TrackingFeedbackViewProps) {
  if (!feedback.eligible) return null;

  if (feedback.submitted) {
    return (
      <GlassCard hoverEffect={false} className="!rounded-2xl !p-4">
        <SectionHeader title={feedback.title} description={feedback.submittedSummary ?? ''} align="left" className="!mb-0 !mt-0" />
      </GlassCard>
    );
  }

  return (
    <GlassCard hoverEffect={false} className="!rounded-2xl !p-4">
      <SectionHeader title={feedback.title} description={feedback.description} align="left" className="!mb-4 !mt-0" />
      <div className="mb-4 flex gap-2" role="radiogroup" aria-label="Order rating">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            className={`text-2xl leading-none transition ${feedback.rating >= value ? 'text-amber-400' : 'text-white/25'}`}
            onClick={() => onRatingChange(value)}
            aria-label={`${value} star`}
          >
            ★
          </button>
        ))}
      </div>
      <TextFieldView
        label="Comments (optional)"
        value={feedback.comment}
        onChange={(event) => onCommentChange(event.target.value)}
      />
      <SoftButton type="button" className="mt-4" disabled={feedback.submitting} onClick={onSubmit}>
        {feedback.submitLabel}
      </SoftButton>
    </GlassCard>
  );
}
