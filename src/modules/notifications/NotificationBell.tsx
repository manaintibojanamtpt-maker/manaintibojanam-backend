import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronRight, X } from 'lucide-react';
import { m, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useOrderAlerts } from '../../hooks/useOrderAlerts';
import { useNotifications } from './hooks/useNotifications';
import { notificationService } from './NotificationService';
import { NotificationPriority, NotificationStatus, TenantNotification } from './NotificationTypes';

const priorityColor: Record<NotificationPriority, string> = {
  LOW: 'text-white/40',
  MEDIUM: 'text-blue-400',
  HIGH: 'text-amber-400',
  CRITICAL: 'text-red-400',
};

interface NotificationBellProps {
  tenantId?: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ tenantId }) => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const resolvedTenantId = tenantId || userProfile?.ownedTenantIds?.[0];
  const { pendingCount } = useOrderAlerts();
  const { preview, unreadCount, handleClick, archive, dismissAll } = useNotifications(resolvedTenantId, 5);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalBadge = unreadCount + pendingCount;

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    if (open && resolvedTenantId) {
      notificationService.recordDrawerOpened(resolvedTenantId, userProfile?.ownedTenantIds);
    }
  }, [open, resolvedTenantId, userProfile?.ownedTenantIds]);

  const onDismiss = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    await archive(notificationId);
  };

  const onNotificationClick = async (notification: TenantNotification) => {
    await handleClick(notification);
    setOpen(false);
    if (notification.actionUrl) navigate(notification.actionUrl);
    else navigate('/owner/notifications');
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors relative"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {totalBadge > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center">
            {totalBadge > 9 ? '9+' : totalBadge}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <m.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-white/10 bg-[#111111] shadow-2xl z-50 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-bold text-white">Notification Center</p>
                <p className="text-xs text-white/50 mt-0.5">AI-powered business intelligence</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {preview.length > 0 && (
                  <button
                    type="button"
                    onClick={() => dismissAll()}
                    className="text-[10px] font-semibold text-white/50 hover:text-white transition-colors"
                  >
                    Clear all
                  </button>
                )}
                {pendingCount > 0 && (
                  <span className="text-[10px] font-bold bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
                    {pendingCount} pending order{pendingCount === 1 ? '' : 's'}
                  </span>
                )}
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto">
              {preview.length === 0 ? (
                <p className="p-4 text-sm text-white/50">No notifications yet. BhojanOS will alert you about sales, inventory, and kitchen insights.</p>
              ) : (
                preview.map((n) => (
                  <div
                    key={n.id}
                    className={`flex items-stretch border-b border-white/5 ${
                      n.status === NotificationStatus.UNREAD ? 'bg-white/[0.03]' : ''
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onNotificationClick(n)}
                      className="flex-1 text-left px-4 py-3 hover:bg-white/5 transition-colors min-w-0"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-white line-clamp-1">{n.title}</p>
                        <span className={`text-[10px] font-bold uppercase shrink-0 ${priorityColor[n.priority]}`}>{n.priority}</span>
                      </div>
                      <p className="text-xs text-white/50 mt-1 line-clamp-2">{n.message}</p>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => onDismiss(e, n.id)}
                      className="px-3 text-white/30 hover:text-white hover:bg-white/5 transition-colors shrink-0"
                      aria-label="Dismiss notification"
                      title="Ignore"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 space-y-2 border-t border-white/10">
              {pendingCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    navigate('/owner/orders');
                  }}
                  className="w-full py-2 rounded-lg bg-red-600/90 hover:bg-red-500 text-white text-xs font-semibold transition-colors"
                >
                  Open orders ({pendingCount})
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigate('/owner/notifications');
                }}
                className="w-full py-2 rounded-lg border border-white/10 text-white/80 text-xs font-semibold hover:bg-white/5 transition-colors flex items-center justify-center gap-1"
              >
                View All <ChevronRight size={14} />
              </button>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
