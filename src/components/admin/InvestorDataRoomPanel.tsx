import React, { memo, useMemo } from 'react';
import { m } from 'framer-motion';
import {
  Save,
  Shield,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Target,
  BarChart3,
  Users,
  Wallet,
  PiggyBank,
  Gauge,
  Building2,
  Globe2,
  RefreshCw,
  ArrowUpRight,
  CheckCircle2,
} from 'lucide-react';
import type { InvestorFunnelStage } from '../../lib/exportInvestorReportPdf';
import {
  computeDerivedDashboard,
  formatInrCompact,
  formatLastUpdated,
  getStatusBadge,
  type InvestorStatusBadge,
  type InvestorHealthLabel,
} from '../../lib/investorDashboardMetrics';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

const BADGE_STYLES: Record<InvestorStatusBadge, string> = {
  Excellent: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
  Growing: 'bg-[#FF7A00]/15 text-orange-300 border-[#FF7A00]/25',
  Healthy: 'bg-blue-500/15 text-blue-300 border-blue-500/25',
  Attention: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
};

const HEALTH_STYLES: Record<string, string> = {
  Excellent: 'text-emerald-400',
  Good: 'text-blue-400',
  Average: 'text-amber-400',
  Poor: 'text-red-400',
  'Needs Attention': 'text-amber-400',
};

type TrendProps = { direction: 'up' | 'down' | 'flat'; label: string; positive: boolean };

const TrendPill = memo(function TrendPill({ direction, label, positive }: TrendProps) {
  const Icon = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Minus;
  const tone = positive ? 'text-emerald-400' : 'text-red-400';
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold ${tone}`}>
      <Icon size={13} strokeWidth={2.5} />
      {label}
    </span>
  );
});

const StatusBadge = memo(function StatusBadge({ status }: { status: InvestorStatusBadge }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${BADGE_STYLES[status]}`}
    >
      {status}
    </span>
  );
});

type KpiCardProps = {
  label: string;
  value: string;
  sublabel?: string;
  trend?: TrendProps;
  status: InvestorStatusBadge;
  lastUpdated: string;
  icon: React.ReactNode;
  accent?: 'orange' | 'emerald' | 'blue' | 'violet';
};

const ACCENT_RING: Record<NonNullable<KpiCardProps['accent']>, string> = {
  orange: 'group-hover:shadow-[0_0_0_1px_rgba(255,122,0,0.35),0_20px_40px_-20px_rgba(255,122,0,0.35)]',
  emerald: 'group-hover:shadow-[0_0_0_1px_rgba(16,185,129,0.35),0_20px_40px_-20px_rgba(16,185,129,0.25)]',
  blue: 'group-hover:shadow-[0_0_0_1px_rgba(59,130,246,0.35),0_20px_40px_-20px_rgba(59,130,246,0.25)]',
  violet: 'group-hover:shadow-[0_0_0_1px_rgba(139,92,246,0.35),0_20px_40px_-20px_rgba(139,92,246,0.25)]',
};

const InvestorKpiCard = memo(function InvestorKpiCard({
  label,
  value,
  sublabel,
  trend,
  status,
  lastUpdated,
  icon,
  accent = 'orange',
}: KpiCardProps) {
  return (
    <m.div
      variants={fadeUp}
      className={`group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#121212]/90 p-5 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.65)] transition-all duration-300 hover:-translate-y-1 ${ACCENT_RING[accent]}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative z-10 flex items-start justify-between gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[#FF7A00]">
          {icon}
        </div>
        <StatusBadge status={status} />
      </div>
      <div className="relative z-10 space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500">{label}</p>
        <p className="text-2xl sm:text-3xl font-black tracking-tight text-white">{value}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
          {trend && <TrendPill {...trend} />}
          {sublabel && <span className="text-xs font-semibold text-gray-500">{sublabel}</span>}
        </div>
        <p className="text-[10px] font-medium text-gray-600 pt-2">Updated {lastUpdated}</p>
      </div>
    </m.div>
  );
});

const RevenueHealthGauge = memo(function RevenueHealthGauge({
  health,
  retention,
  mrrGrowth,
  trialConv,
}: {
  health: InvestorHealthLabel;
  retention: number;
  mrrGrowth: number;
  trialConv: number;
}) {
  const scoreMap = { Excellent: 92, Good: 74, Average: 52, Poor: 28, 'Needs Attention': 40 };
  const pct = scoreMap[health as keyof typeof scoreMap] ?? 50;

  return (
    <m.div
      variants={fadeUp}
      className="rounded-2xl border border-white/[0.06] bg-[#121212]/90 p-6 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.65)]"
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <Gauge size={16} className="text-[#FF7A00]" />
            Revenue Health
          </h3>
          <p className="text-xs text-gray-500 mt-1">Composite signal from MRR, retention & conversion</p>
        </div>
        <span className={`text-lg font-black ${HEALTH_STYLES[health] ?? 'text-white'}`}>{health}</span>
      </div>
      <div className="relative h-3 overflow-hidden rounded-full bg-black/50 border border-white/5">
        <m.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#FF7A00] via-orange-400 to-emerald-400"
        />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-xl border border-white/5 bg-black/30 px-2 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Retention</p>
          <p className="text-sm font-black text-white mt-1">{retention}%</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-black/30 px-2 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">MRR Growth</p>
          <p className="text-sm font-black text-emerald-400 mt-1">+{mrrGrowth}%</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-black/30 px-2 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Trial Conv.</p>
          <p className="text-sm font-black text-white mt-1">{trialConv}%</p>
        </div>
      </div>
    </m.div>
  );
});

export type InvestorDataRoomPanelProps = {
  mrr: number;
  arr: number;
  activeTenantsCount: number;
  trialTenantsCount: number;
  suspendedTenantsCount: number;
  activeSubscriptions: number;
  totalTenants: number;
  totalLeads: number;
  demoRequests: number;
  newLeadsCount: number;
  verifiedMerchants: number;
  fssaiVerified: number;
  ordersProcessed: number;
  leadToTrialConv: number;
  trialToPaidConv: number;
  funnel: InvestorFunnelStage[];
  exportingPdf: boolean;
  loading: boolean;
  refreshing: boolean;
  lastSyncedAt: Date | null;
  onExportPdf: () => void;
};

export const InvestorDataRoomPanel = memo(function InvestorDataRoomPanel(props: InvestorDataRoomPanelProps) {
  const {
    mrr,
    arr,
    activeTenantsCount,
    trialTenantsCount,
    suspendedTenantsCount,
    activeSubscriptions,
    totalTenants,
    totalLeads,
    demoRequests,
    newLeadsCount,
    verifiedMerchants,
    fssaiVerified,
    ordersProcessed,
    leadToTrialConv,
    trialToPaidConv,
    funnel,
    exportingPdf,
    loading,
    refreshing,
    lastSyncedAt,
    onExportPdf,
  } = props;

  const dashboardInput = useMemo(
    () => ({
      mrr,
      arr,
      activeTenantsCount,
      trialTenantsCount,
      suspendedTenantsCount,
      activeSubscriptions,
      totalTenants,
      totalLeads,
      demoRequests,
      newLeadsCount,
      verifiedMerchants,
      fssaiVerified,
      ordersProcessed,
      leadToTrialConv,
      trialToPaidConv,
      funnel,
    }),
    [
      mrr,
      arr,
      activeTenantsCount,
      trialTenantsCount,
      suspendedTenantsCount,
      activeSubscriptions,
      totalTenants,
      totalLeads,
      demoRequests,
      newLeadsCount,
      verifiedMerchants,
      fssaiVerified,
      ordersProcessed,
      leadToTrialConv,
      trialToPaidConv,
      funnel,
    ],
  );

  const derived = useMemo(() => computeDerivedDashboard(dashboardInput), [dashboardInput]);
  const lastUpdated = formatLastUpdated(lastSyncedAt);

  const growthPipelineRows = useMemo(
    () => [
      ['Total Merchants', String(totalTenants)],
      ['Total Leads', String(totalLeads)],
      ['Demo Requests', String(demoRequests)],
      ['New Leads (Uncontacted)', String(newLeadsCount)],
      ['Lead → Trial Conversion', `${leadToTrialConv}%`],
      ['Trial → Paid Conversion', `${trialToPaidConv}%`],
      ['Orders Processed (est.)', ordersProcessed.toLocaleString('en-IN')],
    ],
    [totalTenants, totalLeads, demoRequests, newLeadsCount, leadToTrialConv, trialToPaidConv, ordersProcessed],
  );

  const executiveRows = useMemo(
    () => [
      ['Paid Subscriptions', String(activeSubscriptions)],
      ['Active Merchants', String(activeTenantsCount)],
      ['Trial / Pending', String(trialTenantsCount)],
      ['Suspended / Rejected', String(suspendedTenantsCount)],
    ],
    [activeSubscriptions, activeTenantsCount, trialTenantsCount, suspendedTenantsCount],
  );

  const maxFunnel = funnel[0]?.count || 1;

  return (
    <m.div initial="hidden" animate="visible" variants={stagger} className="space-y-8 pb-8">
      {/* Header */}
      <m.div variants={fadeUp} className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300">
            <Shield size={12} />
            Investor Data Room
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Platform Intelligence
          </h1>
          <p className="text-sm font-medium text-gray-400 max-w-2xl">
            Automated metrics reporting for stakeholders and board members — live from platform data.
          </p>
          <p className="text-[11px] font-medium text-gray-600 flex items-center gap-2">
            <RefreshCw size={12} className={refreshing ? 'animate-spin text-[#FF7A00]' : ''} />
            Last synced {lastUpdated}
          </p>
        </div>
        <button
          type="button"
          onClick={onExportPdf}
          disabled={exportingPdf || loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60 print:hidden"
        >
          <Save size={16} className={exportingPdf ? 'animate-pulse' : ''} />
          {exportingPdf ? 'Generating…' : 'Export PDF Report'}
        </button>
      </m.div>

      {/* Executive Summary */}
      <m.div
        variants={fadeUp}
        className="rounded-2xl border border-[#FF7A00]/20 bg-gradient-to-br from-[#FF7A00]/10 via-[#151515] to-[#121212] p-6 sm:p-8"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3 max-w-3xl">
            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-[#FF7A00]">Executive Summary</h2>
            <p className="text-base sm:text-lg font-medium leading-relaxed text-gray-200">{derived.executiveSummary}</p>
          </div>
          <div className="shrink-0 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Platform Health</p>
            <p className={`text-xl font-black mt-1 ${HEALTH_STYLES[derived.overallHealth]}`}>{derived.overallHealth}</p>
          </div>
        </div>
      </m.div>

      {/* Primary KPI Row */}
      <div>
        <m.h2 variants={fadeUp} className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
          Core SaaS Metrics
        </m.h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <InvestorKpiCard
            label="Monthly Recurring Revenue"
            value={`₹${mrr.toLocaleString('en-IN')}`}
            sublabel="+12% MoM Growth"
            trend={derived.primaryTrends.mrr}
            status={getStatusBadge('mrr', mrr)}
            lastUpdated={lastUpdated}
            icon={<Wallet size={18} />}
            accent="orange"
          />
          <InvestorKpiCard
            label="Annual Run Rate (ARR)"
            value={`₹${arr.toLocaleString('en-IN')}`}
            sublabel="Projection Stable"
            trend={derived.primaryTrends.arr}
            status={getStatusBadge('arr', arr)}
            lastUpdated={lastUpdated}
            icon={<TrendingUp size={18} />}
            accent="emerald"
          />
          <InvestorKpiCard
            label="Paid Merchant Retention"
            value={`${derived.retention}%`}
            sublabel="World-Class B2B SaaS"
            trend={derived.primaryTrends.retention}
            status={getStatusBadge('retention', derived.retention)}
            lastUpdated={lastUpdated}
            icon={<Users size={18} />}
            accent="blue"
          />
          <InvestorKpiCard
            label="CAC Payback Period"
            value={`${derived.cacPaybackMonths} Mo`}
            sublabel="Organic Led Growth"
            trend={derived.primaryTrends.cac}
            status={getStatusBadge('cac', derived.cacPaybackMonths)}
            lastUpdated={lastUpdated}
            icon={<Target size={18} />}
            accent="violet"
          />
        </div>
      </div>

      {/* Derived KPI Row */}
      <div>
        <m.h2 variants={fadeUp} className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-gray-500">
          Platform Economics
        </m.h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <InvestorKpiCard
            label="Estimated Platform GMV"
            value={formatInrCompact(derived.platformGmv)}
            sublabel="Orders × ₹350 AOV"
            trend={derived.derivedTrends.gmv}
            status={getStatusBadge('gmv', derived.platformGmv)}
            lastUpdated={lastUpdated}
            icon={<BarChart3 size={18} />}
            accent="orange"
          />
          <InvestorKpiCard
            label="Estimated Merchant Revenue"
            value={formatInrCompact(derived.merchantRevenue)}
            sublabel="Platform GMV"
            trend={derived.derivedTrends.merchantRevenue}
            status={getStatusBadge('gmv', derived.merchantRevenue)}
            lastUpdated={lastUpdated}
            icon={<Building2 size={18} />}
            accent="emerald"
          />
          <InvestorKpiCard
            label="Commission Saved"
            value={formatInrCompact(derived.commissionSaved)}
            sublabel="Est. savings vs traditional aggregators"
            trend={derived.derivedTrends.commissionSaved}
            status={getStatusBadge('gmv', derived.commissionSaved)}
            lastUpdated={lastUpdated}
            icon={<PiggyBank size={18} />}
            accent="blue"
          />
          <InvestorKpiCard
            label="Platform Growth Score"
            value={`${derived.growthScore} / 100`}
            sublabel="Retention · Conversion · MRR"
            trend={derived.derivedTrends.growthScore}
            status={getStatusBadge('growth', derived.growthScore)}
            lastUpdated={lastUpdated}
            icon={<Sparkles size={18} />}
            accent="violet"
          />
        </div>
      </div>

      {/* Insights + Side panels */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <m.div
          variants={fadeUp}
          className="xl:col-span-2 rounded-2xl border border-white/[0.06] bg-[#121212]/90 p-6 sm:p-8 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.65)]"
        >
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles size={18} className="text-[#FF7A00]" />
                AI Investor Insights
              </h3>
              <p className="text-xs text-gray-500 mt-1">Dynamic narrative generated from live platform metrics</p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-bold ${BADGE_STYLES[getStatusBadge('growth', derived.growthScore)]}`}>
              {derived.overallHealth}
            </span>
          </div>
          <ul className="space-y-4">
            {derived.aiInsights.map((line) => (
              <li key={line} className="flex gap-3 text-sm leading-relaxed text-gray-300">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </m.div>

        <div className="space-y-6">
          <RevenueHealthGauge
            health={derived.revenueHealth}
            retention={derived.retention}
            mrrGrowth={derived.mrrGrowth}
            trialConv={trialToPaidConv}
          />

          <m.div
            variants={fadeUp}
            className="rounded-2xl border border-white/[0.06] bg-[#121212]/90 p-5 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.65)]"
          >
            <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-4">Today&apos;s Snapshot</h3>
            <dl className="space-y-3">
              {[
                ['Active Merchants', activeTenantsCount],
                ['Paid Merchants', activeSubscriptions],
                ['Pending Trials', trialTenantsCount],
                ['Total Leads', totalLeads],
                ['Orders Processed', ordersProcessed.toLocaleString('en-IN')],
              ].map(([label, value]) => (
                <div key={label as string} className="flex items-center justify-between gap-3 border-b border-white/5 pb-3 last:border-0 last:pb-0">
                  <dt className="text-xs font-medium text-gray-500">{label}</dt>
                  <dd className="text-sm font-black text-white">{value}</dd>
                </div>
              ))}
            </dl>
          </m.div>

          <m.div
            variants={fadeUp}
            className="rounded-2xl border border-[#FF7A00]/15 bg-gradient-to-br from-[#FF7A00]/8 to-[#121212] p-5"
          >
            <div className="mb-3 flex items-center gap-2 text-[#FF7A00]">
              <Globe2 size={16} />
              <h3 className="text-sm font-bold uppercase tracking-wider">Market Opportunity</h3>
            </div>
            <dl className="space-y-3">
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wider text-gray-500">India Cloud Kitchens</dt>
                <dd className="text-xl font-black text-white mt-1">75,000+</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Target SaaS Market</dt>
                <dd className="text-xl font-black text-white mt-1">₹1200 Cr+</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Current Penetration</dt>
                <dd className="text-sm font-bold text-orange-300 mt-1 inline-flex items-center gap-1">
                  Early Stage <ArrowUpRight size={14} />
                </dd>
              </div>
            </dl>
          </m.div>
        </div>
      </div>

      {/* Executive Summary Table + Growth Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <m.div variants={fadeUp} className="rounded-2xl border border-white/[0.06] bg-[#151515] p-6 sm:p-8">
          <h3 className="text-lg font-bold text-white mb-5">Executive Summary</h3>
          <div className="space-y-3">
            {executiveRows.map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-black/30 px-4 py-3"
              >
                <span className="text-sm font-medium text-gray-400">{label}</span>
                <span className="text-sm font-black text-white">{value}</span>
              </div>
            ))}
          </div>
        </m.div>

        <m.div variants={fadeUp} className="rounded-2xl border border-white/[0.06] bg-[#151515] p-6 sm:p-8">
          <h3 className="text-lg font-bold text-white mb-5">Growth Pipeline</h3>
          <div className="space-y-3">
            {growthPipelineRows.map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-black/30 px-4 py-3"
              >
                <span className="text-sm font-medium text-gray-400">{label}</span>
                <span className="text-sm font-black text-white">{value}</span>
              </div>
            ))}
          </div>
        </m.div>
      </div>

      {/* Merchant Activation Funnel */}
      <m.div variants={fadeUp} className="rounded-2xl border border-white/[0.06] bg-[#151515] p-6 sm:p-8">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <BarChart3 size={18} className="text-purple-400" />
              Merchant Activation Funnel
            </h3>
            <p className="text-xs text-gray-500 mt-1">End-to-end onboarding conversion from existing platform data</p>
          </div>
          <StatusBadge status={getStatusBadge('pipeline', leadToTrialConv)} />
        </div>
        <div className="space-y-4">
          {funnel.map((stage) => {
            const pct = Math.round((stage.count / maxFunnel) * 100) || 0;
            return (
              <div key={stage.step} className="grid grid-cols-1 sm:grid-cols-[140px_1fr_72px] items-center gap-3">
                <span className="text-sm font-bold text-gray-300">{stage.step}</span>
                <div className="h-9 rounded-xl border border-white/5 bg-black/40 overflow-hidden relative">
                  <m.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#FF7A00]/80 to-orange-400/80"
                  />
                  <span className="relative z-10 flex h-full items-center px-3 text-xs font-bold text-white">
                    {stage.count} merchants · {pct}%
                  </span>
                </div>
                <span className="text-xs font-bold text-gray-500 sm:text-right">{pct}%</span>
              </div>
            );
          })}
        </div>
      </m.div>

      {/* Case Studies — preserved */}
      <m.div variants={fadeUp} className="rounded-2xl border border-white/[0.06] bg-[#151515] p-6 sm:p-8">
        <h2 className="text-xl font-bold text-white mb-6">Recent Case Studies</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="group cursor-pointer rounded-xl border border-white/10 bg-black/40 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/30 hover:shadow-[0_12px_30px_-12px_rgba(16,185,129,0.25)]"
            >
              <div className="mb-2 inline-block rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-400">
                Case Study #{i}
              </div>
              <h3 className="text-lg font-bold text-white transition-colors group-hover:text-emerald-300">
                Cloud Kitchen Scale-Up
              </h3>
              <p className="mt-2 line-clamp-2 text-sm text-gray-400">
                Revenue grew by 24% and repeat order rate increased to 68% after adopting BhojanOS AI marketing engine.
              </p>
            </div>
          ))}
        </div>
      </m.div>
    </m.div>
  );
});

export default InvestorDataRoomPanel;
