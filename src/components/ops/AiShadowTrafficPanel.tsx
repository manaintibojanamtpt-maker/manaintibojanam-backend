import React, { useCallback, useEffect, useState } from 'react';
import { Filter, GitCompare, Loader2, RefreshCcw, Sparkles } from 'lucide-react';
import {
  OPS_UNAVAILABLE,
  fetchAiShadowSamples,
  replayAiShadowTraffic,
  type AiOpsSummary,
  type AiShadowReplayReport,
  type AiShadowSampleRecord,
} from '../../lib/opsHealthApi';

function fmtTime(iso: string | undefined): string {
  if (!iso) return OPS_UNAVAILABLE;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function truncatePreview(text: string | undefined, max = 48): string {
  if (!text) return '—';
  return text.length <= max ? text : `${text.slice(0, max)}…`;
}

function StatusPill({ status }: { status: AiShadowReplayReport['results'][number]['status'] }) {
  const styles: Record<string, string> = {
    passed:
      'bg-green-100 text-green-800 border-green-200 dark:bg-green-500/20 dark:text-green-300 dark:border-green-500/30',
    failed:
      'bg-red-100 text-red-800 border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30',
    drifted:
      'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30',
  };
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status] ?? 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-white/5 dark:text-gray-300 dark:border-white/10'}`}
    >
      {status}
    </span>
  );
}

interface AiShadowTrafficPanelProps {
  readonly summary?: AiOpsSummary | null;
}

/**
 * Phase 24 — read-only shadow traffic validation for SystemHealth.
 * Lists captured samples and runs replay comparison. No flag toggles.
 */
export function AiShadowTrafficPanel({ summary }: AiShadowTrafficPanelProps) {
  const [loading, setLoading] = useState(false);
  const [replaying, setReplaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replayError, setReplayError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [samples, setSamples] = useState<AiShadowSampleRecord[]>([]);
  const [report, setReport] = useState<AiShadowReplayReport | null>(null);
  const [loadedOnce, setLoadedOnce] = useState(false);

  const loadSamples = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAiShadowSamples(50);
      if (!result) {
        setSamples([]);
        setCount(null);
        setEnabled(null);
        setError('Shadow samples unavailable');
        return;
      }
      setEnabled(result.enabled);
      if (!result.success) {
        setSamples([]);
        setCount(0);
        setError(result.error || 'Failed to load shadow samples');
        return;
      }
      setSamples(result.samples);
      setCount(result.count);
      setLoadedOnce(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSamples();
  }, [loadSamples]);

  const runReplay = useCallback(async () => {
    setReplaying(true);
    setReplayError(null);
    try {
      const result = await replayAiShadowTraffic({ limit: 50 });
      if (!result) {
        setReport(null);
        setReplayError('Shadow replay unavailable');
        return;
      }
      if (!result.success) {
        setReport(null);
        setReplayError(result.error || 'Shadow replay failed');
        return;
      }
      setReport(result.report ?? null);
    } finally {
      setReplaying(false);
    }
  }, []);

  const shadowEnabledHint =
    enabled === true
      ? 'Shadow capture ON'
      : enabled === false
        ? 'Shadow capture OFF'
        : OPS_UNAVAILABLE;

  const categoryRows = report
    ? Object.entries(report.byCategory ?? {}).sort((a, b) => b[1].total - a[1].total)
    : [];

  return (
    <section
      id="section-ai-shadow-traffic"
      data-testid="ai-shadow-traffic-panel"
      className="bg-white dark:bg-[#111111] rounded-xl border border-gray-200 dark:border-white/5 shadow-sm overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-gray-200 dark:border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2 dark:text-white">
            <Sparkles className="w-5 h-5 text-gray-500 dark:text-gray-400" /> AI Shadow Traffic
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Read-only shadow sample review and replay comparison. Does not change gateway or canary flags.
          </p>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-1 text-xs text-gray-400">
          <span data-testid="ai-shadow-enabled-hint">{shadowEnabledHint}</span>
          <span>
            Samples: {count == null ? OPS_UNAVAILABLE : count} · mutatedState=
            {String(summary?.mutatedState ?? false)}
          </span>
        </div>
      </div>

      <div className="p-6 space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void loadSamples()}
            disabled={loading}
            data-testid="ai-shadow-refresh"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCcw className="w-3.5 h-3.5" />
            )}
            Refresh samples
          </button>
          <button
            type="button"
            onClick={() => void runReplay()}
            disabled={replaying || loading}
            data-testid="ai-shadow-replay"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded bg-gray-900 text-white dark:bg-white dark:text-gray-900 disabled:opacity-50"
          >
            {replaying ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <GitCompare className="w-3.5 h-3.5" />
            )}
            Run shadow compare
          </button>
          <span className="text-[11px] text-gray-400 flex items-center gap-1">
            <Filter className="w-3 h-3" /> No mutations · review only
          </span>
        </div>

        {error && (
          <p className="text-sm text-amber-700 dark:text-amber-300" data-testid="ai-shadow-error">
            {error}
            {enabled === false ? ' Enable AI shadow capture on the server to collect samples.' : ''}
          </p>
        )}

        {replayError && (
          <p
            className="text-sm text-amber-700 dark:text-amber-300"
            data-testid="ai-shadow-replay-error"
          >
            {replayError}
          </p>
        )}

        {report && (
          <div
            className="rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.03] p-4 space-y-4"
            data-testid="ai-shadow-replay-report"
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white tabular-nums">
                  {report.total}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Passed</p>
                <p className="text-lg font-semibold text-green-600 dark:text-green-400 tabular-nums">
                  {report.passed}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Failed</p>
                <p className="text-lg font-semibold text-red-600 dark:text-red-400 tabular-nums">
                  {report.failed}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Drifted</p>
                <p className="text-lg font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
                  {report.drifted}
                </p>
              </div>
            </div>

            {categoryRows.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  By category
                </p>
                <div className="overflow-x-auto rounded border border-gray-200 dark:border-white/10">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-100 dark:bg-[#0A0A0A] text-gray-500 dark:text-gray-400">
                      <tr>
                        <th className="px-3 py-2 font-medium">Category</th>
                        <th className="px-3 py-2 font-medium text-right">Total</th>
                        <th className="px-3 py-2 font-medium text-right">Passed</th>
                        <th className="px-3 py-2 font-medium text-right">Failed</th>
                        <th className="px-3 py-2 font-medium text-right">Drifted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryRows.map(([category, stats]) => (
                        <tr
                          key={category}
                          className="border-t border-gray-200 dark:border-white/5"
                          data-testid="ai-shadow-category-row"
                        >
                          <td className="px-3 py-2 font-mono text-gray-900 dark:text-white">
                            {category}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">{stats.total}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-green-600 dark:text-green-400">
                            {stats.passed}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-red-600 dark:text-red-400">
                            {stats.failed}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-amber-600 dark:text-amber-400">
                            {stats.drifted}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {report.results.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Replay results
                </p>
                <div className="overflow-x-auto rounded border border-gray-200 dark:border-white/10 max-h-48 overflow-y-auto">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-gray-100 dark:bg-[#0A0A0A] text-gray-500 dark:text-gray-400 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 font-medium">Sample</th>
                        <th className="px-3 py-2 font-medium">Type</th>
                        <th className="px-3 py-2 font-medium">Category</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                        <th className="px-3 py-2 font-medium">Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.results.map((row) => (
                        <tr
                          key={row.sampleId}
                          className="border-t border-gray-200 dark:border-white/5"
                          data-testid="ai-shadow-replay-row"
                        >
                          <td className="px-3 py-2 font-mono text-gray-700 dark:text-gray-300">
                            {row.sampleId.slice(0, 12)}
                            {row.sampleId.length > 12 ? '…' : ''}
                          </td>
                          <td className="px-3 py-2 font-mono">{row.eventType || '—'}</td>
                          <td className="px-3 py-2">{row.category || '—'}</td>
                          <td className="px-3 py-2">
                            <StatusPill status={row.status} />
                          </td>
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-400 max-w-[14rem] truncate">
                            {row.message || row.driftFields?.join(', ') || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-white/10">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 dark:bg-[#0A0A0A] text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-white/5">
              <tr>
                <th className="px-3 py-2 font-medium">Captured</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Mode</th>
                <th className="px-3 py-2 font-medium">Channel</th>
                <th className="px-3 py-2 font-medium">Preview</th>
              </tr>
            </thead>
            <tbody>
              {samples.length === 0 && loadedOnce && !loading && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-gray-400 text-sm">
                    No shadow samples captured yet.
                  </td>
                </tr>
              )}
              {samples.map((sample) => (
                <tr
                  key={sample.id}
                  data-testid="ai-shadow-sample-row"
                  className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                >
                  <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
                    {fmtTime(sample.capturedAt)}
                  </td>
                  <td className="px-3 py-2 text-xs font-mono text-gray-900 dark:text-white">
                    {sample.eventType}
                  </td>
                  <td className="px-3 py-2 text-xs">{sample.mode || '—'}</td>
                  <td className="px-3 py-2 text-xs">{sample.channel || '—'}</td>
                  <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400 max-w-[16rem] truncate">
                    {truncatePreview(sample.messagePreview)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default AiShadowTrafficPanel;
