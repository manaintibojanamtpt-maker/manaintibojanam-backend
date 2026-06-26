import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ExternalLink } from 'lucide-react';
import { m, AnimatePresence } from 'framer-motion';
import { TenantNotification, NotificationStatus } from './NotificationTypes';

interface NotificationDrawerProps {
  open: boolean;
  onClose: () => void;
  notifications: TenantNotification[];
  onSelect: (notification: TenantNotification) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  open,
  onClose,
  notifications,
  onSelect,
}) => {
  const navigate = useNavigate();

  return (
    <AnimatePresence>
      {open && (
        <>
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          <m.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[#0a0a0a] border-l border-white/10 z-50 flex flex-col"
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-white">Notifications</h2>
                <p className="text-xs text-white/50">Quick preview</p>
              </div>
              <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white/60">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => onSelect(n)}
                  className={`w-full text-left rounded-2xl border border-white/10 bg-white/[0.03] p-4 hover:border-white/20 transition-colors ${
                    n.status === NotificationStatus.UNREAD ? 'ring-1 ring-red-500/30' : ''
                  }`}
                >
                  <p className="font-bold text-white text-sm">{n.title}</p>
                  <p className="text-xs text-white/50 mt-1">{n.message}</p>
                </button>
              ))}
            </div>

            <div className="p-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/owner/notifications');
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-orange-500 text-white font-bold text-sm flex items-center justify-center gap-2"
              >
                Open Notification Center <ExternalLink size={16} />
              </button>
            </div>
          </m.aside>
        </>
      )}
    </AnimatePresence>
  );
};

export default NotificationDrawer;
