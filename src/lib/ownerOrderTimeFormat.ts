import { differenceInMinutes, format, isToday, isYesterday } from 'date-fns';
import { coerceOwnerOrderDate } from './ownerOrderReadModelMapper';

/** Zomato/Swiggy-style relative order time for owner portal. */
export function formatOwnerOrderTime(value: unknown, now = new Date()): string {
  const date = coerceOwnerOrderDate(value);
  if (!date) return 'Time unavailable';

  const minutesAgo = differenceInMinutes(now, date);
  if (minutesAgo >= 0 && minutesAgo < 2) {
    return 'Just now';
  }

  if (isToday(date)) {
    return `Today ${format(date, 'h:mm a')}`;
  }

  if (isYesterday(date)) {
    return `Yesterday ${format(date, 'h:mm a')}`;
  }

  const daysAgo = Math.floor((now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000));
  if (daysAgo < 7) {
    return `${format(date, 'EEE')} ${format(date, 'h:mm a')}`;
  }

  return format(date, 'd MMM, h:mm a');
}
