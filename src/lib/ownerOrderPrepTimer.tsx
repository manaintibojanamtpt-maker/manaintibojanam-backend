import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { coerceOwnerOrderDate } from './ownerOrderReadModelMapper';

const PREP_TRACKING_STATUSES = new Set(['ACCEPTED', 'PREPARING']);

function resolvePrepStartMs(order: {
  status?: string;
  statusHistory?: unknown;
  updatedAt?: unknown;
  createdAt?: unknown;
}): number | null {
  const currentStatus = String(order.status ?? '').toUpperCase();
  if (!PREP_TRACKING_STATUSES.has(currentStatus)) return null;

  if (Array.isArray(order.statusHistory)) {
    for (let index = order.statusHistory.length - 1; index >= 0; index -= 1) {
      const entry = order.statusHistory[index] as { status?: string; timestamp?: unknown };
      const status = String(entry?.status ?? '').toUpperCase();
      if (status === 'PREPARING' || status === 'ACCEPTED') {
        const parsed = coerceOwnerOrderDate(entry.timestamp);
        if (parsed) return parsed.getTime();
      }
    }
  }

  return (
    coerceOwnerOrderDate(order.updatedAt)?.getTime()
    ?? coerceOwnerOrderDate(order.createdAt)?.getTime()
    ?? null
  );
}

function formatPrepElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function OwnerOrderPrepTimer({ order }: { order: Record<string, unknown> }) {
  const prepStartMs = resolvePrepStartMs(order as Parameters<typeof resolvePrepStartMs>[0]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (prepStartMs == null) {
      setElapsedSeconds(0);
      return;
    }

    const tick = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - prepStartMs) / 1000)));
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [prepStartMs]);

  if (prepStartMs == null) return null;

  const urgent = elapsedSeconds >= 20 * 60;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold ${
        urgent
          ? 'bg-orange-500/15 text-orange-300 border border-orange-500/30 animate-pulse'
          : 'bg-purple-500/10 text-purple-200 border border-purple-500/20'
      }`}
    >
      <Clock className="w-3 h-3" />
      Prep {formatPrepElapsed(elapsedSeconds)}
    </span>
  );
}

export { formatPrepElapsed, resolvePrepStartMs };
