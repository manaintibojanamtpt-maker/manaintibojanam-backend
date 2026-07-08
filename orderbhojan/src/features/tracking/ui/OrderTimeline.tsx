import type { ReactNode } from 'react';
import { Icon, Text } from '@bhojan/design-system';
import type { OrderTrackingResponse } from '@/types/marketplace';
import {
  TRACKING_STEPS,
  normalizeTrackingStatus,
  trackingStepIndex,
} from '../utils/trackingSteps';

function formatTimelineAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function timelineIcon(stepId: string): ReactNode {
  const normalized = stepId.toUpperCase();
  if (normalized === 'DELIVERED') {
    return (
      <>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <path d="M22 4 12 14.01l-3-3" />
      </>
    );
  }
  if (normalized === 'OUT_FOR_DELIVERY') {
    return (
      <>
        <path d="M5 18H3c-.6 0-1-.4-1-1V7c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v11" />
        <path d="M14 9h4l3 3v5h-2" />
        <circle cx="7" cy="18" r="2" />
        <circle cx="17" cy="18" r="2" />
      </>
    );
  }
  if (normalized === 'PREPARING') {
    return (
      <>
        <path d="M3 11h18" />
        <path d="M12 3v18" />
        <circle cx="12" cy="12" r="9" />
      </>
    );
  }
  if (normalized === 'ACCEPTED') {
    return (
      <>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <path d="m9 11 2 2 4-4" />
      </>
    );
  }
  return (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </>
  );
}

function eventTimeForStep(
  stepId: string,
  tracking: OrderTrackingResponse,
): string | undefined {
  const match = [...tracking.timeline]
    .reverse()
    .find((entry) => normalizeTrackingStatus(entry.status) === stepId);
  return match?.at;
}

export interface OrderTimelineProps {
  readonly tracking: OrderTrackingResponse;
}

export function OrderTimeline({ tracking }: OrderTimelineProps) {
  const currentIndex = trackingStepIndex(tracking.status);
  const isCancelled = normalizeTrackingStatus(tracking.status) === 'CANCELLED';

  if (isCancelled) {
    return (
      <ol className="ob-order-timeline" aria-label="Order status timeline">
        <li className="ob-order-timeline__step ob-order-timeline__step--active">
          <div className="ob-order-timeline__icon" aria-hidden>
            <Icon size={18} label="">
              <circle cx="12" cy="12" r="10" />
              <path d="m15 9-6 6" />
              <path d="m9 9 6 6" />
            </Icon>
          </div>
          <div className="ob-order-timeline__content">
            <Text variant="subtitle" as="p" className="ob-order-timeline__status">
              Order cancelled
            </Text>
          </div>
        </li>
      </ol>
    );
  }

  return (
    <ol className="ob-order-timeline" aria-label="Order status timeline">
      {TRACKING_STEPS.map((step, index) => {
        const isDone = currentIndex > index;
        const isActive = currentIndex === index;
        const isPending = currentIndex < index;
        const timestamp = eventTimeForStep(step.id, tracking);

        return (
          <li
            key={step.id}
            className={`ob-order-timeline__step${isActive ? ' ob-order-timeline__step--active' : ''}${isDone ? ' ob-order-timeline__step--done' : ''}${isPending ? ' ob-order-timeline__step--pending' : ''}`}
          >
            <div className="ob-order-timeline__icon" aria-hidden>
              <Icon size={18} label="">
                {timelineIcon(step.id)}
              </Icon>
            </div>
            <div className="ob-order-timeline__content">
              <Text variant="subtitle" as="p" className="ob-order-timeline__status">
                {step.label}
              </Text>
              {timestamp ? (
                <Text variant="caption" className="ob-order-timeline__time">
                  {formatTimelineAt(timestamp)}
                </Text>
              ) : null}
              {(isActive || isDone) && step.message ? (
                <Text variant="body" className="ob-order-timeline__message">
                  {step.message}
                </Text>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
