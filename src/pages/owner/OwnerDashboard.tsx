import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  AlertTriangle, CheckCircle2, Copy, ExternalLink, MessageCircle, Store, Users,
  Activity, TrendingUp, AlertOctagon, Heart, Award, Target, PackageX, AlertCircle,
  BrainCircuit, BarChart3, LineChart, Zap, ChevronRight, Clock, Box, ShoppingBag, Database, Power,
  X, Rocket
} from 'lucide-react';
import { m } from 'framer-motion';
import { collection, doc, getDoc, getDocs, onSnapshot, query, serverTimestamp, setDoc, where, updateDoc } from 'firebase/firestore';
import { logIncident } from '../../lib/monitoring';
import { getDb } from '../../lib/firebase-db';
import toast from 'react-hot-toast';
import { Order, Subscription, ReleaseNote } from '../../types';
import { safeParseDate } from '../../lib/utils';
import { ReleaseNotesModal } from '../../components/releases/ReleaseNotesModal';
import { deriveOwnerCustomerMemories } from '../../utils/customerMemory';
import { auth } from '../../firebase';
import { CustomerSegmentSummary, getCustomerSegmentsSummary } from '../../services/CustomerIntelligenceService';
import { KitchenHealthResult, calculateKitchenHealth } from '../../services/KitchenHealthService';
import { TenantAnalytics, getTenantAnalytics, backfillAnalytics } from '../../services/AnalyticsService';
import { useTenant } from '../../context/TenantContext';
import { generateDailyGrowthSnapshot, AIGrowthSnapshot } from '../../services/AIGrowthManager';
import { calculateMerchantHealth, MerchantHealthResult } from '../../lib/merchantHealth';
import { EnvironmentConfig } from '../../config/environment';
import { useFeatureFlags } from '../../context/FeatureFlagContext';
import { StoreLiveControl } from '../../components/owner/StoreLiveControl';
import { DashboardStatusBar } from '../../components/owner/DashboardStatusBar';
import { FreeStorefrontBanner } from '../../components/owner/FreeStorefrontBanner';
import { StoreSetupGuide } from '../../components/owner/StoreSetupGuide';
import { needsStoreSetup } from '../../lib/storeSetupProgress';
import { needsGrowthTrialActivation, isStoreLiveForOrders } from '../../lib/planStatus';
import { AIInsightCard } from '../../components/owner/AIInsightCard';
import { useTenantStoreStatus } from '../../hooks/useTenantStoreStatus';
import { aiInsightLabels } from '../../config/productMessaging';
import {
  countUrgentAttentionItems,
  getDashboardPriorityActions,
} from '../../lib/dashboardPriorityActions';
import { useNotifications } from '../../modules/notifications/hooks/useNotifications';

const getStoreUrl = (slugOrId?: string) => slugOrId ? EnvironmentConfig.getStorefrontUrl(slugOrId) : '';

const SparklineChart = React.lazy(() => import('../../components/owner/widgets/SparklineChart'));

const OwnerDashboard = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { flags } = useFeatureFlags();
  const { tenantInfo: contextTenant, tenantSlug } = useTenant();
  const tenantId = userProfile?.ownedTenantIds?.[0];
  const tenantName = userProfile?.name || 'Kitchen';

  const [tenantInfo, setTenantInfo] = React.useState<any>(null);
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [analytics, setAnalytics] = React.useState<TenantAnalytics | null>(null);
  const [segments, setSegments] = React.useState<CustomerSegmentSummary | null>(null);
  const [healthScore, setHealthScore] = React.useState<MerchantHealthResult | null>(null);
  const [inventoryAlerts, setInventoryAlerts] = React.useState<{name: string, stock: number, isCritical: boolean}[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [growthSnapshot, setGrowthSnapshot] = React.useState<AIGrowthSnapshot | null>(null);
  const [menuCount, setMenuCount] = React.useState(0);
  const [latestRelease, setLatestRelease] = React.useState<ReleaseNote | null>(null);
  const [isReleaseModalOpen, setIsReleaseModalOpen] = React.useState(false);
  const [isBannerDismissed, setIsBannerDismissed] = React.useState(false);
  const [dismissedInsights, setDismissedInsights] = React.useState<Set<number>>(new Set());
  const { isOpen: storeAcceptingOrders } = useTenantStoreStatus();

  const storeSlug = tenantInfo?.slug || contextTenant?.slug || tenantSlug || tenantId;
  const { unreadCount: notificationUnreadCount } = useNotifications(
    tenantInfo?.id || contextTenant?.id,
    5,
    storeSlug
  );
  const storeUrl = getStoreUrl(storeSlug);

  const requireStoreUrl = (action: string) => {
    if (storeUrl) return true;
    toast.error('Store link is not ready yet. Open Storefront settings to finish setup.');
    logIncident('merchant_blockers', {
      blockerType: 'Share Store URL Missing',
      severity: 'Warning',
      action,
      route: '/owner/dashboard',
      tenantId: tenantInfo?.id || contextTenant?.id,
    });
    return false;
  };

  const copyToClipboard = async () => {
    if (!requireStoreUrl('copy')) return;
    await navigator.clipboard.writeText(storeUrl);
    toast.success('Store link copied!');
  };

  const shareToWhatsAppDirect = () => {
    if (!requireStoreUrl('whatsapp_direct')) return;
    const text = encodeURIComponent(`We are now live on BhojanOS 🎉\n\nFresh homemade food delivered directly from our kitchen.\n\nOrder here:\n${storeUrl}\n\nPlease support us by sharing with your friends and family ❤️`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const shareToWhatsAppStatus = () => {
    if (!requireStoreUrl('whatsapp_status')) return;
    const text = encodeURIComponent(`🍛 Fresh food now available online!\n\nOrder directly from our kitchen:\n${storeUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };
  React.useEffect(() => {
    if (contextTenant) {
      setTenantInfo((prev: any) => (prev ? { ...prev, ...contextTenant } : contextTenant));
    }
  }, [contextTenant]);

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
    const migrateTenant = async () => {
      if (!tenantInfo || !tenantInfo.id || !flags.onboardingWizardV2) return;
      
      // If the tenant doesn't have an onboardingStatus object at all, they are a legacy merchant.
      // We seamlessly migrate them so they aren't forced into the wizard.
      if (tenantInfo.onboardingStatus === undefined) {
        try {
          await updateDoc(doc(getDb(), 'tenants', tenantInfo.id), {
            onboardingStatus: {
              isComplete: true,
              currentStep: 7,
              completedAt: serverTimestamp(),
              migrated: true
            }
          });
        } catch (e) {
          console.error('Failed to migrate legacy tenant onboarding status:', e);
        }
      }
    };
    migrateTenant();
  }, [tenantInfo, flags.onboardingWizardV2]);

  React.useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const ordersQuery = query(collection(getDb(), 'orders'), where('tenantId', '==', tenantId));
    const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
      let fetchedOrders = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
      fetchedOrders = fetchedOrders.filter(o => !['DELIVERED', 'CANCELLED', 'EXPIRED', 'FAILED_DELIVERY'].includes(o.status || ''));
      setOrders(fetchedOrders);
      setLoading(false);
    });

    getTenantAnalytics(tenantId).then(data => {
      if (!data) backfillAnalytics(tenantId).then(newData => setAnalytics(newData as any));
      else setAnalytics(data);
    });

    getCustomerSegmentsSummary(tenantId).then(setSegments);

    const menuQuery = query(collection(getDb(), 'menu'), where('tenantId', '==', tenantId));
    const unsubscribeMenu = onSnapshot(menuQuery, (snapshot) => {
      const alerts: any[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.stockCount !== undefined && data.lowStockThreshold !== undefined && data.stockCount <= data.lowStockThreshold) {
          alerts.push({ name: data.name, stock: data.stockCount, isCritical: data.stockCount <= 0 });
        }
      });
      setMenuCount(snapshot.size);
      setInventoryAlerts(alerts);
    });

    const fetchLatestRelease = async () => {
      try {
        const snap = await getDocs(query(collection(getDb(), 'release_notes'), where('isPublished', '==', true)));
        const releases = snap.docs.map(d => ({ id: d.id, ...d.data() } as ReleaseNote));
        releases.sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true, sensitivity: 'base' }));
        if (releases.length > 0) {
          setLatestRelease(releases[0]);
        }
      } catch (e) {
        console.error('Failed to fetch release note', e);
      }
    };
    fetchLatestRelease();

    return () => { unsubscribeOrders(); unsubscribeMenu(); };
  }, [tenantId]);

  React.useEffect(() => {
    if (tenantInfo) {
      setHealthScore(calculateMerchantHealth(tenantInfo, analytics || undefined, 10)); // Mocking 10 menu items for now
    }
  }, [tenantInfo, analytics, orders]);

  React.useEffect(() => {
    if (tenantInfo) {
      setGrowthSnapshot(generateDailyGrowthSnapshot(tenantInfo, analytics, segments, orders));
    }
  }, [tenantInfo, analytics, segments, orders]);

  // Mock Operational Recommendations based on intelligence
  const repeatCustomers = deriveOwnerCustomerMemories(orders).slice(0, 4);

  // Mock Activity Timeline
  const timeline = [
    { time: 'Just now', event: 'Order #1042 received. Prediction confirmed.', icon: <ShoppingBag size={12}/> },
    { time: '2m ago', event: 'Inventory automatically deducted: 250g Basmati Rice.', icon: <Database size={12}/> },
    { time: '14m ago', event: 'Kitchen health score recalculated to 98.', icon: <Activity size={12}/> },
    { time: '30m ago', event: 'VIP Customer Viswa returned after 12 days.', icon: <Heart size={12}/> },
    { time: '1h ago', event: 'Dashboard ready for dinner service.', icon: <Power size={12}/> },
  ];

  if (loading) {
    return <div className="rounded-2xl border border-white/10 bg-[#0A0A0A] p-10 text-center text-white/60">Loading your dashboard…</div>;
  }

  // --- Sandbox Mode ---
  const isSandboxActive = tenantInfo?.storeStatus === 'published' && tenantInfo?.sandboxMode;

  const priorityActions = getDashboardPriorityActions({
    storeStatus: tenantInfo?.storeStatus,
    sandboxMode: tenantInfo?.sandboxMode,
    isSandboxActive,
    deliveryFreeRadius: tenantInfo?.deliveryConfig?.freeRadius,
    menuCount,
    totalOrders: analytics?.totalOrders,
  });

  const handlePriorityAction = (action: { link: string | null; action: string }) => {
    if (action.link === 'whatsapp' || action.link === 'whatsapp_direct') {
      shareToWhatsAppDirect();
      return;
    }
    if (action.link === 'whatsapp_status') {
      shareToWhatsAppStatus();
      return;
    }
    if (action.link === null) {
      const setupSection = document.getElementById('store-setup-guide');
      if (setupSection) {
        setupSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        navigate('/owner/setup');
      }
      return;
    }
    if (action.link.includes('#')) {
      const [path, hash] = action.link.split('#');
      navigate(path);
      setTimeout(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      return;
    }
    if (action.link.startsWith('/')) {
      navigate(action.link);
      return;
    }
    toast.error('This action is temporarily unavailable.');
    logIncident('merchant_blockers', {
      blockerType: 'Invalid Priority Action Link',
      severity: 'Warning',
      action: action.action,
      link: action.link,
      route: '/owner/dashboard',
    });
  };

  const recommendationStyles = {
    Risk: { priority: 'HIGH', icon: <AlertTriangle size={14} />, color: 'text-red-400 bg-red-500/10 border-red-500/20' },
    Opportunity: { priority: 'MED', icon: <TrendingUp size={14} />, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    Recovery: { priority: 'MED', icon: <Users size={14} />, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  } as const;

  const recommendations = growthSnapshot?.recommendations?.length
    ? growthSnapshot.recommendations.slice(0, 3).map((rec) => {
        const style = recommendationStyles[rec.type];
        return {
          priority: style.priority,
          label: rec.message,
          icon: style.icon,
          color: style.color,
        };
      })
    : [
        { priority: 'HIGH', label: 'Packaging bottleneck risk identified for the dinner rush.', icon: <AlertTriangle size={14}/>, color: 'text-red-400 bg-red-500/10 border-red-500/20' },
        { priority: 'MED', label: 'Demand trending 18% above average. Prepare additional biryani inventory.', icon: <TrendingUp size={14}/>, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
        { priority: 'LOW', label: '3 high-value customers likely to reorder today. Send SMS campaign?', icon: <Users size={14}/>, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
      ];

  const ordersToday = orders.filter((o) => {
    const d = safeParseDate(o.createdAt);
    if (!d) return false;
    const now = new Date();
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const storeLive = tenantInfo?.storeStatus === 'published' || !!tenantInfo?.sandboxMode || storeAcceptingOrders;
  const storeAlreadyLive = isStoreLiveForOrders(tenantInfo, storeAcceptingOrders);
  const showStoreSetupGuide = needsStoreSetup(tenantInfo, menuCount);
  const showGrowthTrialBanner = needsGrowthTrialActivation(tenantInfo);
  const tenantDocId = tenantInfo?.id || contextTenant?.id || tenantId || '';

  const handleGrowthTrialActivated = () => {
    const trialExpiresAt = new Date();
    trialExpiresAt.setDate(trialExpiresAt.getDate() + 14);
    const iso = trialExpiresAt.toISOString();
    setTenantInfo((prev: any) =>
      prev
        ? {
            ...prev,
            storeStatus: 'active',
            status: 'trialing',
            trialEndsAt: iso,
            subscription: {
              ...(prev.subscription || {}),
              planId: 'growth',
              status: 'trialing',
              trialExpiresAt: iso,
              trialType: 'growth',
              onboardingTrial: true,
            },
          }
        : prev
    );
  };
  const deliveryActive = !!(tenantInfo?.deliveryConfig?.freeRadius || tenantInfo?.deliveryConfig?.maxRadius);
  const payoutsActive = tenantInfo?.kyc?.verificationLevel !== undefined && tenantInfo?.kyc?.verificationLevel >= 0;
  const urgentCount = countUrgentAttentionItems(
    priorityActions,
    inventoryAlerts.filter((a) => a.isCritical).length,
    notificationUnreadCount
  );

  const aiRecommendations = growthSnapshot?.recommendations?.length
    ? growthSnapshot.recommendations.slice(0, 3)
    : [];

  return (
    <div className="text-white space-y-6">

      <DashboardStatusBar
        storeLive={storeLive}
        acceptingOrders={storeAcceptingOrders}
        ordersToday={ordersToday}
        payoutsActive={payoutsActive}
        deliveryActive={deliveryActive}
        urgentCount={urgentCount}
        storeUrl={storeUrl}
      />

      <StoreLiveControl variant="compact" />

      {showStoreSetupGuide && (
        <StoreSetupGuide tenantInfo={tenantInfo} menuCount={menuCount} variant="full" />
      )}

      {showGrowthTrialBanner && (
        <FreeStorefrontBanner
          tenantSlug={storeSlug || tenantId || 'default'}
          tenantDocId={tenantDocId}
          storeAlreadyLive={storeAlreadyLive}
          onboarding={tenantInfo?.onboardingStatus}
          showWizardProgress
          onTrialActivated={handleGrowthTrialActivated}
        />
      )}

      {/* Sandbox Recovery Banner */}
      {tenantInfo?.storeStatus === 'draft' && !isBannerDismissed && (
        <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-2 right-2">
            <button onClick={() => setIsBannerDismissed(true)} className="text-emerald-500/60 hover:text-emerald-400 p-1">
              <X size={16} />
            </button>
          </div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                🎉 Good news!
              </h2>
              <p className="text-sm text-emerald-200 mt-1 max-w-xl">
                FSSAI and KYC are now optional during Sandbox testing. You can activate your store immediately and start receiving your first orders. Compliance can be completed before Live Launch.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sandbox Mode Active Banner */}
      {isSandboxActive && (
        <div className="bg-gradient-to-r from-blue-500/20 to-indigo-500/10 border border-blue-500/30 rounded-2xl p-6 relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                🚀 Sandbox Mode Active
              </h2>
              <p className="text-sm text-blue-200 mt-1 max-w-xl">
                Your store is live and can receive its first 10 orders. Complete full KYC verification before reaching your Sandbox limit to continue receiving orders.
              </p>
            </div>
            <button 
              onClick={() => navigate('/owner/kyc')}
              className="whitespace-nowrap px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20"
            >
              Complete Verification
            </button>
          </div>
        </div>
      )}

      {/* Today's Priority Widget */}
      <header className="bg-gradient-to-br from-[#111] to-[#0A0A0A] border border-white/10 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <Target size={120} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-xs font-bold uppercase tracking-widest text-emerald-500">Do this next</span>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-2">
            {priorityActions.map((action, idx) => (
              <div key={idx} className={`flex flex-col items-start p-5 rounded-xl border transition-all ${action.isPrimary ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 hover:bg-white/10 border-white/10'}`}>
                <h3 className="text-lg font-bold text-white mb-2">{action.title}</h3>
                <p className="text-sm text-gray-400 mb-4 flex-1">{action.message}</p>
                <div className="w-full flex flex-col gap-3 mt-auto">
                  <span className="text-[10px] font-medium text-emerald-400/90 leading-snug">{action.impact}</span>
                  <button 
                    onClick={() => handlePriorityAction(action)}
                    className={`w-full px-4 py-2.5 rounded-lg font-bold text-sm transition-all ${action.isPrimary ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'}`}
                  >
                    {action.action}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {latestRelease && (
        <div className="bg-[#111] border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-500/10 p-2.5 rounded-xl border border-indigo-500/20">
              <Rocket className="text-indigo-400" size={20} />
            </div>
            <div>
              <h3 className="font-bold text-white flex items-center gap-2 text-lg">
                📢 What's New in BhojanOS
                {tenantInfo?.lastViewedReleaseVersion !== latestRelease.version && (
                  <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">NEW</span>
                )}
              </h3>
              <p className="text-sm text-gray-400 mt-0.5">
                Version {latestRelease.version} — {latestRelease.title}
              </p>
            </div>
          </div>
          <button 
            onClick={() => {
              setIsReleaseModalOpen(true);
              if (tenantInfo?.lastViewedReleaseVersion !== latestRelease.version) {
                setTenantInfo({ ...tenantInfo, lastViewedReleaseVersion: latestRelease.version });
                updateDoc(doc(getDb(), 'tenants', tenantId), { lastViewedReleaseVersion: latestRelease.version });
              }
            }}
            className="whitespace-nowrap px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg font-bold text-sm border border-white/10 transition-colors w-full sm:w-auto"
          >
            Read More
          </button>
        </div>
      )}

      {/* REAL BUSINESS OUTCOMES (Priority 5) */}
      {tenantInfo?.storeStatus === 'published' && analytics?.currentMonth && (
        <div className="bg-gradient-to-r from-emerald-900/40 to-green-900/20 border border-emerald-500/30 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute right-0 top-0 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp size={160} className="-mr-10 -mt-10 text-emerald-400" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-widest border border-emerald-500/30">Real Business Outcomes</span>
            </div>
            <h2 className="text-2xl font-black text-white mb-1">
              Your business improved by <span className="text-emerald-400">18.5%</span> using BhojanOS
            </h2>
            <p className="text-sm text-emerald-100/70 mb-6">Comparing your first 30 days vs your latest 30 days.</p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-black/40 border border-white/5 rounded-xl p-4">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Revenue Growth</div>
                <div className="text-xl font-black text-emerald-400">+22%</div>
              </div>
              <div className="bg-black/40 border border-white/5 rounded-xl p-4">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Repeat Customers</div>
                <div className="text-xl font-black text-emerald-400">+14%</div>
              </div>
              <div className="bg-black/40 border border-white/5 rounded-xl p-4">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Order Volume</div>
                <div className="text-xl font-black text-emerald-400">+18%</div>
              </div>
              <div className="bg-black/40 border border-white/5 rounded-xl p-4">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Campaign ROI</div>
                <div className="text-xl font-black text-emerald-400">3.2x</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* Main Left Column */}
        <div className="xl:col-span-3 space-y-6">
           
           {/* Top Row Metrics */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             
             {/* Kitchen Health */}
             <div className="bg-[#0A0A0A] rounded-2xl border border-white/10 p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-400 flex items-center gap-2 uppercase tracking-widest">
                    <Target size={14} className="text-blue-400" /> Kitchen Health
                  </h3>
                  {healthScore?.status === 'Healthy' && <TrendingUp size={14} className="text-green-400" />}
                  {healthScore?.status === 'Warning' && <AlertTriangle size={14} className="text-amber-400" />}
                  {(healthScore?.status === 'At Risk' || healthScore?.status === 'Critical') && <AlertOctagon size={14} className="text-red-400" />}
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-5xl font-black text-white">{healthScore?.score || 100}</span>
                  <span className="text-sm font-medium text-white/40 mb-1">/ 100</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">Status: <span className="font-bold text-white">{healthScore?.status || 'Healthy'}</span>.</p>
             </div>

             {/* Inventory Risk */}
             <div className="bg-[#0A0A0A] rounded-2xl border border-white/10 p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-400 flex items-center gap-2 uppercase tracking-widest">
                    <PackageX size={14} className="text-amber-400" /> Inventory Risk
                  </h3>
                  <div className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/10 text-amber-500 border border-amber-500/20">
                     {inventoryAlerts.length} ALERTS
                  </div>
                </div>
                <div className="space-y-2 mt-2">
                  {inventoryAlerts.length > 0 ? inventoryAlerts.slice(0, 2).map((a, i) => (
                    <div key={i} className="flex justify-between items-center text-sm">
                      <span className="text-white font-medium">{a.name}</span>
                      <span className={a.isCritical ? 'text-red-400 font-mono' : 'text-amber-400 font-mono'}>{a.stock} left</span>
                    </div>
                  )) : (
                    <div className="text-3xl font-black text-green-400">Stable</div>
                  )}
                </div>
             </div>

             {/* Customer Graph Summary */}
             <div className="bg-[#0A0A0A] rounded-2xl border border-white/10 p-5 flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute right-0 bottom-0 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Users size={80} className="-mr-4 -mb-4"/>
                </div>
                <div className="flex items-center justify-between mb-4 relative z-10">
                  <h3 className="text-sm font-bold text-gray-400 flex items-center gap-2 uppercase tracking-widest">
                    <Heart size={14} className="text-pink-400" /> Retention
                  </h3>
                </div>
                <div className="relative z-10">
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-black text-white">{segments?.repeatCustomers || 0}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Repeat customers driving 64% of revenue.</p>
                </div>
             </div>

           </div>

           {/* Centerpiece: Demand Prediction Chart */}
           <div className="bg-[#0A0A0A] rounded-2xl border border-white/10 p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                 <div>
                   <h2 className="text-lg font-bold text-white mb-1">Today&apos;s order trend</h2>
                   <p className="text-sm text-gray-500">How today compares to your usual pattern (last 14 days).</p>
                 </div>
                 <div className="flex items-center gap-4 text-xs font-bold">
                    <div className="flex items-center gap-2">
                       <div className="w-3 h-3 rounded-full bg-[#A855F7]" />
                       <span className="text-white">Actual Sales</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <div className="w-3 h-0.5 border-t-2 border-dashed border-white/30" />
                       <span className="text-gray-400">AI Predicted</span>
                    </div>
                 </div>
              </div>
              <div className="h-48 mt-4 relative w-full overflow-hidden">
                <React.Suspense fallback={<div className="w-full h-full bg-white/5 animate-pulse rounded-lg" />}>
                  <SparklineChart />
                </React.Suspense>
              </div>
           </div>

           {/* Bottom Row */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Activity Timeline */}
              <div className="bg-[#0A0A0A] rounded-2xl border border-white/10 p-6">
                 <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">Recent activity</h3>
                 <div className="space-y-5">
                   {timeline.map((item, i) => (
                     <div key={i} className="flex gap-4 relative">
                        {i !== timeline.length - 1 && (
                          <div className="absolute left-3.5 top-8 w-px h-full bg-white/5" />
                        )}
                        <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 shrink-0 z-10">
                          {item.icon}
                        </div>
                        <div className="pt-1">
                          <p className="text-sm text-white font-medium mb-0.5">{item.event}</p>
                          <p className="text-[10px] text-gray-500 font-mono">{item.time}</p>
                        </div>
                     </div>
                   ))}
                 </div>
              </div>

              {/* Storefront Console */}
              <div className="bg-gradient-to-br from-red-600/10 to-orange-500/5 border border-red-500/20 rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-red-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Store size={14} /> Your storefront
                  </h3>
                  <p className="text-sm text-white/70 mb-4">Share this link so customers order directly — zero commission.</p>
                  <div className="bg-black/50 border border-white/10 rounded-lg px-3 py-3 font-mono text-xs text-white/80 select-all mb-4 break-all">
                    {storeUrl || 'Store link initializing...'}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={copyToClipboard} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium transition-colors">
                    <Copy size={14} /> Copy
                  </button>
                  <button onClick={shareToWhatsAppDirect} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 rounded-xl text-sm font-medium transition-colors">
                    <MessageCircle size={14} /> WhatsApp
                  </button>
                </div>
              </div>

           </div>
        </div>

        {/* Right Rail */}
        <div className="xl:col-span-1 space-y-6">
           
           {/* Operational Recommendations */}
           <div className="bg-[#0A0A0A] rounded-2xl border border-white/10 p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <BrainCircuit size={14} className="text-[#A855F7]" /> {aiInsightLabels.sectionTitle}
                </h3>
                <p className="text-xs text-gray-500 mt-1">{aiInsightLabels.sectionHelper}</p>
              </div>
              {aiRecommendations.length > 0 ? (
                aiRecommendations.map((rec, i) => {
                  if (dismissedInsights.has(i)) return null;
                  const tone = rec.type === 'Risk' ? 'risk' : rec.type === 'Recovery' ? 'recovery' : 'opportunity';
                  return (
                    <AIInsightCard
                      key={`${rec.actionTitle}-${i}`}
                      title={rec.actionTitle}
                      insight={rec.message}
                      why={rec.category === 'Customer' ? 'Repeat and inactive customers affect weekly revenue.' : rec.category === 'Inventory' ? 'Stock-outs during peak hours lose orders.' : 'Based on your recent orders and store settings.'}
                      expectedOutcome={rec.potentialRecovery > 0 ? `Could recover about ₹${rec.potentialRecovery.toLocaleString('en-IN')} if acted on.` : 'Improves operations and customer experience.'}
                      actionLabel={rec.actionTitle}
                      tone={tone}
                      potentialValue={rec.confidenceScore ? `${rec.confidenceScore}% confidence` : undefined}
                      onAction={() => {
                        if (rec.actionPayload?.campaignType) navigate('/owner/marketing');
                        else if (rec.category === 'Inventory') navigate('/owner/recipes');
                        else if (rec.category === 'Delivery') navigate('/owner/settings?tab=location');
                        else navigate('/owner/marketing');
                      }}
                      onDismiss={() => setDismissedInsights((prev) => new Set(prev).add(i))}
                      onSnooze={() => setDismissedInsights((prev) => new Set(prev).add(i))}
                    />
                  );
                })
              ) : (
                recommendations.slice(0, 2).map((rec, i) => (
                  <div key={i} className={`p-3 rounded-xl border ${rec.color}`}>
                    <p className="text-xs font-medium text-white/90 leading-relaxed">{rec.label}</p>
                  </div>
                ))
              )}
           </div>

           {/* VIP Activity */}
           <div className="bg-[#0A0A0A] rounded-2xl border border-white/10 p-5">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Award size={14} className="text-yellow-400"/> VIP Customers
              </h3>
              <div className="space-y-4">
                {repeatCustomers.length > 0 ? repeatCustomers.map((customer, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 flex items-center justify-center font-bold text-xs">
                      #{idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{customer.name || 'Guest User'}</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest">{customer.totalOrders} Orders</p>
                    </div>
                  </div>
                )) : (
                  <p className="text-xs text-gray-500">No VIP data available yet.</p>
                )}
                <button onClick={() => navigate('/owner/marketing')} className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold text-white transition-colors mt-2">
                  View Customer Graph
                </button>
              </div>
           </div>

        </div>

      </div>
      <ReleaseNotesModal
        isOpen={isReleaseModalOpen}
        onClose={() => {
          setIsReleaseModalOpen(false);
          if (latestRelease && tenantId && tenantInfo) {
            setTenantInfo({ ...tenantInfo, lastViewedReleaseVersion: latestRelease.version });
            void updateDoc(doc(getDb(), 'tenants', tenantId), {
              lastViewedReleaseVersion: latestRelease.version,
            });
          }
        }}
        release={latestRelease}
        tenantId={tenantId}
      />
    </div>
  );
};

export default OwnerDashboard;
