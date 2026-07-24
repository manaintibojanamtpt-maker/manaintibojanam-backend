import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ClipboardList, Filter, Loader2, Search, X } from 'lucide-react';
import {
  OPS_UNAVAILABLE,
  fetchAiAuditEvents,
  type AiAuditEventRecord,
  type AiAuditEventsQuery,
  type AiOpsSummary,
  type AiOpsWindowSummary,
} from '../../lib/opsHealthApi';

type ReviewPreset =
  | 'all'
  | 'blocked'
  | 'confirm_discard'
  | 'canary'
  | 'safety'
  | 'provider_error';

const PRESETS: Array<{ id: ReviewPreset; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'confirm_discard', label: 'Confirm / discard' },
  { id: 'canary', label: 'Canary denials' },
  { id: 'safety', label: 'Safety blocked' },
  { id: 'provider_error', label: 'Provider errors' },
];

function presetToQuery(preset: ReviewPreset): Partial<AiAuditEventsQuery> {
  switch (preset) {
    case 'blocked':
      return {
        eventTypes: [
          'ai.assist.blocked',
          'ai.cart_plan.blocked',
          'ai.cart_plan.invalid',
        ],
      };
    case 'confirm_discard':
      return {
        eventTypes: ['ai.cart_plan.confirmed', 'ai.cart_plan.discarded'],
      };
    case 'canary':
      return {
        eventTypes: ['ai.assist.blocked', 'ai.cart_plan.blocked'],
      };
    case 'safety':
      return { safetyBlocked: true };
    case 'provider_error':
      return { eventType: 'ai.assist.provider_error' };
    default:
      return {};
  }
}

function fmtTime(iso: string | undefined): string {
  if (!iso) return OPS_UNAVAILABLE;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function topEntries(
  record: Record<string, { totalEvents: number } | number> | undefined,
  limit = 8,
): Array<{ key: string; total: number }> {
  if (!record) return [];
  return Object.entries(record)
    .map(([key, value]) => ({
      key,
      total: typeof value === 'number' ? value : value.totalEvents,
    }))
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

function SliceChips({
  title,
  window,
  kind,
}: {
  title: string;
  window: AiOpsWindowSummary | undefined;
  kind: 'bucket' | 'error';
}) {
  const rows =
    kind === 'bucket'
      ? topEntries(window?.byCanaryBucket)
      : topEntries(window?.byErrorCode);

  return (
    <div className="rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] p-3">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{title}</p>
      {rows.length === 0 ? (
        <p className="text-xs text-gray-400">No slice data in this window.</p>
      ) : (
        <ul className="space-y-1">
          {rows.map((row) => (
            <li
              key={row.key}
              className="flex justify-between gap-2 text-xs text-gray-700 dark:text-gray-300"
            >
              <span className="truncate font-mono">{row.key}</span>
              <span className="font-medium tabular-nums">{row.total}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === '') return null;
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-2 text-xs py-1 border-b border-gray-100 dark:border-white/5 last:border-0">
      <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="text-gray-900 dark:text-gray-100 break-all font-mono">{value}</dd>
    </div>
  );
}

interface AiAuditReviewPanelProps {
  readonly summary: AiOpsSummary | null;
}

/**
 * Phase 22 — read-only AI audit review for SystemHealth.
 * Search/inspect durable events + in-process canary slices. No mutation controls.
 */
export function AiAuditReviewPanel({ summary }: AiAuditReviewPanelProps) {
  const [preset, setPreset] = useState<ReviewPreset>('all');
  const [correlationId, setCorrelationId] = useState('');
  const [canaryBucket, setCanaryBucket] = useState('');
  const [eventType, setEventType] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<AiAuditEventRecord[]>([]);
  const [persistenceEnabled, setPersistenceEnabled] = useState<boolean | null>(null);
  const [selected, setSelected] = useState<AiAuditEventRecord | null>(null);
  const [loadedOnce, setLoadedOnce] = useState(false);

  const buildQuery = useCallback((): AiAuditEventsQuery => {
    const fromPreset = presetToQuery(preset);
    const bucketRaw = canaryBucket.trim() === '' ? NaN : Number(canaryBucket.trim());
    return {
      ...fromPreset,
      ...(eventType.trim() ? { eventType: eventType.trim(), eventTypes: undefined } : {}),
      ...(correlationId.trim() ? { correlationId: correlationId.trim() } : {}),
      ...(Number.isFinite(bucketRaw) ? { canaryBucket: bucketRaw } : {}),
      limit: 50,
    };
  }, [preset, eventType, correlationId, canaryBucket]);

  const runSearch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAiAuditEvents(buildQuery());
      if (!result) {
        setEvents([]);
        setError('Audit events unavailable');
        setPersistenceEnabled(null);
        return;
      }
      setPersistenceEnabled(result.auditPersistenceEnabled);
      if (!result.success) {
        setEvents([]);
        setError(result.error || 'Failed to load audit events');
        return;
      }
      const nextEvents =
        preset === 'canary'
          ? result.events.filter((e) => (e.errorCode ?? '').startsWith('AI_CANARY_'))
          : result.events;
      setEvents(nextEvents);
      setLoadedOnce(true);
      if (selected && !nextEvents.some((e) => e.eventId === selected.eventId)) {
        setSelected(null);
      }
    } finally {
      setLoading(false);
    }
  }, [buildQuery, selected, preset]);

  useEffect(() => {
    void runSearch();
    // Initial load only — subsequent searches are explicit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const obsWindow = summary?.observability?.last1h;
  const durableHint = useMemo(() => {
    if (summary?.auditPersistence) {
      return summary.auditPersistence.enabled
        ? `Durable: ${summary.auditPersistence.collection}`
        : 'Durable writes OFF (AI_AUDIT_PERSISTENCE_ENABLED)';
    }
    if (persistenceEnabled === true) return 'Durable: ai_audit_events';
    if (persistenceEnabled === false) return 'Durable writes OFF';
    return OPS_UNAVAILABLE;
  }, [summary?.auditPersistence, persistenceEnabled]);

  return (
    <section
      id="section-ai-audit-review"
      data-testid="ai-audit-review-panel"
      className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-white/5 shadow-sm overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-gray-200 dark:border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2 dark:text-white">
            <ClipboardList className="w-5 h-5 text-gray-500 dark:text-gray-400" /> AI Audit Review
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Read-only search of durable AI events, canary slices, blocks, and confirm/discard outcomes.
          </p>
        </div>
        <p className="text-xs text-gray-400" data-testid="ai-audit-persistence-hint">
          {durableHint}
        </p>
      </div>

      <div className="p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <SliceChips title="Canary buckets (last 1h, in-process)" window={obsWindow} kind="bucket" />
          <SliceChips title="Error codes (last 1h, in-process)" window={obsWindow} kind="error" />
        </div>

        <div className="space-y-3 rounded-lg border border-gray-200 dark:border-white/10 p-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Audit presets">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPreset(p.id)}
                className={`px-2.5 py-1 text-xs border transition-colors ${
                  preset === p.id
                    ? 'border-gray-900 dark:border-white bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                    : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <label className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <span>Correlation ID</span>
              <input
                type="text"
                value={correlationId}
                onChange={(e) => setCorrelationId(e.target.value)}
                placeholder="optional"
                className="w-full px-2 py-1.5 text-sm rounded border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 text-gray-900 dark:text-white"
              />
            </label>
            <label className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <span>Event type override</span>
              <input
                type="text"
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                placeholder="e.g. ai.assist.blocked"
                className="w-full px-2 py-1.5 text-sm rounded border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 text-gray-900 dark:text-white font-mono"
              />
            </label>
            <label className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <span>Canary bucket (0–99)</span>
              <input
                type="number"
                min={0}
                max={99}
                value={canaryBucket}
                onChange={(e) => setCanaryBucket(e.target.value)}
                placeholder="optional"
                className="w-full px-2 py-1.5 text-sm rounded border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 text-gray-900 dark:text-white"
              />
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void runSearch()}
              disabled={loading}
              data-testid="ai-audit-search"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded bg-gray-900 text-white dark:bg-white dark:text-gray-900 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              Search
            </button>
            <span className="text-[11px] text-gray-400 flex items-center gap-1">
              <Filter className="w-3 h-3" /> No mutations · review only
            </span>
          </div>
        </div>

        {error && (
          <p className="text-sm text-amber-700 dark:text-amber-300" data-testid="ai-audit-error">
            {error}
            {persistenceEnabled === false
              ? ' Enable AI_AUDIT_PERSISTENCE_ENABLED on the server to retain events.'
              : ''}
          </p>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3 overflow-x-auto rounded-lg border border-gray-200 dark:border-white/10">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 dark:bg-[#0A0A0A] text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-white/5">
                <tr>
                  <th className="px-3 py-2 font-medium">When</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Outcome</th>
                  <th className="px-3 py-2 font-medium">Bucket</th>
                  <th className="px-3 py-2 font-medium">Error</th>
                </tr>
              </thead>
              <tbody>
                {events.length === 0 && loadedOnce && !loading && (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-gray-400 text-sm">
                      No matching audit events.
                    </td>
                  </tr>
                )}
                {events.map((event) => {
                  const active = selected?.eventId === event.eventId;
                  return (
                    <tr
                      key={event.eventId}
                      data-testid="ai-audit-row"
                      onClick={() => setSelected(event)}
                      className={`cursor-pointer border-b border-gray-100 dark:border-white/5 ${
                        active
                          ? 'bg-gray-100 dark:bg-white/10'
                          : 'hover:bg-gray-50 dark:hover:bg-white/[0.04]'
                      }`}
                    >
                      <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
                        {fmtTime(event.timestamp || event.persistedAt)}
                      </td>
                      <td className="px-3 py-2 text-xs font-mono text-gray-900 dark:text-white">
                        {event.eventType}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {event.safetyBlocked
                          ? 'safety'
                          : event.success
                            ? 'ok'
                            : 'fail'}
                      </td>
                      <td className="px-3 py-2 text-xs tabular-nums">
                        {typeof event.canaryBucket === 'number' ? event.canaryBucket : '—'}
                      </td>
                      <td className="px-3 py-2 text-xs font-mono truncate max-w-[10rem]">
                        {event.errorCode || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="lg:col-span-2 rounded-lg border border-gray-200 dark:border-white/10 p-3 min-h-[12rem]">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Event detail</p>
              {selected && (
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  aria-label="Clear selection"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {!selected ? (
              <p className="text-sm text-gray-400">Select a row to inspect fields.</p>
            ) : (
              <dl data-testid="ai-audit-detail">
                <DetailField label="Event ID" value={selected.eventId} />
                <DetailField label="Type" value={selected.eventType} />
                <DetailField label="Timestamp" value={fmtTime(selected.timestamp)} />
                <DetailField label="Persisted" value={fmtTime(selected.persistedAt)} />
                <DetailField label="Correlation" value={selected.correlationId} />
                <DetailField label="Conversation" value={selected.conversationId} />
                <DetailField label="Channel" value={selected.channel} />
                <DetailField label="Mode" value={selected.mode} />
                <DetailField label="Intent" value={selected.intent} />
                <DetailField label="Model" value={selected.model} />
                <DetailField
                  label="Latency"
                  value={typeof selected.latencyMs === 'number' ? `${selected.latencyMs} ms` : null}
                />
                <DetailField label="Success" value={String(selected.success)} />
                <DetailField
                  label="Safety"
                  value={selected.safetyBlocked == null ? null : String(selected.safetyBlocked)}
                />
                <DetailField
                  label="Violations"
                  value={selected.violationCodes?.length ? selected.violationCodes.join(', ') : null}
                />
                <DetailField label="Error" value={selected.errorCode} />
                <DetailField label="Cart status" value={selected.cartPlanStatus} />
                <DetailField
                  label="Plan count"
                  value={typeof selected.planCount === 'number' ? String(selected.planCount) : null}
                />
                <DetailField label="Canary key" value={selected.canaryRoutingKey} />
                <DetailField
                  label="Canary bucket"
                  value={
                    typeof selected.canaryBucket === 'number' ? String(selected.canaryBucket) : null
                  }
                />
                <DetailField
                  label="Gate applied"
                  value={
                    selected.canaryGateApplied == null ? null : String(selected.canaryGateApplied)
                  }
                />
                <DetailField label="Gate reason" value={selected.canaryGateReason} />
                <DetailField label="Preview" value={selected.messagePreview} />
                <DetailField label="mutatedState" value="false" />
              </dl>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default AiAuditReviewPanel;
