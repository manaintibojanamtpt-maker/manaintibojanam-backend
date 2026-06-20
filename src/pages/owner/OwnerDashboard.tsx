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
import { CustomerSegmentSummary, getCustomerSegmentsSummary } from '../../services/CustomerIntelligenceService';
import { KitchenHealthResult, calculateKitchenHealth } from '../../services/KitchenHealthService';
import { Activity, TrendingUp, AlertOctagon, Heart, PackageOpen, Award, Target, PackageX, AlertCircle } from 'lucide-react';

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
  const [analytics, setAnalytics] = React.useState<TenantAnalytics | null>(null);
  const [segments, setSegments] = React.useState<CustomerSegmentSummary | null>(null);
  const [healthScore, setHealthScore] = React.useState<KitchenHealthResult | null>(null);
  const [inventoryAlerts, setInventoryAlerts] = React.useState<{name: string, stock: number, isCritical: boolean}[]>([]);
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
          'Authorization': `Bearer ${idToken}`,
          'x-tenant-id': tenantId || ''
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

    const ordersQuery = query(
      collection(getDb(), 'orders'), 
      where('tenantId', '==', tenantId),
      where('status', 'not-in', ['DELIVERED', 'CANCELLED', 'EXPIRED', 'FAILED_DELIVERY'])
    );
    const subscriptionsQuery = query(collection(getDb(), 'subscriptions'), where('tenantId', '==', tenantId));

    let streamsReady = 0;
    let fallbackTimeout: any;

    const markReady = () => {
      streamsReady += 1;
      if (streamsReady >= 2) {
        clearTimeout(fallbackTimeout);
        setLoading(false);
      }
    };

    fallbackTimeout = setTimeout(() => {
      console.warn("OwnerDashboard: Firestore streams timed out (long polling issue). Falling back to empty state.");
      setLoading(false);
    }, 5000);

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

    // Fetch Analytics
    getTenantAnalytics(tenantId).then(data => {
      if (!data) {
        // Trigger background backfill if missing
        backfillAnalytics(tenantId).then(newData => setAnalytics(newData as any));
      } else {
        setAnalytics(data);
      }
    });

    getCustomerSegmentsSummary(tenantId).then(setSegments);

    const menuQuery = query(collection(getDb(), 'menu'), where('tenantId', '==', tenantId));
    const unsubscribeMenu = onSnapshot(menuQuery, (snapshot) => {
      const alerts: any[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.stockCount !== undefined && data.lowStockThreshold !== undefined && data.stockCount <= data.lowStockThreshold) {
          alerts.push({
            name: data.name,
            stock: data.stockCount,
            isCritical: data.stockCount <= 0
          });
        }
      });
      setInventoryAlerts(alerts);
    });

    return () => {
      unsubscribeOrders();
      unsubscribeSubscriptions();
      unsubscribeMenu();
    };
  }, [tenantId]);

  const todayActiveOrders = React.useMemo(() => {
    return orders.filter((order) => ACTIVE_STATUSES.has(String(order.status || '').toUpperCase()) && isTodayOrder(order, today));
  }, [orders, today]);

  React.useEffect(() => {
    if (orders.length > 0) {
      // Mock metrics calculation from orders for now. 
      // In production, these would be derived from historical big-data aggregates.
      const completedOrders = orders.filter(o => o.status === 'DELIVERED').length;
      const totalOrders = orders.length;
      const cancelledOrders = orders.filter(o => o.status === 'CANCELLED').length;
      const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 100;
      const cancellationRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;
      
      setHealthScore(calculateKitchenHealth({
        completionRate: completionRate || 98,
        avgPrepTimeMinutes: 18,
        avgRating: 4.6,
        repeatCustomerRate: 35,
        cancellationRate: cancellationRate,
        refundRate: 1.2
      }));
    }
  }, [orders]);

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
      value: analytics?.repeatCustomers || 0,
      subtext: analytics?.repeatCustomers ? 'Lifetime repeat buyers' : 'Tracking repeats',
      icon: Users
    },
    {
      label: 'Lifetime Revenue',
      value: `₹${(analytics?.totalRevenue || 0).toLocaleString()}`,
      subtext: `${analytics?.totalOrders || 0} total orders completed`,
      icon: Store
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
                  onClick={() => stat.label === "Today's active orders" && navigate('/owner/orders')}
                  className={`bg-[#0f0f11] p-4 sm:p-6 rounded-2xl border border-white/10 relative overflow-hidden ${stat.label === "Today's active orders" ? 'cursor-pointer hover:bg-white/5 transition-colors' : ''}`}
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

          {/* Phase 6C Intelligence Operations Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            
            {/* Kitchen Health Widget */}
            {healthScore && (
              <div className="bg-[#0f0f11] rounded-2xl border border-white/10 p-5 sm:p-6 flex flex-col justify-between overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <Activity size={80} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Target className="text-blue-400" size={18} />
                      Kitchen Health
                    </h3>
                    <span className={`px-2 py-1 rounded-md text-[10px] font-black tracking-widest uppercase ${healthScore.trend === 'UP' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : healthScore.trend === 'DOWN' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'}`}>
                      Trend {healthScore.trend}
                    </span>
                  </div>
                  <div className="flex items-end gap-3 mb-6">
                    <span className="text-5xl font-black text-white">{healthScore.score}</span>
                    <span className="text-sm font-medium text-white/40 mb-1">/ 100</span>
                  </div>
                </div>
                <div className="space-y-2 relative z-10">
                  {healthScore.suggestions.map((suggestion, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-white/60 bg-white/[0.02] p-2.5 rounded-lg border border-white/5">
                      <AlertOctagon size={14} className="text-amber-400 mt-0.5 shrink-0" />
                      <p className="leading-snug">{suggestion}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Customer Intelligence Widget */}
            {segments && (
              <div className="bg-[#0f0f11] rounded-2xl border border-white/10 p-5 sm:p-6 lg:col-span-2 relative overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Users className="text-purple-400" size={18} />
                      Customer Intelligence
                    </h3>
                    <p className="text-xs text-white/40 mt-1">Real-time segmentation of {segments.total} total customers.</p>
                  </div>
                  <button 
                    onClick={() => navigate('/owner/marketing')}
                    className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] border border-white/20"
                  >
                    🚀 Campaign Center
                  </button>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl">
                    <p className="text-[10px] uppercase font-bold tracking-widest text-white/40 mb-1 flex items-center gap-1.5"><Heart size={12} className="text-green-400"/> New</p>
                    <p className="text-2xl font-black text-white">{segments.newCustomers}</p>
                  </div>
                  <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl">
                    <p className="text-[10px] uppercase font-bold tracking-widest text-white/40 mb-1 flex items-center gap-1.5"><TrendingUp size={12} className="text-blue-400"/> Repeat</p>
                    <p className="text-2xl font-black text-white">{segments.repeatCustomers}</p>
                  </div>
                  <div className="bg-white/[0.02] border border-purple-500/20 p-4 rounded-xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-purple-500/10 group-hover:bg-purple-500/20 transition-colors" />
                    <p className="text-[10px] uppercase font-bold tracking-widest text-purple-300 mb-1 flex items-center gap-1.5 relative z-10"><Award size={12} className="text-purple-400"/> VIP</p>
                    <div className="flex items-end gap-2 relative z-10">
                      <p className="text-2xl font-black text-white">{segments.vipCustomers}</p>
                      <span className="text-[10px] font-bold text-green-400 mb-1">+{segments.trends.vipGrowth}%</span>
                    </div>
                  </div>
                  <div className="bg-white/[0.02] border border-red-500/20 p-4 rounded-xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-red-500/5 group-hover:bg-red-500/10 transition-colors" />
                    <p className="text-[10px] uppercase font-bold tracking-widest text-red-300 mb-1 flex items-center gap-1.5 relative z-10"><AlertTriangle size={12} className="text-red-400"/> At Risk</p>
                    <div className="flex items-end gap-2 relative z-10">
                      <p className="text-2xl font-black text-white">{segments.atRiskCustomers}</p>
                      <span className="text-[10px] font-bold text-red-400 mb-1">{segments.trends.atRiskGrowth}%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {/* Top Customers Widget */}
            <div className="bg-[#0f0f11] rounded-2xl border border-white/10 p-5 sm:p-6 flex flex-col justify-between overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Award className="text-yellow-400" size={18} />
                  Top Customers
                </h3>
              </div>
              <div className="space-y-3">
                {repeatCustomers.length > 0 ? repeatCustomers.map((customer, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-white/[0.02] border border-white/5 p-3 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-yellow-500/20 text-yellow-500 flex items-center justify-center font-bold text-xs">
                        #{idx + 1}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{customer.name || 'Guest User'}</p>
                        <p className="text-[10px] text-white/40 uppercase tracking-widest">{customer.ordersCount} Orders</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-white">₹{customer.lifetimeSpend.toLocaleString()}</p>
                      <button onClick={() => navigate('/owner/marketing')} className="text-[10px] font-bold text-purple-400 hover:text-purple-300 uppercase tracking-widest mt-1">Send Reward</button>
                    </div>
                  </div>
                )) : (
                  <div className="text-sm text-white/40 text-center py-4">No customer data yet.</div>
                )}
              </div>
            </div>

            {/* Inventory Alerts Widget */}
            <div className="bg-[#0f0f11] rounded-2xl border border-white/10 p-5 sm:p-6 overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <PackageX className="text-orange-400" size={18} />
                  Inventory Alerts
                </h3>
                {inventoryAlerts.length > 0 && (
                  <span className="bg-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-red-500/30">
                    {inventoryAlerts.length} Action Needed
                  </span>
                )}
              </div>
              <div className="space-y-3">
                {inventoryAlerts.length > 0 ? inventoryAlerts.map((alert, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-white/[0.02] border border-white/5 p-3 rounded-xl">
                    <div className="flex items-center gap-3">
                      <AlertCircle className={alert.isCritical ? "text-red-500" : "text-amber-500"} size={16} />
                      <p className="text-sm font-bold text-white">{alert.name}</p>
                    </div>
                    <span className={`text-xs font-black px-2 py-1 rounded-md ${alert.isCritical ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                      {alert.isCritical ? 'SOLD OUT' : `${alert.stock} LEFT`}
                    </span>
                  </div>
                )) : (
                  <div className="text-sm text-white/40 flex items-center gap-2 py-4">
                    <CheckCircle2 size={16} className="text-green-500"/> All inventory levels are healthy.
                  </div>
                )}
              </div>
            </div>
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

                {(!analytics || analytics.repeatCustomers === 0) ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-5 text-sm text-white/55">
                    Repeat-customer insights and lifetime metrics will unlock as your customer base grows.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex justify-between items-center">
                      <div>
                        <p className="text-white/60 text-sm">Total Lifetime Customers</p>
                        <p className="text-2xl font-black text-white">{analytics.customerCount}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white/60 text-sm">Average Order Value</p>
                        <p className="text-2xl font-black text-white">₹{analytics.averageOrderValue}</p>
                      </div>
                    </div>
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
