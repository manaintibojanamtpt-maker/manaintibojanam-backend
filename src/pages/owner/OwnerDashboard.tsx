import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChefHat,
  ClipboardList,
  Copy,
  ExternalLink,
  MessageCircle,
  ShoppingBag,
  Store,
  Truck,
  Users
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where
} from 'firebase/firestore';
import { getDb } from '../../lib/firebase-db';
import toast from 'react-hot-toast';
import { Order, Subscription } from '../../types';
import { safeParseDate } from '../../lib/utils';
import { deriveOwnerCustomerMemories } from '../../utils/customerMemory';
import { auth } from '../../firebase';

const OWNER_API_BASE_URL = import.meta.env.VITE_API_URL || 'https://manaintibojanam-backend.onrender.com';

type PendingAction = {
  id: string;
  label: string;
  detail: string;
  action: string;
  nextStatus?: Order['status'];
  tone: 'amber' | 'blue' | 'violet';
};

const ACTIVE_STATUSES = new Set([
  'CREATED',
  'PLACED',
  'PENDING',
  'PAYMENT_PENDING',
  'PAYMENT_VERIFICATION',
  'ACCEPTED',
  'PREPARING',
  'READY',
  'COURIER_BOOKED',
  'PICKED_UP',
  'OUT_FOR_DELIVERY'
]);

const PENDING_STATUSES = new Set(['CREATED', 'PLACED', 'PENDING']);

const statusLabelMap: Record<string, string> = {
  CREATED: 'needs review',
  PLACED: 'needs review',
  PENDING: 'needs review',
  ACCEPTED: 'should start cooking',
  PREPARING: 'should be dispatched next',
  READY: 'is ready for handoff',
  OUT_FOR_DELIVERY: 'is on the way'
};

const startOfDay = (value: Date) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const endOfDay = (value: Date) => {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
};

const isSameDay = (left: Date, right: Date) => {
  return startOfDay(left).getTime() === startOfDay(right).getTime();
};

const isScheduledOrder = (order: Order) => {
  return String(order.deliveryType || '').toLowerCase() === 'scheduled'
    || String(order.orderType || '').toLowerCase() === 'scheduled'
    || String(order.fulfillmentType || '').toLowerCase() === 'scheduled'
    || order.isScheduled === true
    || Boolean(order.scheduledFor || order.scheduledTime);
};

const getOperationalOrderDate = (order: Order) => {
  if (isScheduledOrder(order)) {
    if (order.scheduledFor) return safeParseDate(order.scheduledFor);
    if (order.scheduledTime) return safeParseDate(order.scheduledTime);
  }

  return safeParseDate(order.createdAt);
};

const isTodayOrder = (order: Order, today: Date) => {
  return isSameDay(getOperationalOrderDate(order), today);
};

const getStoreUrl = (slugOrId?: string) => {
  if (!slugOrId) return '';
  return `${window.location.origin}/k/${slugOrId}`;
};

const OwnerDashboard = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const tenantId = userProfile?.ownedTenantIds?.[0];
  const tenantName = userProfile?.name || 'Kitchen';

  const [tenantInfo, setTenantInfo] = React.useState<any>(null);
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [subscriptions, setSubscriptions] = React.useState<Subscription[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [updatingOrderId, setUpdatingOrderId] = React.useState<string | null>(null);

  const [today, setToday] = React.useState(() => new Date());
  const storeSlug = tenantInfo?.slug || tenantId;
  const storeUrl = getStoreUrl(storeSlug);

  const copyToClipboard = async () => {
    if (!storeUrl) return;
    await navigator.clipboard.writeText(storeUrl);
    toast.success('Store link copied!');
  };

  const shareToWhatsApp = () => {
    if (!storeUrl) return;
    const text = encodeURIComponent(`Order online from ${tenantName}!\n\nVisit our store: ${storeUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const shareToInstagram = async () => {
    if (!storeUrl) return;
    await navigator.clipboard.writeText(storeUrl);
    toast.success('Link copied! Paste it in your Instagram bio.');
  };

  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    try {
      setUpdatingOrderId(orderId);
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('Owner session expired. Please sign in again.');

      const response = await fetch(`${OWNER_API_BASE_URL}/api/owner/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({ status })
      });

      const result = await response.json().catch(() => null);
      if (!response.ok || result?.success !== true) {
        throw new Error(result?.error || 'Failed to update order status');
      }

      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.id === orderId ? { ...order, status } : order
        )
      );
      toast.success(`Order marked as ${status}`);
    } catch (error) {
      console.error('Owner dashboard status update failed:', error);
      toast.error(error instanceof Error ? error.message : 'Could not update order');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  React.useEffect(() => {
    const healTenantDoc = async () => {
      if (!tenantId || !userProfile?.userId) return;

      try {
        const tenantRef = doc(getDb(), 'tenants', tenantId);
        const tenantDoc = await getDoc(tenantRef);

        if (!tenantDoc.exists()) {
          await setDoc(tenantRef, {
            name: tenantName,
            slug: tenantId,
            ownerId: userProfile.userId,
            status: 'active',
            branding: {
              primaryColor: '#ef4444',
              logoUrl: ''
            },
            createdAt: serverTimestamp()
          });
          setTenantInfo({ id: tenantId, slug: tenantId, name: tenantName, status: 'active' });
          return;
        }

        setTenantInfo({ id: tenantDoc.id, ...tenantDoc.data() });
      } catch (error) {
        console.error('Failed to auto-heal tenant doc:', error);
      }
    };

    healTenantDoc();
  }, [tenantId, tenantName, userProfile]);

  React.useEffect(() => {
    let intervalId: number | null = null;

    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 0, 0);
    const msUntilMidnight = nextMidnight.getTime() - now.getTime();

    const timeoutId = window.setTimeout(() => {
      setToday(new Date());

      intervalId = window.setInterval(() => {
        setToday(new Date());
      }, 24 * 60 * 60 * 1000);
    }, msUntilMidnight);

    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, []);

  React.useEffect(() => {
    if (!tenantId) {
      setOrders([]);
      setSubscriptions([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const ordersQuery = query(collection(getDb(), 'orders'), where('tenantId', '==', tenantId));
    const subscriptionsQuery = query(collection(getDb(), 'subscriptions'), where('tenantId', '==', tenantId));

    let streamsReady = 0;
    const markReady = () => {
      streamsReady += 1;
      if (streamsReady >= 2) {
        setLoading(false);
      }
    };

    const unsubscribeOrders = onSnapshot(
      ordersQuery,
      (snapshot) => {
        setOrders(snapshot.docs.map((snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data() } as Order)));
        markReady();
      },
      (error) => {
        console.error('Failed to load owner orders:', error);
        toast.error('Could not load order summary');
        setOrders([]);
        markReady();
      }
    );

    const unsubscribeSubscriptions = onSnapshot(
      subscriptionsQuery,
      (snapshot) => {
        setSubscriptions(snapshot.docs.map((snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data() } as Subscription)));
        markReady();
      },
      (error) => {
        console.error('Failed to load subscriptions:', error);
        toast.error('Could not load subscription summary');
        setSubscriptions([]);
        markReady();
      }
    );

    return () => {
      unsubscribeOrders();
      unsubscribeSubscriptions();
    };
  }, [tenantId]);

  const todayActiveOrders = React.useMemo(() => {
    return orders.filter((order) => ACTIVE_STATUSES.has(String(order.status || '').toUpperCase()) && isTodayOrder(order, today));
  }, [orders, today]);

  const pendingActions = React.useMemo<PendingAction[]>(() => {
    return todayActiveOrders
      .filter((order) => {
        const normalizedStatus = String(order.status || '').toUpperCase();
        return PENDING_STATUSES.has(normalizedStatus) || normalizedStatus === 'ACCEPTED' || normalizedStatus === 'PREPARING';
      })
      .slice(0, 5)
      .map((order) => {
        const normalizedStatus = String(order.status || '').toUpperCase();
        const tone = PENDING_STATUSES.has(normalizedStatus)
          ? 'amber'
          : normalizedStatus === 'ACCEPTED'
            ? 'blue'
            : 'violet';

        return {
          id: order.id,
          label: `Order #${order.orderNumber || order.id.slice(-4).toUpperCase()}`,
          detail: `${order.customerName || 'Guest Customer'} ${statusLabelMap[normalizedStatus] || 'needs attention'}`,
          action: normalizedStatus === 'PREPARING' ? 'Dispatch soon' : normalizedStatus === 'ACCEPTED' ? 'Start prep' : 'Accept now',
          nextStatus: PENDING_STATUSES.has(normalizedStatus)
            ? 'ACCEPTED' as Order['status']
            : normalizedStatus === 'ACCEPTED'
              ? 'PREPARING' as Order['status']
              : undefined,
          tone
        };
      });
  }, [todayActiveOrders]);

  const repeatCustomers = React.useMemo(() => {
    return deriveOwnerCustomerMemories(orders).slice(0, 4);
  }, [orders]);

  const activeSubscriptions = React.useMemo(() => {
    return subscriptions.filter((subscription) => subscription.status === 'active');
  }, [subscriptions]);

  const todaysScheduledOrders = React.useMemo(() => {
    return orders.filter((order) => {
      const scheduledAt = order.scheduledFor
        ? safeParseDate(order.scheduledFor)
        : order.scheduledTime
          ? safeParseDate(order.scheduledTime)
          : null;
      return isScheduledOrder(order) && scheduledAt && isSameDay(scheduledAt, today);
    });
  }, [orders, today]);

  const upcomingLoadLabel = React.useMemo(() => {
    const breakfast = activeSubscriptions.filter((subscription) =>
      ['breakfast', 'breakfast_lunch', 'all_day'].includes(subscription.deliverySlot)
    ).length;
    const lunch = activeSubscriptions.filter((subscription) =>
      ['lunch', 'breakfast_lunch', 'lunch_dinner', 'all_day'].includes(subscription.deliverySlot)
    ).length;
    const dinner = activeSubscriptions.filter((subscription) =>
      ['dinner', 'lunch_dinner', 'all_day'].includes(subscription.deliverySlot)
    ).length;

    return `${breakfast} breakfast, ${lunch} lunch, ${dinner} dinner`;
  }, [activeSubscriptions]);

  const quickStats = [
    {
      label: "Today's active orders",
      value: todayActiveOrders.length,
      subtext: pendingActions.length > 0 ? `${pendingActions.length} need action now` : 'No urgent order actions',
      icon: ShoppingBag
    },
    {
      label: 'Repeat customers',
      value: repeatCustomers.length,
      subtext: repeatCustomers.length > 0 ? `${repeatCustomers[0].name} leads repeat demand` : 'First repeat customer will appear here',
      icon: Users
    },
    {
      label: 'Active subscriptions',
      value: activeSubscriptions.length,
      subtext: todaysScheduledOrders.length > 0 ? `${todaysScheduledOrders.length} scheduled orders due today` : upcomingLoadLabel,
      icon: CalendarClock
    }
  ];

  const toneClasses: Record<PendingAction['tone'], string> = {
    amber: 'border-amber-500/20 bg-amber-500/10 text-amber-200',
    blue: 'border-blue-500/20 bg-blue-500/10 text-blue-200',
    violet: 'border-violet-500/20 bg-violet-500/10 text-violet-200'
  };

  return (
    <div className="text-white">
      <header className="mb-5 sm:mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Welcome back, {tenantName}</h1>
          <p className="text-sm sm:text-base text-white/50 mt-1">Run today’s kitchen from one place: orders, repeat demand, subscriptions, and share actions.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/owner/orders')}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/80 hover:bg-white/10 sm:w-auto sm:self-start"
        >
          <ClipboardList size={16} />
          Open live orders
        </button>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-red-600/20 to-orange-500/10 border border-red-500/20 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4"
      >
        <div className="w-full min-w-0">
          <h3 className="text-lg font-bold text-white mb-1">Storefront sharing console</h3>
          <p className="text-white/60 text-sm mb-3">Open your storefront fast, copy the link, or push it straight to WhatsApp and Instagram.</p>
          <div className="flex items-center bg-black/40 border border-white/10 rounded-lg px-3 py-2 font-mono text-xs sm:text-sm text-white/80 select-all break-all">
            {storeUrl || 'Store link will appear once your tenant is ready'}
          </div>
        </div>
        <div className="grid w-full grid-cols-2 gap-3 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
          <button onClick={copyToClipboard} className="flex items-center justify-center gap-2 px-4 py-3 sm:py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm font-medium">
            <Copy size={16} /> Copy
          </button>
          <a href={storeUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 px-4 py-3 sm:py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm font-medium">
            <ExternalLink size={16} /> Open
          </a>
          <button onClick={shareToWhatsApp} className="flex items-center justify-center gap-2 px-4 py-3 sm:py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors text-sm font-medium border border-green-500/20">
            <MessageCircle size={16} /> WhatsApp
          </button>
          <button onClick={shareToInstagram} className="flex items-center justify-center gap-2 px-4 py-3 sm:py-2 bg-pink-500/20 hover:bg-pink-500/30 text-pink-400 rounded-lg transition-colors text-sm font-medium border border-pink-500/20">
            <Store size={16} /> Instagram Bio
          </button>
        </div>
      </motion.div>

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-[#0f0f11] p-10 text-center text-white/60">
          Loading today&apos;s cockpit...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {quickStats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * (index + 1) }}
                  className="bg-[#0f0f11] p-4 sm:p-6 rounded-2xl border border-white/10 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Icon size={64} />
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-white/50 uppercase tracking-wider mb-2">{stat.label}</p>
                  <h2 className="text-3xl sm:text-4xl font-black text-white">{stat.value}</h2>
                  <div className="mt-4 text-sm font-medium text-white/60">{stat.subtext}</div>
                </motion.div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-4 sm:gap-6">
            <div className="space-y-4 sm:space-y-6">
              <section className="bg-[#0f0f11] rounded-2xl border border-white/10 p-4 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 mb-5">
                  <div>
                    <h3 className="text-xl font-bold text-white">Pending actions</h3>
                    <p className="text-sm text-white/45">The next order decisions that need owner attention.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/owner/orders')}
                    className="text-sm font-semibold text-red-400 hover:text-red-300"
                  >
                    Review all
                  </button>
                </div>

                {pendingActions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-sm text-white/55">
                    No urgent actions right now. New orders, prep handoffs, and dispatch-ready items will appear here automatically.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingActions.map((action) => (
                      <div key={action.id} className={`rounded-2xl border p-4 ${toneClasses[action.tone]}`}>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-bold text-white">{action.label}</p>
                            <p className="text-sm mt-1 text-white/75">{action.detail}</p>
                          </div>
                          <button
                            type="button"
                            disabled={updatingOrderId === action.id}
                            onClick={() => action.nextStatus ? updateOrderStatus(action.id, action.nextStatus) : navigate('/owner/orders')}
                            className="rounded-full bg-black/25 px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-white transition hover:bg-black/40 disabled:cursor-wait disabled:opacity-60"
                          >
                            {updatingOrderId === action.id ? 'Saving...' : action.action}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="bg-[#0f0f11] rounded-2xl border border-white/10 p-4 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 mb-5">
                  <div>
                    <h3 className="text-xl font-bold text-white">Today&apos;s active orders</h3>
                    <p className="text-sm text-white/45">Live kitchen load for today&apos;s created and scheduled demand.</p>
                  </div>
                  <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold uppercase tracking-widest text-white/60">
                    {todayActiveOrders.length} active
                  </span>
                </div>

                {todayActiveOrders.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-sm text-white/55">
                    No active orders for today yet. Share the storefront link above to bring in the next order.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {todayActiveOrders.slice(0, 6).map((order) => (
                      <div key={order.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                          <div>
                            <p className="font-bold text-white">#{order.orderNumber || order.id.slice(-4).toUpperCase()} • {order.customerName || 'Guest Customer'}</p>
                            <p className="mt-1 text-sm text-white/60">
                              {order.deliveryType === 'scheduled'
                                ? `Scheduled for ${safeParseDate(order.scheduledTime || order.scheduledFor).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })}`
                                : `Placed at ${safeParseDate(order.createdAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })}`}
                            </p>
                          </div>
                          <span className="rounded-full bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white/70">
                            {String(order.status || '').replaceAll('_', ' ')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <div className="space-y-4 sm:space-y-6">
              <section className="bg-[#0f0f11] rounded-2xl border border-white/10 p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Users className="text-red-400" size={20} />
                  <div>
                    <h3 className="text-xl font-bold text-white">Repeat customers snapshot</h3>
                    <p className="text-sm text-white/45">Customers who are already coming back.</p>
                  </div>
                </div>

                {repeatCustomers.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-5 text-sm text-white/55">
                    Repeat-customer insights will unlock after the same buyer orders at least twice.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {repeatCustomers.map((customer) => (
                      <div key={customer.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-bold text-white">{customer.name}</p>
                            <p className="text-sm text-white/55">{customer.phone || 'Known customer profile'}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {customer.topDishes[0] && (
                                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/70">
                                  Usually orders {customer.topDishes[0].name}
                                </span>
                              )}
                              {customer.preferredDeliverySlot && (
                                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/70">
                                  Slot {customer.preferredDeliverySlot}
                                </span>
                              )}
                              {customer.lastPaymentPreference && (
                                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/70">
                                  {customer.lastPaymentPreference}
                                </span>
                              )}
                            </div>
                            {customer.recentNote && (
                              <p className="mt-3 text-sm text-white/50">Recent note: {customer.recentNote}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-black text-white">{customer.totalOrders}x</p>
                            <p className="text-xs text-white/45">repeat orders</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="bg-[#0f0f11] rounded-2xl border border-white/10 p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <CalendarClock className="text-orange-400" size={20} />
                  <div>
                    <h3 className="text-xl font-bold text-white">Subscription load</h3>
                    <p className="text-sm text-white/45">Recurring demand plus scheduled load for today.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-sm text-white/50">Active plans</p>
                    <p className="mt-2 text-3xl font-black text-white">{activeSubscriptions.length}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-sm text-white/50">Scheduled today</p>
                    <p className="mt-2 text-3xl font-black text-white">{todaysScheduledOrders.length}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/70">
                  <p className="font-semibold text-white mb-2">Slot mix</p>
                  <p>{upcomingLoadLabel}</p>
                </div>
              </section>

              <section className="bg-[#0f0f11] rounded-2xl border border-white/10 p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="text-amber-400" size={20} />
                  <div>
                    <h3 className="text-xl font-bold text-white">Owner quick actions</h3>
                    <p className="text-sm text-white/45">Fast jumps for the most common daily workflows.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button onClick={() => navigate('/owner/orders')} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left hover:bg-white/[0.06]">
                    <div className="flex items-center gap-2 text-white font-bold"><ChefHat size={16} /> Review kitchen queue</div>
                    <p className="mt-2 text-sm text-white/55">Accept, prep, dispatch, and close out today&apos;s orders.</p>
                  </button>
                  <button onClick={shareToWhatsApp} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left hover:bg-white/[0.06]">
                    <div className="flex items-center gap-2 text-white font-bold"><MessageCircle size={16} /> Share on WhatsApp</div>
                    <p className="mt-2 text-sm text-white/55">Push your storefront to customers right when the kitchen is ready for more demand.</p>
                  </button>
                  <button onClick={copyToClipboard} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left hover:bg-white/[0.06]">
                    <div className="flex items-center gap-2 text-white font-bold"><Copy size={16} /> Copy store link</div>
                    <p className="mt-2 text-sm text-white/55">Use it in status, stories, DMs, or neighborhood groups.</p>
                  </button>
                  <a href={storeUrl} target="_blank" rel="noopener noreferrer" className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left hover:bg-white/[0.06]">
                    <div className="flex items-center gap-2 text-white font-bold"><ExternalLink size={16} /> Open storefront</div>
                    <p className="mt-2 text-sm text-white/55">Verify today&apos;s menu, subscription pitch, and order flow from the customer side.</p>
                  </a>
                </div>
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default OwnerDashboard;
