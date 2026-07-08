import type { ReactNode } from 'react';
import { Icon, Text } from '@bhojan/design-system';
import type { OrderTrackingResponse } from '@/types/marketplace';

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

function timelineIcon(status: string): ReactNode {
  const normalized = status.toUpperCase();
  if (normalized.includes('DELIVER') && !normalized.includes('OUT')) {
    return (
      <>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <path d="M22 4 12 14.01l-3-3" />
      </>
    );
  }
  if (normalized.includes('OUT') || normalized.includes('DISPATCH')) {
    return (
      <>
        <path d="M5 18H3c-.6 0-1-.4-1-1V7c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v11" />
        <path d="M14 9h4l3 3v5h-2" />
        <circle cx="7" cy="18" r="2" />
        <circle cx="17" cy="18" r="2" />
      </>
    );
  }
  if (normalized.includes('PREPAR') || normalized.includes('COOK') || normalized.includes('KITCHEN')) {
    return (
      <>
        <path d="M3 11h18" />
        <path d="M12 3v18" />
        <circle cx="12" cy="12" r="9" />
      </>
    );
  }
  if (normalized.includes('CONFIRM') || normalized.includes('PLACED') || normalized.includes('ACCEPT')) {
    return (
      <>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <path d="m9 11 2 2 4-4" />
      </>
    );
  }
  if (normalized.includes('CANCEL')) {
    return (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="m15 9-6 6" />
        <path d="m9 9 6 6" />
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

export interface OrderTimelineProps {
  readonly tracking: OrderTrackingResponse;
}

export function OrderTimeline({ tracking }: OrderTimelineProps) {
  return (
    <ol className="ob-order-timeline" aria-label="Order status timeline">
      {tracking.timeline.map((entry, index) => {
        const isActive = index === 0;
        const isDone = index > 0;

        return (
          <li
            key={`${entry.status}-${entry.at}-${index}`}
            className={`ob-order-timeline__step${isActive ? ' ob-order-timeline__step--active' : ''}${isDone ? ' ob-order-timeline__step--done' : ''}`}
          >
            <div className="ob-order-timeline__icon" aria-hidden>
              <Icon size={18} label="">
                {timelineIcon(entry.status)}
              </Icon>
            </div>
            <div className="ob-order-timeline__content">
              <Text variant="subtitle" as="p" className="ob-order-timeline__status">
                {entry.status}
              </Text>
              <Text variant="caption" className="ob-order-timeline__time">
                {formatTimelineAt(entry.at)}
              </Text>
              {entry.message ? (
                <Text variant="body" className="ob-order-timeline__message">
                  {entry.message}
                </Text>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
