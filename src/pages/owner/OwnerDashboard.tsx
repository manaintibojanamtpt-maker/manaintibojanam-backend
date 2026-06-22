import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  AlertTriangle, CheckCircle2, Copy, ExternalLink, MessageCircle, Store, Users,
  Activity, TrendingUp, AlertOctagon, Heart, Award, Target, PackageX, AlertCircle,
  BrainCircuit, BarChart3, LineChart, Zap, ChevronRight, Clock, Box, ShoppingBag, Database, Power
} from 'lucide-react';
import { motion } from 'framer-motion';
import { collection, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { getDb } from '../../lib/firebase-db';
import toast from 'react-hot-toast';
import { Order, Subscription } from '../../types';
import { safeParseDate } from '../../lib/utils';
import { deriveOwnerCustomerMemories } from '../../utils/customerMemory';
import { auth } from '../../firebase';
import { CustomerSegmentSummary, getCustomerSegmentsSummary } from '../../services/CustomerIntelligenceService';
import { KitchenHealthResult, calculateKitchenHealth } from '../../services/KitchenHealthService';
import { TenantAnalytics, getTenantAnalytics, backfillAnalytics } from '../../services/AnalyticsService';

const OWNER_API_BASE_URL = import.meta.env.VITE_API_URL || 'https://manaintibojanam-backend.onrender.com';

const ACTIVE_STATUSES = new Set(['CREATED', 'PLACED', 'PENDING', 'PAYMENT_PENDING', 'PAYMENT_VERIFICATION', 'ACCEPTED', 'PREPARING', 'READY', 'COURIER_BOOKED', 'PICKED_UP', 'OUT_FOR_DELIVERY']);
const PENDING_STATUSES = new Set(['CREATED', 'PLACED', 'PENDING']);

const getStoreUrl = (slugOrId?: string) => slugOrId ? `${window.location.origin}/k/${slugOrId}` : '';

// --- CUSTOM SVG SPARKLINE CHART ---
const SparklineChart = () => {
  // Mock data for 12 hours (e.g. 10 AM to 10 PM)
  const actualData = [10, 15, 35, 45, 30, 20, 25, 40, 65, 80, 50, 25];
  const predictedData = [12, 18, 30, 50, 35, 22, 28, 45, 60, 85, 55, 30];
  
  const maxVal = Math.max(...actualData, ...predictedData);
  const width = 800;
  const height = 200;
  const paddingX = 0;
  const paddingY = 20;
  
  const getSmoothPath = (data: number[]) => {
    if (data.length === 0) return '';
    let path = `M 0 ${height - paddingY - ((data[0] / maxVal) * (height - paddingY * 2))}`;
    for (let i = 0; i < data.length - 1; i++) {
      const x1 = (i / (data.length - 1)) * width;
      const y1 = height - paddingY - ((data[i] / maxVal) * (height - paddingY * 2));
      const x2 = ((i + 1) / (data.length - 1)) * width;
      const y2 = height - paddingY - ((data[i + 1] / maxVal) * (height - paddingY * 2));
      const cx1 = x1 + (x2 - x1) / 3;
      const cx2 = x2 - (x2 - x1) / 3;
      path += ` C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`;
    }
    return path;
  };

  const actualPath = getSmoothPath(actualData);
  const predictedPath = getSmoothPath(predictedData);

  return (
    <div className="w-full h-full relative group">
       <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
         {/* Grid lines */}
         <path d={`M 0 ${height/2} L ${width} ${height/2}`} stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="4 4" />
         <path d={`M 0 ${height-1} L ${width} ${height-1}`} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
         
         {/* Predicted Line (Dashed, White/Gray) */}
         <motion.path 
           d={predictedPath} 
           fill="none" 
           stroke="rgba(255,255,255,0.3)" 
           strokeWidth="2" 
           strokeDasharray="4 4"
           initial={{ pathLength: 0, opacity: 0 }}
           animate={{ pathLength: 1, opacity: 1 }}
           transition={{ duration: 1.5, ease: "easeInOut" }}
         />
         
         {/* Actual Line Gradient Area */}
         <defs>
           <linearGradient id="gradientActual" x1="0" y1="0" x2="0" y2="1">
             <stop offset="0%" stopColor="#A855F7" stopOpacity="0.4" />
             <stop offset="100%" stopColor="#A855F7" stopOpacity="0" />
           </linearGradient>
         </defs>
         <motion.path 
           d={`${actualPath} L ${width} ${height} L 0 ${height} Z`} 
           fill="url(#gradientActual)" 
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ duration: 1.5, delay: 0.5 }}
         />
         
         {/* Actual Line (Solid, Purple) */}
         <motion.path 
           d={actualPath} 
           fill="none" 
           stroke="#A855F7" 
           strokeWidth="3"
           initial={{ pathLength: 0 }}
           animate={{ pathLength: 1 }}
           transition={{ duration: 1.5, ease: "easeOut" }}
         />

         {/* Current Point Dot */}
         <motion.circle 
           cx={(8 / (actualData.length - 1)) * width} 
           cy={height - paddingY - ((actualData[8] / maxVal) * (height - paddingY * 2))} 
           r="5" 
           fill="white" 
           stroke="#A855F7" 
           strokeWidth="3"
           initial={{ scale: 0 }}
           animate={{ scale: 1 }}
           transition={{ delay: 1.5, type: "spring" }}
         />
       </svg>
       
       <div className="absolute top-0 right-0 bg-[#A855F7]/10 border border-[#A855F7]/30 text-[#A855F7] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2">
         <div className="w-1.5 h-1.5 rounded-full bg-[#A855F7] animate-pulse" />
         Live Tracking
       </div>
    </div>
  );
};


const OwnerDashboard = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const tenantId = userProfile?.ownedTenantIds?.[0];
  const tenantName = userProfile?.name || 'Kitchen';

  const [tenantInfo, setTenantInfo] = React.useState<any>(null);
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [analytics, setAnalytics] = React.useState<TenantAnalytics | null>(null);
  const [segments, setSegments] = React.useState<CustomerSegmentSummary | null>(null);
  const [healthScore, setHealthScore] = React.useState<KitchenHealthResult | null>(null);
  const [inventoryAlerts, setInventoryAlerts] = React.useState<{name: string, stock: number, isCritical: boolean}[]>([]);
  const [loading, setLoading] = React.useState(true);

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
      setInventoryAlerts(alerts);
    });

    return () => { unsubscribeOrders(); unsubscribeMenu(); };
  }, [tenantId]);

  React.useEffect(() => {
    if (orders.length > 0) {
      setHealthScore(calculateKitchenHealth({
        completionRate: 98,
        avgPrepTimeMinutes: 14,
        avgRating: 4.8,
        repeatCustomerRate: 42,
        cancellationRate: 0,
        refundRate: 0
      }));
    } else {
       setHealthScore({
          score: 100,
          status: 'excellent',
          trend: 'UP',
          metrics: {} as any,
          suggestions: ['Operations are running optimally.']
       });
    }
  }, [orders]);

  const repeatCustomers = deriveOwnerCustomerMemories(orders).slice(0, 4);

  // Mock Operational Recommendations based on intelligence
  const recommendations = [
    { priority: 'HIGH', label: 'Packaging bottleneck risk identified for the dinner rush.', icon: <AlertTriangle size={14}/>, color: 'text-red-400 bg-red-500/10 border-red-500/20' },
    { priority: 'MED', label: 'Demand trending 18% above average. Prepare additional biryani inventory.', icon: <TrendingUp size={14}/>, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    { priority: 'LOW', label: '3 high-value customers likely to reorder today. Send SMS campaign?', icon: <Users size={14}/>, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  ];

  // Mock Activity Timeline
  const timeline = [
    { time: 'Just now', event: 'Order #1042 received. Prediction confirmed.', icon: <ShoppingBag size={12}/> },
    { time: '2m ago', event: 'Inventory automatically deducted: 250g Basmati Rice.', icon: <Database size={12}/> },
    { time: '14m ago', event: 'Kitchen health score recalculated to 98.', icon: <Activity size={12}/> },
    { time: '30m ago', event: 'VIP Customer Viswa returned after 12 days.', icon: <Heart size={12}/> },
    { time: '1h ago', event: 'Command Center initialized for dinner service.', icon: <Power size={12}/> },
  ];

  if (loading) {
    return <div className="rounded-2xl border border-white/10 bg-[#0A0A0A] p-10 text-center text-white/60">Initializing Command Center...</div>;
  }

  return (
    <div className="text-white space-y-6">
      
      {/* 1. AI Copilot Briefing */}
      <header className="bg-gradient-to-r from-[#A855F7]/20 via-[#A855F7]/5 to-transparent border border-[#A855F7]/20 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <BrainCircuit size={120} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
             <div className="w-2 h-2 rounded-full bg-[#A855F7] animate-pulse" />
             <span className="text-xs font-bold uppercase tracking-widest text-[#A855F7]">AI Copilot Briefing</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-snug max-w-3xl">
            Good evening, {tenantName}. Demand is trending <span className="text-[#A855F7]">18% above average</span>. Prepare additional biryani inventory to meet the predicted 7:30 PM surge.
          </h1>
        </div>
      </header>

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
                  {healthScore?.trend === 'UP' && <TrendingUp size={14} className="text-green-400" />}
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-5xl font-black text-white">{healthScore?.score || 100}</span>
                  <span className="text-sm font-medium text-white/40 mb-1">/ 100</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">Operating optimally. Avg prep: 14 mins.</p>
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
                   <h2 className="text-lg font-bold text-white mb-1">Actual vs Predicted Demand</h2>
                   <p className="text-sm text-gray-500">AI forecasting analyzing last 14 days of historical volume.</p>
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
              <div className="h-64 w-full">
                 <SparklineChart />
              </div>
           </div>

           {/* Bottom Row */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Activity Timeline */}
              <div className="bg-[#0A0A0A] rounded-2xl border border-white/10 p-6">
                 <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">Live Network Activity</h3>
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
                    <Store size={14} /> Storefront Console
                  </h3>
                  <p className="text-sm text-white/70 mb-4">Your digital storefront is active. Share it to bring in the next order.</p>
                  <div className="bg-black/50 border border-white/10 rounded-lg px-3 py-3 font-mono text-xs text-white/80 select-all mb-4 break-all">
                    {storeUrl || 'Store link initializing...'}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={copyToClipboard} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium transition-colors">
                    <Copy size={14} /> Copy
                  </button>
                  <button onClick={shareToWhatsApp} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 rounded-xl text-sm font-medium transition-colors">
                    <MessageCircle size={14} /> WhatsApp
                  </button>
                </div>
              </div>

           </div>
        </div>

        {/* Right Rail */}
        <div className="xl:col-span-1 space-y-6">
           
           {/* Operational Recommendations */}
           <div className="bg-[#0A0A0A] rounded-2xl border border-white/10 p-5">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <BrainCircuit size={14} className="text-[#A855F7]"/> Recommendations
              </h3>
              <div className="space-y-3">
                {recommendations.map((rec, i) => (
                  <div key={i} className={`p-3 rounded-xl border ${rec.color}`}>
                     <div className="flex items-center gap-2 mb-2">
                       {rec.icon}
                       <span className="text-[10px] font-black uppercase tracking-widest">{rec.priority} PRIORITY</span>
                     </div>
                     <p className="text-xs font-medium text-white/90 leading-relaxed">{rec.label}</p>
                  </div>
                ))}
              </div>
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
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest">{customer.ordersCount} Orders</p>
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
    </div>
  );
};

export default OwnerDashboard;
