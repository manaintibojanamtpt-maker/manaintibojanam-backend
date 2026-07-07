import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { m, AnimatePresence } from 'framer-motion';
import {
  loadOpsDashboardSnapshot,
  OPS_UNAVAILABLE,
  type OpsIncidentRecord,
} from '../lib/opsHealthApi';
import { 
  Activity, 
  AlertTriangle, 
  ArrowLeft,
  CheckCircle, 
  RefreshCcw, 
  FileWarning, 
  Mail, 
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
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  Legend
} from 'recharts';
import toast from 'react-hot-toast';

// ============================================================================
// TYPES
// ============================================================================

interface SystemIncident {
  id: string;
  type: string;
  status: 'DETECTED' | 'RUNNING' | 'VERIFIED' | 'RESOLVED' | 'ESCALATED';
  correlationId: string;
  relatedEntity: string;
  createdAt: string;
  updatedAt: string;
  payload: Record<string, unknown>;
}

function mapOpsIncident(incident: OpsIncidentRecord): SystemIncident {
  return {
    id: incident.incidentId,
    type: incident.type,
    status: incident.status as SystemIncident['status'],
    correlationId: incident.correlationId,
    relatedEntity: incident.tenantId || incident.route || '—',
    createdAt: incident.createdAt,
    updatedAt: incident.updatedAt,
    payload: incident.payload,
  };
}

function formatUnavailableMetric(value: number | null | undefined): string | number {
  return value == null ? OPS_UNAVAILABLE : value;
}

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
  <m.div 
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
  </m.div>
);


// ============================================================================
// HELPER COMPONENTS
// ============================================================================

export default function SystemHealth() {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<SystemIncident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<SystemIncident | null>(null);
  const [openIncidentsCount, setOpenIncidentsCount] = useState<number | null>(null);
  const [incidentTrend, setIncidentTrend] = useState<Array<{ time: string; count: number }>>([]);
  const [systemStatus, setSystemStatus] = useState<'operational' | 'degraded' | 'unavailable'>('unavailable');
  const [latestDeploy, setLatestDeploy] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(true);
  
  // KPI Filtering State
  const [activeKpi, setActiveKpi] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const refreshDashboard = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const snapshot = await loadOpsDashboardSnapshot();
      setLastUpdated(snapshot.fetchedAt);

      if (snapshot.incidents) {
        setIncidents(snapshot.incidents.map(mapOpsIncident));
      }

      const summary = snapshot.healthSummary;
      if (summary?.openIncidentsCount != null) {
        setOpenIncidentsCount(summary.openIncidentsCount);
      } else if (snapshot.incidents) {
        setOpenIncidentsCount(
          snapshot.incidents.filter((i) => i.status !== 'RESOLVED' && i.status !== 'VERIFIED').length,
        );
      } else {
        setOpenIncidentsCount(null);
      }

      if (summary?.incidentTrend?.length) {
        setIncidentTrend(
          summary.incidentTrend.map((point) => ({
            time: new Date(point.hour).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            count: point.count,
          })),
        );
      } else {
        setIncidentTrend([]);
      }

      const deploy = summary?.latestDeploy || snapshot.apiHealth?.platform?.build || null;
      setLatestDeploy(deploy);

      const healthStatus = summary?.apiHealth?.status || snapshot.apiHealth?.status;
      const firestoreBackedOff = snapshot.apiHealth?.firestore?.backedOff;
      if (healthStatus === 'ok' && !firestoreBackedOff) {
        setSystemStatus('operational');
      } else if (healthStatus === 'ok' || healthStatus === 'degraded') {
        setSystemStatus('degraded');
      } else {
        setSystemStatus('unavailable');
      }
    } catch (err) {
      console.error('Failed to load ops dashboard', err);
      setSystemStatus('unavailable');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refreshDashboard();
  }, [refreshDashboard]);

  const handleAcknowledgeIncident = async () => {
    toast.error('Incident resolution is managed via the ops incident pipeline');
  };

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

  const resolvedOpenCount: number | null =
    openIncidentsCount ??
    (incidents.length
      ? incidents.filter((i) => !['RESOLVED', 'VERIFIED'].includes(i.status)).length
      : null);

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
      case 'PENDING_DRAFTS':
      case 'NOTIFICATION_RETRIES':
      case 'DEAD_LETTER':
      case 'DELIVERY_RATE':
        return (
          <div className="p-4 bg-gray-50 dark:bg-[#111111] rounded-lg border border-gray-200 dark:border-white/5">
            <p className="text-sm text-gray-600 dark:text-gray-300">{OPS_UNAVAILABLE} — production API not yet wired for this metric.</p>
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
              {systemStatus === 'operational' && (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </>
              )}
              {systemStatus === 'degraded' && (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              )}
              {systemStatus === 'unavailable' && (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-gray-400"></span>
              )}
            </span>
            {systemStatus === 'operational' && 'System Operational'}
            {systemStatus === 'degraded' && 'System Degraded'}
            {systemStatus === 'unavailable' && OPS_UNAVAILABLE}
            {latestDeploy && (
              <>
                <span className="mx-2 text-gray-300 dark:text-gray-600">|</span>
                <span>Build {latestDeploy}</span>
              </>
            )}
            <span className="mx-2 text-gray-300 dark:text-gray-600">|</span>
            <Clock className="w-4 h-4" />
            {isRefreshing ? 'Refreshing…' : lastUpdated ? `Updated ${formatDate(lastUpdated)}` : 'Not loaded'}
            <button
              onClick={refreshDashboard}
              disabled={isRefreshing}
              className="ml-1 p-1 rounded hover:bg-gray-200 dark:hover:bg-white/10 disabled:opacity-50"
              aria-label="Refresh dashboard"
            >
              <RefreshCcw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* ACTIVE FILTER BAR */}
        <AnimatePresence>
          {activeKpi && !isMobile && (
            <m.div 
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
            </m.div>
          )}
        </AnimatePresence>

        {/* 2. SUMMARY KPI ROW */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <MetricCard 
            title="Open Incidents" value={formatUnavailableMetric(resolvedOpenCount)} subtitle="Requires attention" 
            icon={AlertTriangle} colorClass={(resolvedOpenCount ?? 0) > 0 ? "text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20" : "text-gray-500 dark:text-gray-400"} 
            isActive={activeKpi === 'OPEN_INCIDENTS'}
            onClick={() => handleKpiClick('OPEN_INCIDENTS', 'section-incidents')}
          />
          <MetricCard 
            title="Reconciled Today" value={OPS_UNAVAILABLE} subtitle="Successful payments" 
            icon={CheckCircle} colorClass="text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20"
            isActive={activeKpi === 'RECONCILED_TODAY'}
            onClick={() => handleKpiClick('RECONCILED_TODAY', 'section-reconciliation')}
          />
          <MetricCard 
            title="Pending Drafts" value={OPS_UNAVAILABLE} subtitle="Awaiting webhook/client" 
            icon={Clock} colorClass="text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20" 
            isActive={activeKpi === 'PENDING_DRAFTS'}
            onClick={() => handleKpiClick('PENDING_DRAFTS', 'section-reconciliation')}
          />
          <MetricCard 
            title="Notification Retries" value={OPS_UNAVAILABLE} subtitle="In outbox queue" 
            icon={RefreshCcw} colorClass="text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20" 
            isActive={activeKpi === 'NOTIFICATION_RETRIES'}
            onClick={() => handleKpiClick('NOTIFICATION_RETRIES', 'section-outbox')}
          />
          <MetricCard 
            title="Dead-Letter Items" value={OPS_UNAVAILABLE} subtitle="Permanent failures" 
            icon={FileWarning} colorClass="text-gray-500 dark:text-gray-400" 
            isActive={activeKpi === 'DEAD_LETTER'}
            onClick={() => handleKpiClick('DEAD_LETTER', 'section-outbox')}
          />
          <MetricCard 
            title="Delivery Rate" value={OPS_UNAVAILABLE} subtitle="Last 24 hours" 
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
                {incidentTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={incidentTrend} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} allowDecimals={false} />
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', background: '#111', color: '#fff' }}
                        cursor={{ stroke: '#333', strokeWidth: 2 }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px', color: '#9CA3AF' }} />
                      <Line type="monotone" name="Incidents (24h)" dataKey="count" stroke="#6366F1" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                    {OPS_UNAVAILABLE} — reconciliation metrics not yet wired to production APIs.
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-x-auto flex-1">
              <div className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                Payment recovery detail tables are {OPS_UNAVAILABLE.toLowerCase()} until ops payment APIs ship.
              </div>
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
              <div className="h-48 w-full flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                Notification outbox metrics are {OPS_UNAVAILABLE.toLowerCase()} until ops outbox APIs ship.
              </div>
            </div>

            <div className="overflow-x-auto flex-1">
              <div className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                Outbox retry and dead-letter tables are {OPS_UNAVAILABLE.toLowerCase()} until ops notification APIs ship.
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* 4. MOBILE KPI BOTTOM DRAWER */}
      <AnimatePresence>
        {isMobile && activeKpi && (
          <>
            <m.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={clearFilters}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            />
            <m.div 
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
            </m.div>
          </>
        )}
      </AnimatePresence>

      {/* 5. INCIDENT DETAIL DRAWER (MODAL) */}
      <AnimatePresence>
        {selectedIncident && (
          <>
            <m.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedIncident(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <m.div 
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
                  onClick={handleAcknowledgeIncident}
                  className="w-full bg-white dark:bg-[#111111] border border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-300 font-medium py-2 px-4 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors shadow-sm"
                >
                  Acknowledge Incident
                </button>
              </div>
            </m.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
