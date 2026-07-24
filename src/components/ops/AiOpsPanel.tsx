import React from 'react';
import { Bot, Shield, Activity } from 'lucide-react';
import { OPS_UNAVAILABLE, type AiOpsSummary, type AiOpsWindowSummary } from '../../lib/opsHealthApi';

function fmtLatency(ms: number | null | undefined): string {
  if (ms == null) return OPS_UNAVAILABLE;
  return `${ms} ms`;
}

function WindowStats({
  title,
  window,
}: {
  title: string;
  window: AiOpsWindowSummary | undefined;
}) {
  if (!window) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] p-3">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{title}</p>
        <p className="text-sm text-gray-400">{OPS_UNAVAILABLE}</p>
      </div>
    );
  }

  const total = window.totalEvents;
  return (
    <div className="rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] p-3">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{title}</p>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <dt className="text-gray-500 dark:text-gray-400">Events</dt>
        <dd className="text-right font-medium text-gray-900 dark:text-white">{total}</dd>
        <dt className="text-gray-500 dark:text-gray-400">Success</dt>
        <dd className="text-right font-medium text-green-600 dark:text-green-400">{window.successCount}</dd>
        <dt className="text-gray-500 dark:text-gray-400">Failure</dt>
        <dd className="text-right font-medium text-red-600 dark:text-red-400">{window.failureCount}</dd>
        <dt className="text-gray-500 dark:text-gray-400">Safety blocked</dt>
        <dd className="text-right font-medium text-amber-600 dark:text-amber-400">
          {window.safetyBlockedCount ?? 0}
        </dd>
        <dt className="text-gray-500 dark:text-gray-400">p50 / p95</dt>
        <dd className="text-right font-medium text-gray-900 dark:text-white">
          {fmtLatency(window.latency?.p50Ms)} / {fmtLatency(window.latency?.p95Ms)}
        </dd>
      </dl>
      {total === 0 && (
        <p className="mt-2 text-[11px] text-gray-400">No AI traffic in this window (gateway may be OFF).</p>
      )}
    </div>
  );
}

interface AiOpsPanelProps {
  readonly summary: AiOpsSummary | null;
  readonly loading?: boolean;
}

/**
 * Phase 12 — read-only AI gateway / canary panel for SystemHealth.
 * No stage controls, no flag toggles, no assist wiring.
 */
export function AiOpsPanel({ summary, loading }: AiOpsPanelProps) {
  const gateway = summary?.gateway;
  const rollout = summary?.rollout;
  const obs = summary?.observability;

  return (
    <section
      id="section-ai-ops"
      data-testid="ai-ops-panel"
      className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-white/5 shadow-sm overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-gray-200 dark:border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2 dark:text-white">
            <Bot className="w-5 h-5 text-gray-500 dark:text-gray-400" /> AI Gateway
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Read-only observability and canary policy status. Does not enable traffic.
          </p>
        </div>
        {loading && (
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 animate-pulse" /> Updating…
          </span>
        )}
      </div>

      <div className="p-6 space-y-5">
        {!summary && !loading && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            AI ops summary {OPS_UNAVAILABLE}. Confirm superadmin session and `/api/ops/ai/summary`.
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-lg border border-gray-200 dark:border-white/10 p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Gateway</p>
            <p className="text-sm font-semibold dark:text-white">
              {gateway
                ? gateway.enabled
                  ? gateway.ready
                    ? 'Ready'
                    : 'Enabled (not ready)'
                  : 'OFF'
                : OPS_UNAVAILABLE}
            </p>
            <p className="text-xs text-gray-400 mt-1 truncate">
              {gateway?.model || 'Model unset'}
              {gateway && !gateway.configured ? ' · key missing' : ''}
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-white/10 p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" /> Canary policy
            </p>
            <p className="text-sm font-semibold dark:text-white">
              {rollout ? rollout.label : OPS_UNAVAILABLE}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {rollout
                ? `Flag ${rollout.canaryFlagEnabled ? 'ON' : 'OFF'} · wired ${rollout.wiredIntoAssist ? 'YES' : 'NO'} · health ${rollout.healthOk ? 'OK' : 'GATE'}`
                : 'No rollout snapshot'}
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 dark:border-white/10 p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Persistence</p>
            <p className="text-sm font-semibold dark:text-white">
              {summary?.auditPersistence?.enabled
                ? 'Durable + in-process'
                : obs?.persistence === 'in_process'
                  ? 'In-process buffer'
                  : OPS_UNAVAILABLE}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {summary?.auditPersistence?.enabled
                ? `${summary.auditPersistence.collection} · review below`
                : 'Clears on process restart'}{' '}
              · mutatedState={String(summary?.mutatedState ?? false)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <WindowStats title="Process lifetime" window={obs?.process} />
          <WindowStats title="Last 1 hour" window={obs?.last1h} />
          <WindowStats title="Last 24 hours" window={obs?.last24h} />
        </div>

        {rollout?.liveRolloutGatesEnabled && (
          <div
            data-testid="ai-live-rollout-gates"
            className="rounded-lg border border-gray-200 dark:border-white/10 p-4 space-y-3"
          >
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Live canary gates (advisory — no auto-promote)
            </p>
            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Promotion</dt>
                <dd className="font-medium dark:text-white mt-0.5">
                  {rollout.promotion?.allowed ? 'Cleared' : 'Blocked'}
                </dd>
                <dd className="text-gray-400 mt-0.5 break-words">
                  {rollout.promotion?.reason ?? OPS_UNAVAILABLE}
                  {rollout.nextStage != null ? ` → stage ${rollout.nextStage}` : ''}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Halt</dt>
                <dd className="font-medium dark:text-white mt-0.5">
                  {rollout.halt?.haltRecommended ? 'Recommended' : 'Clear'}
                </dd>
                <dd className="text-gray-400 mt-0.5 break-words">
                  {rollout.halt?.reason ?? OPS_UNAVAILABLE}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 dark:text-gray-400">Rollback</dt>
                <dd className="font-medium dark:text-white mt-0.5">
                  {rollout.rollback?.required ? 'Required' : 'Clear'}
                </dd>
                <dd className="text-gray-400 mt-0.5 break-words">
                  {rollout.rollback?.reason ?? OPS_UNAVAILABLE}
                  {rollout.rollback?.required
                    ? ` → stage ${rollout.rollback.recommendedStage}`
                    : ''}
                </dd>
              </div>
            </dl>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-gray-400">
              <p>
                Golden: {rollout.prechecks?.golden.status ?? OPS_UNAVAILABLE}
                {rollout.prechecks?.golden.reason
                  ? ` — ${rollout.prechecks.golden.reason}`
                  : ''}
              </p>
              <p>
                Shadow: {rollout.prechecks?.shadow.status ?? OPS_UNAVAILABLE}
                {rollout.prechecks?.shadow.reason
                  ? ` — ${rollout.prechecks.shadow.reason}`
                  : ''}
              </p>
            </div>
            {rollout.promotion?.blockers && rollout.promotion.blockers.length > 0 && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 break-words">
                Blockers: {rollout.promotion.blockers.join(', ')}
              </p>
            )}
            {rollout.advancement && (
              <p className="text-[11px] text-gray-400 break-words">
                Advancement: autoPromote={String(rollout.advancement.autoPromote)} · approval{' '}
                {rollout.advancement.manualApprovalGranted ? 'granted' : 'required'} · stageSetAt{' '}
                {rollout.advancement.stageSetAt ?? 'unset'} · {rollout.advancement.method}
              </p>
            )}
          </div>
        )}

        {rollout?.note && (
          <p className="text-[11px] text-gray-400 border-t border-gray-100 dark:border-white/5 pt-3">
            {rollout.note}
          </p>
        )}
      </div>
    </section>
  );
}

export default AiOpsPanel;
