import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { m } from 'framer-motion';
import {
  Bell,
  Search,
  Filter,
  CheckCheck,
  Archive,
  Sparkles,
  TrendingUp,
  Package,
  ChefHat,
  CreditCard,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { GlassCard } from '../../components/ui/GlassCard';
import { useNotificationCenter } from './hooks/useNotifications';
import {
  NotificationCategory,
  NotificationPriority,
  NotificationStatus,
  TenantNotification,
} from './NotificationTypes';

const CATEGORY_FILTERS: Array<{ id: NotificationCategory | 'ALL'; label: string; icon: React.ReactNode }> = [
  { id: 'ALL', label: 'All', icon: <Bell size={14} /> },
  { id: NotificationCategory.SALES, label: 'Sales', icon: <TrendingUp size={14} /> },
  { id: NotificationCategory.INVENTORY, label: 'Inventory', icon: <Package size={14} /> },
  { id: NotificationCategory.KITCHEN, label: 'Kitchen', icon: <ChefHat size={14} /> },
  { id: NotificationCategory.AI_RECOMMENDATION, label: 'AI', icon: <Sparkles size={14} /> },
  { id: NotificationCategory.PAYMENTS, label: 'Payments', icon: <CreditCard size={14} /> },
];

const STATUS_TABS = [
  { id: 'ALL' as const, label: 'All' },
  { id: NotificationStatus.UNREAD, label: 'Unread' },
  { id: NotificationStatus.READ, label: 'Read' },
  { id: NotificationPriority.CRITICAL, label: 'Critical' },
];

const priorityStyles: Record<NotificationPriority, string> = {
  LOW: 'bg-white/10 text-white/60',
  MEDIUM: 'bg-blue-500/20 text-blue-300',
  HIGH: 'bg-amber-500/20 text-amber-300',
  CRITICAL: 'bg-red-500/20 text-red-300',
};

const formatTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
};

export const NotificationCenter: React.FC = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { tenantId: ctxTenantId } = useTenant();
  const tenantId = ctxTenantId || userProfile?.ownedTenantIds?.[0];

  const { items, loading, filter, setFilter, search, setSearch, markRead, markAllRead, archive, reload } =
    useNotificationCenter(tenantId);

  const [activeTab, setActiveTab] = useState<'ALL' | NotificationStatus | NotificationPriority>('ALL');

  const filteredItems = items.filter((n) => {
    if (activeTab === NotificationStatus.UNREAD) return n.status === NotificationStatus.UNREAD;
    if (activeTab === NotificationStatus.READ) return n.status === NotificationStatus.READ;
    if (activeTab === NotificationPriority.CRITICAL) return n.priority === NotificationPriority.CRITICAL;
    return true;
  });

  const onOpen = async (notification: TenantNotification) => {
    await markRead(notification.id);
    if (notification.actionUrl) navigate(notification.actionUrl);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <Bell className="text-red-400" />
            AI Notification Center
          </h1>
          <p className="text-white/50 text-sm mt-1">
            Daily briefs and alerts about sales, stock, and kitchen — with clear next steps.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => markAllRead()}
            className="px-4 py-2 rounded-xl border border-white/10 text-white/70 text-sm font-semibold hover:bg-white/5 flex items-center gap-2"
          >
            <CheckCheck size={16} /> Mark all read
          </button>
          <button
            type="button"
            onClick={() => reload()}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm font-semibold hover:bg-white/10"
          >
            Refresh
          </button>
        </div>
      </div>

      <GlassCard hoverEffect={false} className="!p-4 sm:!p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notifications..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-red-500/50"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                  activeTab === tab.id ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-white/5 text-white/50 border border-white/10'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {CATEGORY_FILTERS.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setFilter({ ...filter, category: cat.id })}
              className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-colors ${
                filter.category === cat.id
                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                  : 'bg-white/5 text-white/50 border border-white/10 hover:text-white/70'
              }`}
            >
              {cat.icon}
              {cat.label}
            </button>
          ))}
        </div>
      </GlassCard>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-white/50">
          <Loader2 className="animate-spin mr-2" size={20} /> Loading notifications...
        </div>
      ) : filteredItems.length === 0 ? (
        <GlassCard hoverEffect={false} className="text-center py-16">
          <Filter className="mx-auto text-white/20 mb-4" size={40} />
          <p className="text-white/60 font-medium">No notifications match your filters.</p>
          <p className="text-white/40 text-sm mt-1">BhojanOS will generate insights as your kitchen operates.</p>
        </GlassCard>
      ) : (
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-red-500/40 via-white/10 to-transparent hidden sm:block" />
          <div className="space-y-4">
            {filteredItems.map((notification, index) => (
              <m.div
                key={notification.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className="sm:pl-10"
              >
                <div
                  className={`rounded-2xl border p-4 sm:p-5 transition-all cursor-pointer group ${
                    notification.status === NotificationStatus.UNREAD
                      ? 'border-red-500/30 bg-red-500/[0.04] hover:border-red-500/50'
                      : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                  }`}
                  onClick={() => onOpen(notification)}
                  onKeyDown={(e) => e.key === 'Enter' && onOpen(notification)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${priorityStyles[notification.priority]}`}>
                          {notification.priority}
                        </span>
                        <span className="text-[10px] font-bold uppercase text-white/30 tracking-wider">
                          {notification.category.replace('_', ' ')}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white group-hover:text-red-300 transition-colors">
                        {notification.title}
                      </h3>
                      <p className="text-sm text-white/55 mt-1 leading-relaxed">{notification.message}</p>
                      <p className="text-[11px] text-white/30 mt-2">{formatTime(notification.createdAt)}</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          archive(notification.id);
                        }}
                        className="p-2 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/70"
                        aria-label="Archive"
                      >
                        <Archive size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </m.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
