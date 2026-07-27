import React, { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Link2, Loader2, PlugZap, RefreshCw, ShieldCheck, Unplug } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  completeDeliveryConnection,
  fetchTenantDeliveryIntegrations,
  revokeDeliveryConnection,
  startDeliveryConnection,
  validateDeliveryConnection,
  type DeliveryProviderCapabilityRow,
  type DeliveryProviderConnectionPublic,
  type DeliveryProviderId,
} from '../../lib/ownerDeliveryIntegrationsApi';

const CAPABILITY_LABELS: Record<string, string> = {
  quote: 'Price quote',
  create_dispatch: 'Auto booking',
  tracking: 'Live tracking',
  cancel: 'Cancel trip',
  webhook: 'Status updates',
};

function merchantBadge(
  provider: DeliveryProviderCapabilityRow,
  conn?: DeliveryProviderConnectionPublic,
): { label: string; className: string } {
  const status = conn?.status || 'disconnected';
  if (
    provider.partnerApprovalRequired ||
    provider.maturity === 'partner_access_required'
  ) {
    if (status === 'error') {
      return {
        label: 'Needs action — reconnect',
        className: 'bg-red-500/15 text-red-200 border-red-500/30',
      };
    }
    if (status === 'pending' || status === 'connected') {
      return {
        label: 'Pending partner approval',
        className: 'bg-amber-500/15 text-amber-200 border-amber-500/30',
      };
    }
    return {
      label: 'Partner approval required',
      className: 'bg-amber-500/15 text-amber-200 border-amber-500/30',
    };
  }
  if (provider.connectionType === 'manual_only') {
    return {
      label: status === 'connected' ? 'Manual tracking ready' : 'Manual tracking only',
      className: 'bg-sky-500/15 text-sky-200 border-sky-500/30',
    };
  }
  if (status === 'connected') {
    const validatedAt = conn?.lastValidatedAt ? Date.parse(conn.lastValidatedAt) : NaN;
    const stale =
      Number.isFinite(validatedAt) && Date.now() - validatedAt > 1000 * 60 * 60 * 24 * 14;
    if (stale) {
      return {
        label: 'Connected — re-test recommended',
        className: 'bg-amber-500/15 text-amber-200 border-amber-500/30',
      };
    }
    return { label: 'Connected', className: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30' };
  }
  if (status === 'pending') {
    return {
      label: 'Pending verification',
      className: 'bg-amber-500/15 text-amber-200 border-amber-500/30',
    };
  }
  if (status === 'error') {
    return {
      label: 'Needs action — reconnect',
      className: 'bg-red-500/15 text-red-200 border-red-500/30',
    };
  }
  return { label: 'Not connected', className: 'bg-white/5 text-white/60 border-white/10' };
}

export function OwnerDeliveryPartnersPanel({ tenantId }: { tenantId: string }) {
  const [loading, setLoading] = useState(true);
  const [busyProvider, setBusyProvider] = useState<DeliveryProviderId | null>(null);
  const [providers, setProviders] = useState<DeliveryProviderCapabilityRow[]>([]);
  const [connections, setConnections] = useState<DeliveryProviderConnectionPublic[]>([]);
  const [draftCreds, setDraftCreds] = useState<Record<string, Record<string, string>>>({});

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchTenantDeliveryIntegrations(tenantId);
      setProviders(data.providers.filter((p) => p.id !== 'self_pickup'));
      setConnections(data.connections);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load delivery partners');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const connectionFor = (provider: DeliveryProviderId) =>
    connections.find((c) => c.provider === provider);

  const run = async (provider: DeliveryProviderId, fn: () => Promise<void>) => {
    setBusyProvider(provider);
    try {
      await fn();
      await reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Action failed');
    } finally {
      setBusyProvider(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center gap-2 text-white/60">
        <Loader2 className="animate-spin" size={18} /> Loading delivery partners…
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6" data-testid="owner-delivery-partners-panel">
      <div>
        <h2 className="text-xl font-bold text-white">Delivery Partners</h2>
        <p className="text-sm text-white/55 mt-1 leading-relaxed">
          Connect <span className="text-white/80">your kitchen’s own</span> Uber Direct / Porter /
          Rapido account for dispatch. Until a partner is live, you can still paste a tracking link
          on each order.
        </p>
      </div>

      <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-50 flex gap-2">
        <ShieldCheck size={18} className="shrink-0 mt-0.5" />
        <p>
          BhojanOS never keeps raw passwords in your browser. Secrets are encrypted on the server
          only. You can disconnect anytime.
        </p>
      </div>

      <div className="space-y-4">
        {providers.map((provider) => {
          const conn = connectionFor(provider.id);
          const status = conn?.status || 'disconnected';
          const busy = busyProvider === provider.id;
          const badge = merchantBadge(provider, conn);
          const fieldHelp = provider.credentialFieldHelp ?? [];
          const steps = provider.onboardingSteps ?? [];

          return (
            <div
              key={provider.id}
              className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3"
              data-testid={`delivery-partner-${provider.id}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-white">{provider.displayName}</h3>
                    <span
                      className={`text-[10px] uppercase tracking-wide px-2 py-1 rounded-full border ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <p className="text-sm text-white/55 mt-2 max-w-xl">
                    {provider.merchantSummary || provider.externalAccessNote}
                  </p>
                  {provider.statusBadgeHint ? (
                    <p className="text-xs text-white/40 mt-1">{provider.statusBadgeHint}</p>
                  ) : null}
                  {provider.liveReadinessNote ? (
                    <p className="text-xs text-amber-100/70 mt-1 leading-relaxed">
                      {provider.liveReadinessNote}
                    </p>
                  ) : null}
                  {provider.partnerApprovalRequired ? (
                    <p className="text-xs text-white/50 mt-1">
                      Manual tracking fallback stays available on Orders → Dispatch even while
                      approval is pending.
                    </p>
                  ) : null}
                  {provider.merchantSetupUrl ? (
                    <a
                      href={provider.merchantSetupUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-[#FF6B00] underline mt-2"
                    >
                      Open {provider.displayName} dashboard <ExternalLink size={12} />
                    </a>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-1.5 justify-end">
                  {provider.capabilities.map((cap) => (
                    <span
                      key={cap}
                      className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-full bg-white/5 border border-white/10 text-white/70"
                    >
                      {CAPABILITY_LABELS[cap] || cap}
                    </span>
                  ))}
                </div>
              </div>

              {steps.length > 0 && status !== 'connected' ? (
                <ol className="space-y-2 rounded-lg border border-white/10 bg-black/30 p-3">
                  {steps.map((step) => (
                    <li key={step.step} className="text-sm text-white/70">
                      <span className="text-[#FF6B00] font-semibold mr-2">Step {step.step}.</span>
                      <span className="text-white font-medium">{step.title}</span>
                      <p className="text-xs text-white/45 mt-0.5 ml-0 sm:ml-12">{step.body}</p>
                    </li>
                  ))}
                </ol>
              ) : null}

              {conn?.errorMessage ? (
                <p className="text-xs text-red-300" role="alert">
                  {conn.errorMessage}
                </p>
              ) : null}

              {fieldHelp.length > 0 && status !== 'connected' ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {fieldHelp.map((field) => (
                    <label key={field.key} className="text-xs text-white/70 space-y-1.5 block">
                      <span className="font-medium text-white/85">{field.label}</span>
                      <input
                        type={
                          field.key.toLowerCase().includes('secret') || field.key === 'apiKey'
                            ? 'password'
                            : 'text'
                        }
                        autoComplete="off"
                        className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                        value={draftCreds[provider.id]?.[field.key] || ''}
                        onChange={(e) =>
                          setDraftCreds((prev) => ({
                            ...prev,
                            [provider.id]: {
                              ...(prev[provider.id] || {}),
                              [field.key]: e.target.value,
                            },
                          }))
                        }
                        placeholder={field.placeholder}
                      />
                      <span className="block text-[11px] text-white/40 leading-relaxed">
                        {field.helpText}{' '}
                        {field.findItUrl ? (
                          <a
                            href={field.findItUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#FF6B00] underline"
                          >
                            {field.findItLabel}
                          </a>
                        ) : (
                          <span className="text-white/50">{field.findItLabel}</span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2 pt-1">
                {status === 'disconnected' || status === 'error' ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void run(provider.id, async () => {
                        await startDeliveryConnection(tenantId, provider.id);
                        if (provider.connectionType === 'manual_only') {
                          const result = await completeDeliveryConnection(tenantId, provider.id, {});
                          if (result.connection.status === 'connected') {
                            toast.success(`${provider.displayName} enabled for manual tracking`);
                          } else {
                            toast.error(result.connection.errorMessage || 'Could not enable partner');
                          }
                          return;
                        }
                        const credentials = draftCreds[provider.id] || {};
                        for (const field of provider.requiredCredentialFields) {
                          if (!credentials[field]?.trim()) {
                            const label =
                              fieldHelp.find((f) => f.key === field)?.label || field;
                            throw new Error(`Please enter ${label} before connecting.`);
                          }
                        }
                        const result = await completeDeliveryConnection(tenantId, provider.id, {
                          credentials,
                        });
                        if (result.connection.status === 'connected') {
                          toast.success(`${provider.displayName} connected`);
                          setDraftCreds((prev) => ({ ...prev, [provider.id]: {} }));
                        } else {
                          toast.error(
                            result.connection.errorMessage ||
                              'Connection saved with errors — check the values and test again.',
                          );
                        }
                      })
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF6B00] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {busy ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
                    {provider.connectionType === 'manual_only'
                      ? 'Enable manual tracking'
                      : status === 'error'
                        ? 'Reconnect'
                        : 'Connect'}
                  </button>
                ) : null}

                {status === 'connected' || status === 'pending' || status === 'error' ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void run(provider.id, async () => {
                        const result = await validateDeliveryConnection(tenantId, provider.id);
                        const readinessMsg = result.readiness?.merchantMessage;
                        if (result.connection.status === 'connected') {
                          toast.success(readinessMsg || 'Connection looks good');
                        } else if (result.connection.status === 'pending') {
                          toast.success(
                            readinessMsg ||
                              'Saved — live booking still needs partner/platform approval. Manual tracking stays available.',
                          );
                        } else {
                          toast.error(
                            result.connection.errorMessage ||
                              readinessMsg ||
                              'Test failed — re-check credentials or partner approval.',
                          );
                        }
                      })
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs text-white/80 disabled:opacity-50"
                  >
                    {busy ? <Loader2 size={14} className="animate-spin" /> : <PlugZap size={14} />}
                    Test connection
                  </button>
                ) : null}

                {status === 'connected' || status === 'error' || status === 'pending' ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void run(provider.id, async () => {
                        await revokeDeliveryConnection(tenantId, provider.id);
                        toast.success(`${provider.displayName} disconnected`);
                      })
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-2 text-xs text-red-300 disabled:opacity-50"
                  >
                    {busy ? <Loader2 size={14} className="animate-spin" /> : <Unplug size={14} />}
                    Disconnect
                  </button>
                ) : null}

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void reload()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-white/50"
                >
                  <RefreshCw size={14} /> Refresh
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
