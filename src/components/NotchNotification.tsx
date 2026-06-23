import React, { useEffect, useState } from 'react';
import { AnimatePresence, m } from 'framer-motion';
import { Bell, CheckCircle2, Clock, PackageCheck, Truck, XCircle } from 'lucide-react';

export interface NotchNotificationDetail {
  title: string;
  body?: string;
  type?: 'order' | 'success' | 'warning' | 'error' | 'info';
  status?: string;
  orderId?: string;
  duration?: number;
}

const getIcon = (detail: NotchNotificationDetail) => {
  const status = String(detail.status || '').toUpperCase();
  if (detail.type === 'error' || status.includes('CANCELLED') || status.includes('FAILED')) return XCircle;
  if (status.includes('DELIVERED')) return CheckCircle2;
  if (status.includes('OUT_FOR_DELIVERY') || status.includes('DISPATCHED')) return Truck;
  if (status.includes('READY') || status.includes('PREPARING')) return PackageCheck;
  if (status.includes('PENDING') || status.includes('PLACED')) return Clock;
  if (detail.type === 'success') return CheckCircle2;
  return Bell;
};

const getAccentClass = (detail: NotchNotificationDetail) => {
  const status = String(detail.status || '').toUpperCase();
  if (detail.type === 'error' || status.includes('CANCELLED') || status.includes('FAILED')) {
    return 'from-red-400 to-red-600 text-red-100';
  }
  if (status.includes('DELIVERED') || detail.type === 'success') {
    return 'from-emerald-400 to-emerald-600 text-emerald-100';
  }
  if (detail.type === 'warning' || status.includes('PENDING')) {
    return 'from-amber-300 to-orange-500 text-orange-100';
  }
  return 'from-orange-400 to-red-500 text-orange-100';
};

export const emitNotchNotification = (detail: NotchNotificationDetail) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<NotchNotificationDetail>('mib:notch-notification', { detail }));
};

const NotchNotification: React.FC = () => {
  const [notification, setNotification] = useState<NotchNotificationDetail | null>(null);

  useEffect(() => {
    let dismissTimer: number | undefined;

    const handleNotification = (event: Event) => {
      const detail = (event as CustomEvent<NotchNotificationDetail>).detail;
      if (!detail?.title) return;

      window.clearTimeout(dismissTimer);
      setNotification(detail);
      dismissTimer = window.setTimeout(() => {
        setNotification(null);
      }, detail.duration || 4800);
    };

    window.addEventListener('mib:notch-notification', handleNotification);
    return () => {
      window.removeEventListener('mib:notch-notification', handleNotification);
      window.clearTimeout(dismissTimer);
    };
  }, []);

  const Icon = notification ? getIcon(notification) : Bell;
  const accentClass = notification ? getAccentClass(notification) : 'from-orange-400 to-red-500 text-orange-100';

  return (
    <AnimatePresence>
      {notification && (
        <m.div
          initial={{ opacity: 0, y: -36, scale: 0.86 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -24, scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
          className="fixed left-1/2 z-[9999] w-[min(calc(100vw-1.5rem),24rem)] -translate-x-1/2"
          style={{ top: 'max(0.65rem, env(safe-area-inset-top))' }}
          role="status"
          aria-live="polite"
        >
          <div className="rounded-[2rem] border border-white/10 bg-black/[0.88] p-2.5 text-white shadow-[0_24px_60px_-24px_rgba(0,0,0,0.95)] backdrop-blur-2xl">
            <div className="flex items-center gap-3">
              <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[1.35rem] bg-gradient-to-br ${accentClass} shadow-[0_16px_30px_-18px_rgba(255,107,53,0.95)]`}>
                <Icon size={20} strokeWidth={2.6} />
              </div>
              <div className="min-w-0 flex-1 py-1">
                <p className="truncate text-sm font-black tracking-[-0.02em] text-white">
                  {notification.title}
                </p>
                {notification.body && (
                  <p className="mt-0.5 line-clamp-2 text-xs font-semibold leading-snug text-white/60">
                    {notification.body}
                  </p>
                )}
              </div>
              <div className="h-8 w-12 flex-shrink-0 rounded-full bg-white/10" aria-hidden="true" />
            </div>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
};

export default NotchNotification;
