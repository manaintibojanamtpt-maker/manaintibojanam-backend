import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { getDb } from '../lib/firebase-db';
import { 
  Activity, 
  AlertTriangle, 
  ArrowLeft,
  CheckCircle, 
  RefreshCcw, 
  FileWarning, 
  Mail, 
  MessageSquare, 
  Bell, 
  Clock, 
  Copy,
  Info,
  ArrowUpRight,
  X,
  CreditCard,
  ShieldAlert,
  ServerCrash,
  Filter
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  Legend
} from 'recharts';
import toast from 'react-hot-toast';

// ============================================================================
// TYPES & MOCK DATA
// ============================================================================

interface SystemIncident {
  id: string;
  type: 'PAYMENT_ORPHANED' | 'NOTIFICATION_FAILED' | 'WEBHOOK_TIMEOUT' | 'UNKNOWN';
  status: 'DETECTED' | 'RUNNING' | 'VERIFIED' | 'RESOLVED' | 'ESCALATED';
  correlationId: string;
  relatedEntity: string;
  createdAt: string;
  updatedAt: string;
  payload: any;
}

interface ReconciliationEntry {
  id: string;
  orderId: string;
  draftId: string;
  source: 'CLIENT_CALLBACK' | 'WEBHOOK_RECOVERY';
  confirmedAt: string;
  razorpayOrderId: string;
  status: 'PROMOTED' | 'FAILED';
}

interface PendingDraft {
  id: string;
  orderId: string;
  amount: number;
  createdAt: string;
  status: 'PENDING_PAYMENT' | 'PAYMENT_CAPTURED' | 'ABANDONED';
}

interface OutboxItem {
  id: string;
  channel: 'EMAIL' | 'WHATSAPP' | 'FCM';
  recipient: string;
  status: 'RETRY_PENDING' | 'PROCESSING' | 'DELIVERED' | 'DEAD_LETTER';
  failureType: 'RETRYABLE' | 'NON_RETRYABLE';
  attempts: number;
  maxAttempts: number;
  nextRetryAt?: string;
  lastError: string;
  correlationId: string;
  relatedEntity: string;
}

const useMockSystemHealth = () => {
  return {
    summary: {
      openIncidents: 2,
      reconciliationsToday: 48,
      pendingDrafts: 2,
      retryingNotifications: 3,
      deadLetterNotifications: 1,
      deliverySuccessRate: 99.2
    },
    incidents: [
      { id: 'inc_1', type: 'PAYMENT_ORPHANED', status: 'RESOLVED', correlationId: 'req-a1b2', relatedEntity: 'user_x99', createdAt: '2026-06-12T10:15:00Z', updatedAt: '2026-06-12T10:16:30Z', payload: { amount: 500, draftId: 'draft_112' } },
      { id: 'inc_2', type: 'NOTIFICATION_FAILED', status: 'DETECTED', correlationId: 'req-b3c4', relatedEntity: 'order_555', createdAt: '2026-06-12T11:30:00Z', updatedAt: '2026-06-12T11:30:00Z', payload: { channel: 'WHATSAPP', error: 'Rate limit exceeded' } },
      { id: 'inc_3', type: 'WEBHOOK_TIMEOUT', status: 'ESCALATED', correlationId: 'req-d5e6', relatedEntity: 'draft_888', createdAt: '2026-06-11T14:20:00Z', updatedAt: '2026-06-11T15:00:00Z', payload: { gateway: 'razorpay' } }
    ] as SystemIncident[],
    reconciliations: [
      { id: 'rec_1', orderId: 'ord_1001', draftId: 'draft_1001', source: 'CLIENT_CALLBACK', confirmedAt: '2026-06-12T09:00:00Z', razorpayOrderId: 'order_abc123', status: 'PROMOTED' },
      { id: 'rec_2', orderId: 'ord_1002', draftId: 'draft_1002', source: 'WEBHOOK_RECOVERY', confirmedAt: '2026-06-12T09:45:00Z', razorpayOrderId: 'order_def456', status: 'PROMOTED' },
      { id: 'rec_3', orderId: 'ord_1003', draftId: 'draft_1003', source: 'CLIENT_CALLBACK', confirmedAt: '2026-06-12T10:20:00Z', razorpayOrderId: 'order_ghi789', status: 'PROMOTED' },
      { id: 'rec_4', orderId: 'ord_1004', draftId: 'draft_1004', source: 'WEBHOOK_RECOVERY', confirmedAt: '2026-06-12T11:05:00Z', razorpayOrderId: 'order_jkl012', status: 'PROMOTED' }
    ] as ReconciliationEntry[],
    pendingDraftsList: [
      { id: 'draft_2001', orderId: 'ord_2001', amount: 350, createdAt: '2026-06-12T12:00:00Z', status: 'PENDING_PAYMENT' },
      { id: 'draft_2002', orderId: 'ord_2002', amount: 800, createdAt: '2026-06-12T12:15:00Z', status: 'PAYMENT_CAPTURED' }
    ] as PendingDraft[],
    outbox: {
      retrying: [
        { id: 'out_1', channel: 'WHATSAPP', recipient: '+919876543210', status: 'RETRY_PENDING', failureType: 'RETRYABLE', attempts: 2, maxAttempts: 5, nextRetryAt: '2026-06-12T12:20:00Z', lastError: '429 Too Many Requests', correlationId: 'req-x1', relatedEntity: 'ord_1001' },
        { id: 'out_2', channel: 'EMAIL', recipient: 'customer@example.com', status: 'RETRY_PENDING', failureType: 'RETRYABLE', attempts: 1, maxAttempts: 5, nextRetryAt: '2026-06-12T12:05:00Z', lastError: 'ETIMEDOUT', correlationId: 'req-y2', relatedEntity: 'ord_1002' },
        { id: 'out_3', channel: 'FCM', recipient: 'user_abc', status: 'PROCESSING', failureType: 'RETRYABLE', attempts: 3, maxAttempts: 5, lastError: 'messaging/internal-error', correlationId: 'req-z3', relatedEntity: 'ord_1003' }
      ] as OutboxItem[],
      deadLetter: [
        { id: 'out_4', channel: 'FCM', recipient: 'user_xyz', status: 'DEAD_LETTER', failureType: 'NON_RETRYABLE', attempts: 1, maxAttempts: 5, lastError: 'messaging/invalid-registration-token', correlationId: 'req-w4', relatedEntity: 'ord_999' },
      ] as OutboxItem[]
    },
    charts: {
      reconciliationTrend: [
        { time: '08:00', client: 10, webhook: 0 },
        { time: '09:00', client: 15, webhook: 2 },
        { time: '10:00', client: 8, webhook: 1 },
        { time: '11:00', client: 22, webhook: 4 },
        { time: '12:00', client: 12, webhook: 0 }
      ],
      outboxDistribution: [
        { time: '08:00', pending: 2, processing: 0, dead: 0 },
        { time: '09:00', pending: 5, processing: 1, dead: 0 },
        { time: '10:00', pending: 1, processing: 0, dead: 1 },
        { time: '11:00', pending: 8, processing: 2, dead: 1 },
        { time: '12:00', pending: 3, processing: 1, dead: 1 }
      ]
    }
  };
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
  toast.success('Copied to clipboard', { style: { background: '#333', color: '#fff' }});
};

const formatDate = (isoString: string) => {
  return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const StatusBadge = ({ status }: { status: string }) => {
  let color = "bg-gray-100 text-gray-800 border-gray-200 dark:bg-white/5 dark:text-gray-300 dark:border-white/10";
  
  if (['RESOLVED', 'VERIFIED', 'DELIVERED', 'PROMOTED', 'PAYMENT_CAPTURED'].includes(status)) color = "bg-green-100 text-green-800 border-green-200 dark:bg-green-500/20 dark:text-green-300 dark:border-green-500/30";
  if (['DETECTED', 'RETRY_PENDING', 'PROCESSING', 'RUNNING', 'PENDING_PAYMENT'].includes(status)) color = "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30";
  if (['ESCALATED', 'DEAD_LETTER', 'FAILED', 'NON_RETRYABLE', 'ABANDONED'].includes(status)) color = "bg-red-100 text-red-800 border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30";
  if (['CLIENT_CALLBACK', 'WEBHOOK_RECOVERY'].includes(status)) color = "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30";

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${color}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
};

const MetricCard = ({ title, value, subtitle, icon: Icon, trend, colorClass = "text-gray-900 dark:text-white", isActive, onClick }: any) => (
  <motion.div 
    whileHover={{ y: -2, scale: 1.01 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={`bg-white dark:bg-[#111111] p-5 rounded-xl border shadow-sm flex flex-col justify-between cursor-pointer transition-all duration-200 ${
      isActive 
        ? 'border-indigo-500 dark:border-indigo-400 ring-1 ring-indigo-500 dark:ring-indigo-400 bg-indigo-50/20 dark:bg-indigo-900/20' 
        : 'border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/20 hover:shadow-md'
    }`}
  >
    <div className="flex justify-between items-start mb-4">
      <div className={`p-2 rounded-lg bg-gray-50 dark:bg-white/5 ${colorClass}`}>
        <Icon className="w-5 h-5" />
      </div>
      {trend && (
        <span className={`text-xs font-medium ${trend > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    <div>
      <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">{title}</h3>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-2xl font-bold text-gray-900 dark:text-white">{value}</span>
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtitle}</p>
    </div>
  </motion.div>
);

const ChannelIcon = ({ channel }: { channel: string }) => {
  switch (channel) {
    case 'EMAIL': return <Mail className="w-4 h-4 text-gray-500 dark:text-gray-400" />;
    case 'WHATSAPP': return <MessageSquare className="w-4 h-4 text-green-600 dark:text-green-400" />;
    case 'FCM': return <Bell className="w-4 h-4 text-amber-500 dark:text-amber-400" />;
    default: return <Activity className="w-4 h-4 text-gray-500 dark:text-gray-400" />;
  }
};

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function SystemHealth() {
  const navigate = useNavigate();
  const data = useMockSystemHealth();
  const [incidents, setIncidents] = useState<SystemIncident[]>(data.incidents);
  const [selectedIncident, setSelectedIncident] = useState<SystemIncident | null>(null);
  
  // KPI Filtering State
  const [activeKpi, setActiveKpi] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    async function fetchIncidents() {
      try {
        const q = query(collection(getDb(), 'system_incidents'), orderBy('timestamp', 'desc'), limit(50));
        const snapshot = await getDocs(q);
        const fetched = snapshot.docs.map(doc => {
          const d = doc.data();
          return {
            id: doc.id,
            type: 'UNKNOWN',
            status: d.resolved ? 'RESOLVED' : 'DETECTED',
            correlationId: doc.id,
            relatedEntity: d.tenantId || 'Tenant 0',
            createdAt: d.timestamp?.toDate ? d.timestamp.toDate().toISOString() : new Date().toISOString(),
            updatedAt: d.timestamp?.toDate ? d.timestamp.toDate().toISOString() : new Date().toISOString(),
            payload: { message: d.message, context: d.contextSummary, route: d.route }
          } as SystemIncident;
        });
        if (fetched.length > 0) {
          setIncidents(fetched);
        }
      } catch (err) {
        console.error("Failed to fetch incidents", err);
      }
    }
    fetchIncidents();
  }, []);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const filteredIncidents = incidents.filter(i => {
    if (activeKpi === 'OPEN_INCIDENTS') {
      return ['DETECTED', 'RUNNING', 'ESCALATED'].includes(i.status);
    }
    return true;
  });

  const handleKpiClick = (kpiId: string, sectionId: string) => {
    if (activeKpi === kpiId) {
      setActiveKpi(null);
      return;
    }
    setActiveKpi(kpiId);
    
    if (window.innerWidth >= 1024) {
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          const y = element.getBoundingClientRect().top + window.scrollY - 100;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }, 100);
    }
  };

  const clearFilters = () => setActiveKpi(null);

  const renderMobileDrawerContent = () => {
    switch (activeKpi) {
      case 'OPEN_INCIDENTS':
        return (
          <div className="space-y-4">
            {filteredIncidents.length === 0 ? <p className="text-gray-500 dark:text-gray-400 text-sm">No open incidents.</p> : null}
            {filteredIncidents.map(inc => (
              <div key={inc.id} onClick={() => setSelectedIncident(inc)} className="p-4 bg-gray-50 dark:bg-[#111111] rounded-lg border border-gray-200 dark:border-white/5 flex justify-between items-center cursor-pointer">
                <div>
                  <div className="font-medium text-sm dark:text-white">{inc.type.replace(/_/g, ' ')}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatDate(inc.updatedAt)}</div>
                </div>
                <StatusBadge status={inc.status} />
              </div>
            ))}
          </div>
        );
      case 'RECONCILED_TODAY':
        return (
          <div className="space-y-4">
            {data.reconciliations.map(rec => (
              <div key={rec.id} className="p-4 bg-gray-50 dark:bg-[#111111] rounded-lg border border-gray-200 dark:border-white/5 flex justify-between items-center">
                <div>
                  <div className="font-medium text-sm dark:text-white">{rec.orderId}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{rec.source.replace(/_/g, ' ')}</div>
                </div>
                <StatusBadge status={rec.status} />
              </div>
            ))}
          </div>
        );
      case 'PENDING_DRAFTS':
        return (
          <div className="space-y-4">
             {data.pendingDraftsList.map(draft => (
              <div key={draft.id} className="p-4 bg-gray-50 dark:bg-[#111111] rounded-lg border border-gray-200 dark:border-white/5 flex justify-between items-center">
                <div>
                  <div className="font-medium text-sm dark:text-white">{draft.orderId}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">₹{draft.amount}</div>
                </div>
                <StatusBadge status={draft.status} />
              </div>
            ))}
          </div>
        );
      case 'NOTIFICATION_RETRIES':
        return (
          <div className="space-y-4">
            {data.outbox.retrying.map(item => (
               <div key={item.id} className="p-4 bg-gray-50 dark:bg-[#111111] rounded-lg border border-gray-200 dark:border-white/5">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <ChannelIcon channel={item.channel} />
                      <span className="font-medium text-sm dark:text-white">{item.recipient}</span>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="text-xs text-red-500 dark:text-red-400 truncate">{item.lastError}</p>
               </div>
            ))}
          </div>
        );
      case 'DEAD_LETTER':
        return (
          <div className="space-y-4">
            {data.outbox.deadLetter.map(item => (
               <div key={item.id} className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-900/50">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <ChannelIcon channel={item.channel} />
                      <span className="font-medium text-sm dark:text-white">{item.recipient}</span>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="text-xs text-red-600 dark:text-red-400 truncate">{item.lastError}</p>
               </div>
            ))}
          </div>
        );
      case 'DELIVERY_RATE':
        return (
          <div className="p-4 bg-gray-50 dark:bg-[#111111] rounded-lg border border-gray-200 dark:border-white/5">
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Focusing on chart delivery metrics is best viewed on desktop.</p>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{data.summary.deliverySuccessRate}%</div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Success rate over 24h</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg text-gray-900 dark:text-white pb-20 transition-colors">
      
      {/* 1. TOP HEADER */}
      <header className="bg-white dark:bg-dark-bg border-b border-gray-200 dark:border-white/5 sticky top-0 z-20 shadow-sm pt-[max(env(safe-area-inset-top),1rem)] sm:pt-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2 sm:mt-0">
          <div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate(-1)}
                className="p-2 -ml-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <ShieldAlert className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-none">System Health</h1>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 pl-[44px]">
              Operational control surface for incidents, payment recovery, and notification resilience.
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-white/5 px-3 py-1.5 rounded-full border border-gray-200 dark:border-white/10">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            System Operational
            <span className="mx-2 text-gray-300 dark:text-gray-600">|</span>
            <Clock className="w-4 h-4" />
            Last updated: Just now
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* ACTIVE FILTER BAR */}
        <AnimatePresence>
          {activeKpi && !isMobile && (
            <motion.div 
              initial={{ height: 0, opacity: 0, marginBottom: 0 }} 
              animate={{ height: 'auto', opacity: 1, marginBottom: 24 }} 
              exit={{ height: 0, opacity: 0, marginBottom: 0 }} 
              className="overflow-hidden"
            >
              <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-lg p-3 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-2 text-indigo-800 dark:text-indigo-300 text-sm font-medium">
                  <Filter className="w-4 h-4" />
                  Filtering by: {activeKpi.replace(/_/g, ' ')}
                </div>
                <button 
                  onClick={clearFilters} 
                  className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-sm font-medium flex items-center gap-1 bg-white dark:bg-[#111111] px-2 py-1 rounded shadow-sm border border-indigo-100 dark:border-indigo-800 transition-colors"
                >
                  <X className="w-4 h-4" /> Clear Filter
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 2. SUMMARY KPI ROW */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <MetricCard 
            title="Open Incidents" value={incidents.filter(i => !['RESOLVED', 'VERIFIED'].includes(i.status)).length} subtitle="Requires attention" 
            icon={AlertTriangle} colorClass={incidents.filter(i => !['RESOLVED', 'VERIFIED'].includes(i.status)).length > 0 ? "text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20" : "text-gray-500 dark:text-gray-400"} 
            isActive={activeKpi === 'OPEN_INCIDENTS'}
            onClick={() => handleKpiClick('OPEN_INCIDENTS', 'section-incidents')}
          />
          <MetricCard 
            title="Reconciled Today" value={data.summary.reconciliationsToday} subtitle="Successful payments" 
            icon={CheckCircle} colorClass="text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20" trend={12}
            isActive={activeKpi === 'RECONCILED_TODAY'}
            onClick={() => handleKpiClick('RECONCILED_TODAY', 'section-reconciliation')}
          />
          <MetricCard 
            title="Pending Drafts" value={data.summary.pendingDrafts} subtitle="Awaiting webhook/client" 
            icon={Clock} colorClass="text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20" 
            isActive={activeKpi === 'PENDING_DRAFTS'}
            onClick={() => handleKpiClick('PENDING_DRAFTS', 'section-reconciliation')}
          />
          <MetricCard 
            title="Notification Retries" value={data.summary.retryingNotifications} subtitle="In outbox queue" 
            icon={RefreshCcw} colorClass="text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20" 
            isActive={activeKpi === 'NOTIFICATION_RETRIES'}
            onClick={() => handleKpiClick('NOTIFICATION_RETRIES', 'section-outbox')}
          />
          <MetricCard 
            title="Dead-Letter Items" value={data.summary.deadLetterNotifications} subtitle="Permanent failures" 
            icon={FileWarning} colorClass={data.summary.deadLetterNotifications > 0 ? "text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20" : "text-gray-500 dark:text-gray-400"} 
            isActive={activeKpi === 'DEAD_LETTER'}
            onClick={() => handleKpiClick('DEAD_LETTER', 'section-outbox')}
          />
          <MetricCard 
            title="Delivery Rate" value={`${data.summary.deliverySuccessRate}%`} subtitle="Last 24 hours" 
            icon={Activity} colorClass="text-emerald-500 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20" 
            isActive={activeKpi === 'DELIVERY_RATE'}
            onClick={() => handleKpiClick('DELIVERY_RATE', 'section-outbox')}
          />
        </section>

        {/* 3. MAIN CONTENT GRID */}
        
        {/* A. INCIDENTS */}
        <section id="section-incidents" className={`bg-white dark:bg-[#111111] rounded-xl border shadow-sm overflow-hidden transition-colors duration-300 ${activeKpi === 'OPEN_INCIDENTS' && !isMobile ? 'border-indigo-300 dark:border-indigo-500 ring-2 ring-indigo-100 dark:ring-indigo-900/50' : 'border-gray-200 dark:border-white/5'}`}>
          <div className="px-6 py-4 border-b border-gray-200 dark:border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2 dark:text-white">
                <ServerCrash className="w-5 h-5 text-gray-500 dark:text-gray-400" /> System Incidents
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Anomalies detected across all backend services.</p>
            </div>
            {!isMobile && activeKpi === 'OPEN_INCIDENTS' && (
              <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-xs font-semibold rounded-full border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Filtered to Actionable
              </span>
            )}
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 dark:bg-[#0A0A0A] text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-white/5">
                <tr>
                  <th className="px-6 py-3 font-medium">Type</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Correlation ID</th>
                  <th className="px-6 py-3 font-medium">Related Entity</th>
                  <th className="px-6 py-3 font-medium">Updated At</th>
                  <th className="px-6 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                {filteredIncidents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      No incidents found for this filter.
                    </td>
                  </tr>
                ) : filteredIncidents.map((inc) => (
                  <tr key={inc.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer" onClick={() => setSelectedIncident(inc)}>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{inc.type.replace(/_/g, ' ')}</td>
                    <td className="px-6 py-4"><StatusBadge status={inc.status} /></td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={(e) => { e.stopPropagation(); copyToClipboard(inc.correlationId); }}
                        className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-mono text-xs bg-gray-100 dark:bg-white/5 px-2 py-1 rounded"
                      >
                        {inc.correlationId.slice(0, 8)}... <Copy className="w-3 h-3" />
                      </button>
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{inc.relatedEntity}</td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{formatDate(inc.updatedAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <ArrowUpRight className="w-4 h-4 text-gray-400 dark:text-gray-500 inline" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* B. PAYMENT RECONCILIATION */}
          <section id="section-reconciliation" className={`bg-white dark:bg-[#111111] rounded-xl border shadow-sm overflow-hidden flex flex-col transition-colors duration-300 ${['RECONCILED_TODAY', 'PENDING_DRAFTS'].includes(activeKpi || '') && !isMobile ? 'border-indigo-300 dark:border-indigo-500 ring-2 ring-indigo-100 dark:ring-indigo-900/50' : 'border-gray-200 dark:border-white/5'}`}>
            <div className="px-6 py-4 border-b border-gray-200 dark:border-white/5 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2 dark:text-white">
                  <CreditCard className="w-5 h-5 text-gray-500 dark:text-gray-400" /> Payment Recovery
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Webhook fallback vs Client promotions.</p>
              </div>
            </div>
            
            <div className="p-6 border-b border-gray-200 dark:border-white/5 bg-gray-50/50 dark:bg-black/20">
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.charts.reconciliationTrend} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} />
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', background: '#111', color: '#fff' }}
                      cursor={{ stroke: '#333', strokeWidth: 2 }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px', color: '#9CA3AF' }} />
                    <Line type="monotone" name="Client Callback" dataKey="client" stroke="#10B981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    <Line type="monotone" name="Webhook Recovery" dataKey="webhook" stroke="#6366F1" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="overflow-x-auto flex-1">
              {activeKpi === 'PENDING_DRAFTS' && !isMobile ? (
                <>
                  <div className="px-6 py-2 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-800 text-xs font-semibold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider">
                    Filtered: Pending Drafts
                  </div>
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-gray-50 dark:bg-[#0A0A0A] text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-white/5">
                      <tr>
                        <th className="px-6 py-3 font-medium">Draft ID</th>
                        <th className="px-6 py-3 font-medium">Created</th>
                        <th className="px-6 py-3 font-medium">Amount</th>
                        <th className="px-6 py-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                      {data.pendingDraftsList.map((draft) => (
                        <tr key={draft.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                          <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">{draft.orderId}</td>
                          <td className="px-6 py-3 text-gray-500 dark:text-gray-400">{formatDate(draft.createdAt)}</td>
                          <td className="px-6 py-3 font-mono text-gray-600 dark:text-gray-300">₹{draft.amount}</td>
                          <td className="px-6 py-3"><StatusBadge status={draft.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : (
                <>
                  {activeKpi === 'RECONCILED_TODAY' && !isMobile && (
                    <div className="px-6 py-2 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-800 text-xs font-semibold text-indigo-800 dark:text-indigo-300 uppercase tracking-wider">
                      Filtered: Today's Reconciliations
                    </div>
                  )}
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-gray-50 dark:bg-[#0A0A0A] text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-white/5">
                      <tr>
                        <th className="px-6 py-3 font-medium">Order / Draft</th>
                        <th className="px-6 py-3 font-medium">Source</th>
                        <th className="px-6 py-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                      {data.reconciliations.map((rec) => (
                        <tr key={rec.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                          <td className="px-6 py-3">
                            <div className="font-medium text-gray-900 dark:text-white">{rec.orderId}</div>
                            <div className="text-xs text-gray-400 dark:text-gray-500">{rec.draftId}</div>
                          </td>
                          <td className="px-6 py-3"><StatusBadge status={rec.source} /></td>
                          <td className="px-6 py-3"><StatusBadge status={rec.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </section>

          {/* C. NOTIFICATION OUTBOX */}
          <section id="section-outbox" className={`bg-white dark:bg-[#111111] rounded-xl border shadow-sm overflow-hidden flex flex-col transition-colors duration-300 ${['NOTIFICATION_RETRIES', 'DEAD_LETTER', 'DELIVERY_RATE'].includes(activeKpi || '') && !isMobile ? 'border-indigo-300 dark:border-indigo-500 ring-2 ring-indigo-100 dark:ring-indigo-900/50' : 'border-gray-200 dark:border-white/5'}`}>
            <div className="px-6 py-4 border-b border-gray-200 dark:border-white/5 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2 dark:text-white">
                  <Mail className="w-5 h-5 text-gray-500 dark:text-gray-400" /> Notification Outbox
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Retry queues and dead-letter dropoffs.</p>
              </div>
            </div>

            <div className="p-6 border-b border-gray-200 dark:border-white/5 bg-gray-50/50 dark:bg-black/20">
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.charts.outboxDistribution} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} />
                    <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', background: '#111', color: '#fff' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px', color: '#9CA3AF' }} />
                    <Area type="monotone" name="Retrying" dataKey="pending" stackId="1" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.2} />
                    <Area type="monotone" name="Processing" dataKey="processing" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.2} />
                    <Area type="monotone" name="Dead Letter" dataKey="dead" stackId="1" stroke="#EF4444" fill="#EF4444" fillOpacity={0.2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="overflow-x-auto flex-1">
              {activeKpi === 'DEAD_LETTER' && !isMobile ? null : (
                <>
                  <div className={`px-6 py-2 border-b border-gray-200 dark:border-white/5 text-xs font-semibold uppercase tracking-wider ${activeKpi === 'NOTIFICATION_RETRIES' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-300' : 'bg-gray-50 dark:bg-[#0A0A0A] text-gray-500 dark:text-gray-400'}`}>
                    Active Retries {activeKpi === 'NOTIFICATION_RETRIES' && '(Filtered)'}
                  </div>
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                      {data.outbox.retrying.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2">
                              <ChannelIcon channel={item.channel} />
                              <span className="font-medium text-gray-900 dark:text-white">{item.recipient}</span>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-[200px]" title={item.lastError}>
                              {item.lastError}
                            </div>
                          </td>
                          <td className="px-6 py-3">
                            <div className="text-xs text-gray-500 dark:text-gray-400">Attempt {item.attempts}/{item.maxAttempts}</div>
                            <div className="text-xs font-medium text-amber-600 dark:text-amber-400 mt-0.5">Next: {item.nextRetryAt ? formatDate(item.nextRetryAt) : 'Now'}</div>
                          </td>
                          <td className="px-6 py-3 text-right">
                            <StatusBadge status={item.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              {data.outbox.deadLetter.length > 0 && activeKpi !== 'NOTIFICATION_RETRIES' && (
                <>
                  <div className={`px-6 py-2 border-y text-xs font-semibold uppercase tracking-wider flex justify-between ${activeKpi === 'DEAD_LETTER' ? 'bg-red-100 dark:bg-red-900/40 border-red-200 dark:border-red-800 text-red-900 dark:text-red-300' : 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/50 text-red-800 dark:text-red-400'}`}>
                    <span>Dead Letters {activeKpi === 'DEAD_LETTER' && '(Filtered)'}</span>
                    <span className="bg-red-200 dark:bg-red-800 text-red-900 dark:text-red-200 px-2 py-0.5 rounded-full">{data.outbox.deadLetter.length}</span>
                  </div>
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                      {data.outbox.deadLetter.map((item) => (
                         <tr key={item.id} className="hover:bg-red-50/50 dark:hover:bg-red-900/40">
                         <td className="px-6 py-3">
                           <div className="flex items-center gap-2">
                             <ChannelIcon channel={item.channel} />
                             <span className="font-medium text-gray-900 dark:text-white">{item.recipient}</span>
                           </div>
                           <div className="text-xs text-red-500 dark:text-red-400 mt-0.5 truncate max-w-[200px]" title={item.lastError}>
                             {item.lastError}
                           </div>
                         </td>
                         <td className="px-6 py-3 text-right">
                           <StatusBadge status={item.status} />
                         </td>
                       </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* 4. MOBILE KPI BOTTOM DRAWER */}
      <AnimatePresence>
        {isMobile && activeKpi && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={clearFilters}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.div 
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} 
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-x-0 bottom-0 max-h-[85vh] bg-white dark:bg-dark-bg rounded-t-2xl shadow-2xl z-50 flex flex-col border-t border-gray-200 dark:border-white/5 lg:hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-white/5">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Filter className="w-5 h-5 text-indigo-500 dark:text-indigo-400" /> 
                  {activeKpi.replace(/_/g, ' ')}
                </h3>
                <button onClick={clearFilters} className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 bg-gray-100 dark:bg-white/5 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 bg-white dark:bg-dark-bg">
                {renderMobileDrawerContent()}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 5. INCIDENT DETAIL DRAWER (MODAL) */}
      <AnimatePresence>
        {selectedIncident && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedIncident(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 w-full max-w-md bg-white dark:bg-[#111111] shadow-2xl z-[60] flex flex-col border-l border-gray-200 dark:border-white/5"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-white/5">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Info className="w-5 h-5 text-indigo-500 dark:text-indigo-400" /> Incident Details
                </h3>
                <button onClick={() => setSelectedIncident(null)} className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Overview</h4>
                  <div className="bg-gray-50 dark:bg-[#0A0A0A] rounded-lg p-4 space-y-3 border border-gray-100 dark:border-white/5">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Status</span>
                      <StatusBadge status={selectedIncident.status} />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Type</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{selectedIncident.type.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Created</span>
                      <span className="text-sm text-gray-900 dark:text-white">{new Date(selectedIncident.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Traceability</h4>
                  <div className="bg-gray-50 dark:bg-[#0A0A0A] rounded-lg p-4 space-y-3 border border-gray-100 dark:border-white/5">
                    <div>
                      <span className="text-sm text-gray-500 dark:text-gray-400 block mb-1">Correlation ID</span>
                      <div className="flex items-center justify-between bg-white dark:bg-[#111111] border border-gray-200 dark:border-white/5 px-3 py-2 rounded-md">
                        <span className="text-sm font-mono text-gray-600 dark:text-gray-300 truncate">{selectedIncident.correlationId}</span>
                        <button onClick={() => copyToClipboard(selectedIncident.correlationId)} className="text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400">
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500 dark:text-gray-400 block mb-1">Related Entity</span>
                      <div className="flex items-center justify-between bg-white dark:bg-[#111111] border border-gray-200 dark:border-white/5 px-3 py-2 rounded-md">
                        <span className="text-sm font-mono text-gray-600 dark:text-gray-300 truncate">{selectedIncident.relatedEntity}</span>
                        <button onClick={() => copyToClipboard(selectedIncident.relatedEntity)} className="text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400">
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">JSON Payload</h4>
                  <div className="bg-gray-900 dark:bg-black/50 rounded-lg p-4 overflow-x-auto border border-gray-800 dark:border-white/10">
                    <pre className="text-xs text-green-400 font-mono leading-relaxed">
                      {JSON.stringify(selectedIncident.payload, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-[#0A0A0A]">
                <button 
                  onClick={() => toast('Read-only view. Actions are disabled.', { icon: 'ℹ️' })}
                  className="w-full bg-white dark:bg-[#111111] border border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-300 font-medium py-2 px-4 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors shadow-sm"
                >
                  Acknowledge Incident
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
