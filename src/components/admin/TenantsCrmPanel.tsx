import React, { memo, useMemo } from 'react';
import { m } from 'framer-motion';
import {
  Building2,
  Search,
  Filter,
  ExternalLink,
  Mail,
  Phone,
  CheckCircle2,
  Ban,
} from 'lucide-react';

type StatusIndicator = {
  color: string;
  bg: string;
  border: string;
  bgFill: string;
  label: string;
};

export type TenantsCrmPanelProps = {
  filteredTenants: any[];
  totalTenants: number;
  activeCount: number;
  trialCount: number;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  getStatusIndicator: (tenant: any) => StatusIndicator;
  getTrustScore: (tenant: any) => number;
  onUpdateStatus: (tenantId: string, status: string, storeStatus?: string) => void;
  onSeedDefault?: () => void;
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

/** Strip emoji and shorten status labels for compact table cells. */
export function formatStatusLabel(label: string): string {
  const cleaned = label.replace(/^[^\p{L}\p{N}]+/u, '').trim();
  const compact: Record<string, string> = {
    'Published — No Orders': 'Published · No orders',
    'Registration Only': 'Registration only',
    'Sandbox Active': 'Sandbox active',
    'First Order Achieved': 'First order',
    'Repeat Order Achieved': 'Repeat order',
  };
  return compact[cleaned] ?? cleaned.replace(/\s—\s/g, ' · ');
}

function formatJoinedDate(tenant: any): string {
  if (tenant.createdAt?.seconds) {
    return new Date(tenant.createdAt.seconds * 1000).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
  return 'Date unknown';
}

function trustBarColor(score: number): string {
  if (score >= 80) return 'from-emerald-500 to-emerald-400';
  if (score >= 50) return 'from-amber-500 to-amber-400';
  return 'from-red-500 to-red-400';
}

const StatusPill = memo(function StatusPill({ status }: { status: StatusIndicator }) {
  const text = formatStatusLabel(status.label);
  return (
    <span
      className={`inline-flex max-w-[160px] items-center gap-1.5 rounded-full border px-2.5 py-1 ${status.bgFill} ${status.border}`}
      title={text}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${status.bg}`} />
      <span className={`text-[9px] font-bold uppercase leading-tight tracking-[0.08em] ${status.color}`}>
        {text}
      </span>
    </span>
  );
});

const TrustScoreCell = memo(function TrustScoreCell({ score }: { score: number }) {
  return (
    <div className="w-[108px]">
      <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-gray-600">Trust</p>
      <div className="flex items-center gap-2">
        <span className="w-6 shrink-0 text-right text-sm font-bold tabular-nums text-white">{score}</span>
        <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${trustBarColor(score)}`}
            style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
          />
        </div>
      </div>
    </div>
  );
});

const IconAction = memo(function IconAction({
  label,
  onClick,
  href,
  tone,
  children,
}: {
  label: string;
  onClick?: () => void;
  href?: string;
  tone: 'neutral' | 'success' | 'danger';
  children: React.ReactNode;
}) {
  const toneClass = {
    neutral:
      'border-white/10 bg-white/[0.04] text-gray-300 hover:border-[#FF7A00]/30 hover:bg-[#FF7A00]/10 hover:text-white',
    success:
      'border-emerald-500/25 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20',
    danger: 'border-rose-500/20 bg-rose-500/5 text-rose-400 hover:bg-rose-500/10',
  }[tone];

  const className = `inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-all ${toneClass}`;

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" title={label} aria-label={label} className={className}>
        {children}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} title={label} aria-label={label} className={className}>
      {children}
    </button>
  );
});

const TenantRow = memo(function TenantRow({
  tenant,
  getStatusIndicator,
  getTrustScore,
  onUpdateStatus,
}: {
  tenant: any;
  getStatusIndicator: (tenant: any) => StatusIndicator;
  getTrustScore: (tenant: any) => number;
  onUpdateStatus: (tenantId: string, status: string, storeStatus?: string) => void;
}) {
  const status = getStatusIndicator(tenant);
  const score = getTrustScore(tenant);
  const slug = tenant.slug || tenant.id;
  const email = tenant.contact?.email;
  const phone = tenant.contact?.phone;

  return (
    <tr className="group border-b border-white/[0.04] transition-colors hover:bg-white/[0.02]">
      <td className="px-5 py-4 align-middle">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] text-base font-black text-white">
            {tenant.name ? tenant.name.charAt(0).toUpperCase() : 'K'}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold tracking-tight text-white" title={tenant.name || 'Unnamed Kitchen'}>
              {tenant.name || 'Unnamed Kitchen'}
            </p>
            <p className="mt-0.5 text-[11px] font-medium text-gray-500">Joined {formatJoinedDate(tenant)}</p>
          </div>
        </div>
      </td>

      <td className="px-5 py-4 align-middle">
        <code
          className="block max-w-[200px] truncate rounded-lg border border-white/[0.06] bg-black/40 px-2.5 py-1.5 font-mono text-[11px] font-medium text-gray-400"
          title={slug}
        >
          {slug}
        </code>
      </td>

      <td className="px-5 py-4 align-middle">
        <div className="space-y-1.5 min-w-[140px]">
          <div className="flex items-center gap-2 min-w-0">
            <Mail size={12} className="shrink-0 text-gray-600" />
            <span className="truncate text-xs font-medium text-gray-300">{email || '—'}</span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <Phone size={12} className="shrink-0 text-gray-600" />
            <span className="truncate text-xs font-medium text-gray-500">{phone || '—'}</span>
          </div>
        </div>
      </td>

      <td className="px-5 py-4 align-middle">
        <StatusPill status={status} />
      </td>

      <td className="px-5 py-4 align-middle">
        <TrustScoreCell score={score} />
      </td>

      <td className="px-5 py-4 align-middle text-right">
        <div className="flex items-center justify-end gap-1.5">
          <IconAction label="View storefront" href={`/k/${slug}`} tone="neutral">
            <ExternalLink size={15} />
          </IconAction>
          {tenant.status !== 'active' && (
            <IconAction
              label="Approve tenant"
              tone="success"
              onClick={() => onUpdateStatus(tenant.id, 'active', 'published')}
            >
              <CheckCircle2 size={15} />
            </IconAction>
          )}
          {tenant.status !== 'suspended' && (
            <IconAction label="Suspend tenant" tone="danger" onClick={() => onUpdateStatus(tenant.id, 'suspended')}>
              <Ban size={15} />
            </IconAction>
          )}
        </div>
      </td>
    </tr>
  );
});

export const TenantsCrmPanel = memo(function TenantsCrmPanel({
  filteredTenants,
  totalTenants,
  activeCount,
  trialCount,
  searchQuery,
  onSearchChange,
  getStatusIndicator,
  getTrustScore,
  onUpdateStatus,
  onSeedDefault,
}: TenantsCrmPanelProps) {
  const showingLabel = useMemo(
    () => `${filteredTenants.length} of ${totalTenants} kitchens`,
    [filteredTenants.length, totalTenants],
  );

  return (
    <m.div
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
      className="space-y-6"
    >
      {/* Header */}
      <m.div variants={fadeUp} className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#FF7A00]">Tenant CRM</p>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Kitchen Directory</h2>
          <p className="mt-1 text-sm font-medium text-gray-400">Manage active kitchens, trials, and storefront access.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-bold text-gray-300">
            {showingLabel}
          </span>
          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-300">
            {activeCount} active
          </span>
          <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[11px] font-bold text-amber-300">
            {trialCount} trial
          </span>
        </div>
      </m.div>

      {/* Search */}
      <m.div variants={fadeUp} className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input
            type="text"
            placeholder="Search by name or slug…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-xl border border-white/[0.06] bg-[#121212] py-3 pl-11 pr-4 text-sm text-white shadow-inner outline-none transition-all placeholder:text-gray-600 focus:border-[#FF7A00]/30 focus:ring-2 focus:ring-[#FF7A00]/15"
          />
        </div>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.06] bg-[#121212] px-4 py-3 text-sm font-bold text-white transition-all hover:border-white/10 hover:bg-white/[0.04]"
        >
          <Filter size={16} className="text-gray-500" />
          Filter
        </button>
      </m.div>

      {/* Desktop table */}
      <m.div
        variants={fadeUp}
        className="hidden overflow-hidden rounded-2xl border border-white/[0.06] bg-[#121212]/80 shadow-[0_8px_40px_-16px_rgba(0,0,0,0.8)] sm:block"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] table-fixed border-collapse text-left">
            <colgroup>
              <col style={{ width: '24%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '16%' }} />
            </colgroup>
            <thead className="sticky top-0 z-20">
              <tr className="border-b border-white/[0.08] bg-[#161616]/95 backdrop-blur-md">
                {['Kitchen', 'Slug', 'Contact', 'Status', 'Trust score', 'Actions'].map((head) => (
                  <th
                    key={head}
                    scope="col"
                    className={`px-5 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-500 ${
                      head === 'Actions' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <Building2 size={36} className="mx-auto mb-3 text-gray-700" />
                    <p className="text-base font-bold text-white">No tenants found</p>
                    <p className="mt-1 text-sm text-gray-500">Try adjusting your search query</p>
                    {onSeedDefault && (
                      <button
                        type="button"
                        onClick={onSeedDefault}
                        className="mt-5 rounded-xl bg-[#FF7A00] px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#E56D00]"
                      >
                        Seed Default Database
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredTenants.map((tenant) => (
                  <TenantRow
                    key={tenant.id}
                    tenant={tenant}
                    getStatusIndicator={getStatusIndicator}
                    getTrustScore={getTrustScore}
                    onUpdateStatus={onUpdateStatus}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
        {filteredTenants.length > 0 && (
          <div className="border-t border-white/[0.06] bg-[#161616]/60 px-5 py-2.5 text-[11px] font-medium text-gray-500">
            Showing {filteredTenants.length} tenant{filteredTenants.length === 1 ? '' : 's'}
          </div>
        )}
      </m.div>

      {/* Mobile cards */}
      <div className="space-y-3 sm:hidden">
        {filteredTenants.map((tenant) => {
          const status = getStatusIndicator(tenant);
          const score = getTrustScore(tenant);
          const slug = tenant.slug || tenant.id;

          return (
            <m.div
              key={tenant.id}
              variants={fadeUp}
              className="rounded-2xl border border-white/[0.06] bg-[#121212] p-4 shadow-lg"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-base font-black text-white">
                  {tenant.name ? tenant.name.charAt(0).toUpperCase() : 'K'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-white leading-snug">{tenant.name || 'Unnamed Kitchen'}</p>
                  <p className="mt-0.5 truncate font-mono text-[11px] text-gray-500">{slug}</p>
                  <p className="mt-1 text-[11px] text-gray-600">Joined {formatJoinedDate(tenant)}</p>
                </div>
                <StatusPill status={status} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-white/[0.05] bg-black/30 p-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-600">Email</p>
                  <p className="mt-1 truncate text-xs font-medium text-gray-300">{tenant.contact?.email || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-600">Phone</p>
                  <p className="mt-1 truncate text-xs font-medium text-gray-300">{tenant.contact?.phone || '—'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-1.5">Trust Score</p>
                  <TrustScoreCell score={score} />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={`/k/${slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex flex-1 min-w-[120px] items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-xs font-bold text-gray-200"
                >
                  <ExternalLink size={14} />
                  View Storefront
                </a>
                {tenant.status !== 'active' && (
                  <button
                    type="button"
                    onClick={() => onUpdateStatus(tenant.id, 'active', 'published')}
                    className="flex-1 rounded-xl bg-white py-2.5 text-xs font-bold uppercase tracking-wider text-black"
                  >
                    Approve
                  </button>
                )}
                {tenant.status !== 'suspended' && (
                  <button
                    type="button"
                    onClick={() => onUpdateStatus(tenant.id, 'suspended')}
                    className="flex-1 rounded-xl border border-rose-500/25 bg-rose-500/10 py-2.5 text-xs font-bold uppercase tracking-wider text-rose-400"
                  >
                    Suspend
                  </button>
                )}
              </div>
            </m.div>
          );
        })}
      </div>
    </m.div>
  );
});

export default TenantsCrmPanel;
