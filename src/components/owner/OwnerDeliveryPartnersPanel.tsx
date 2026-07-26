import React, { useCallback, useEffect, useState } from 'react';
import { Link2, Loader2, PlugZap, RefreshCw, ShieldAlert, Unplug } from 'lucide-react';
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
  quote: 'Quote',
  create_dispatch: 'Create dispatch',
  tracking: 'Tracking',
  cancel: 'Cancel',
  webhook: 'Webhook',
};

function statusColor(status: string): string {
  switch (status) {
    case 'connected':
      return 'text-emerald-400';
    case 'pending':
      return 'text-amber-300';
    case 'error':
      return 'text-red-400';
    default:
      return 'text-white/50';
  }
}

export function OwnerDeliveryPartnersPanel({ tenantId }: { tenantId: string }) {
  const [loading, setLoading] = useState(true);
  const [busyProvider, setBusyProvider] = useState<DeliveryProviderId | null>(null);
  const [providers, setProviders] = useState<DeliveryProviderCapabilityRow[]>([]);
  const [connections, setConnections] = useState<DeliveryProviderConnectionPublic[]>([]);
  const [securityNote, setSecurityNote] = useState('');
  const [draftCreds, setDraftCreds] = useState<Record<string, Record<string, string>>>({});

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchTenantDeliveryIntegrations(tenantId);
      setProviders(data.providers.filter((p) => p.id !== 'self_pickup'));
      setConnections(data.connections);
      setSecurityNote(data.securityNote);
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
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Delivery Partners</h2>
        <p className="text-sm text-white/50 mt-1">
          Connect each kitchen’s own Porter / Uber Direct / Rapido account. Dispatch still supports
          manual tracking links until a provider is live.
        </p>
      </div>

      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 flex gap-2">
        <ShieldAlert size={18} className="shrink-0 mt-0.5" />
        <p>
          {securityNote ||
            'Raw credentials are never stored in the browser or on the public tenant document. Secrets are encrypted server-side only.'}
        </p>
      </div>

      <div className="space-y-4">
        {providers.map((provider) => {
          const conn = connectionFor(provider.id);
          const status = conn?.status || 'disconnected';
          const busy = busyProvider === provider.id;
          const fields = provider.requiredCredentialFields;

          return (
            <div
              key={provider.id}
              className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3"
              data-testid={`delivery-partner-${provider.id}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-white">{provider.displayName}</h3>
                  <p className={`text-xs mt-0.5 ${statusColor(status)}`}>
                    Status: {status}
                    {conn?.lastValidatedAt
                      ? ` · validated ${new Date(conn.lastValidatedAt).toLocaleString()}`
                      : ''}
                  </p>
                  <p className="text-xs text-white/45 mt-2 max-w-xl">{provider.externalAccessNote}</p>
                  {provider.docsUrl ? (
                    <a
                      href={provider.docsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-[#FF6B00] underline mt-1 inline-block"
                    >
                      Provider docs
                    </a>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {provider.capabilities.map((cap) => (
                    <span
                      key={cap}
                      className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-full bg-white/5 border border-white/10 text-white/70"
                    >
                      {CAPABILITY_LABELS[cap] || cap}
                    </span>
                  ))}
                  {provider.capabilities.length === 0 ? (
                    <span className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-full bg-white/5 border border-white/10 text-white/50">
                      Manual only
                    </span>
                  ) : null}
                </div>
              </div>

              {conn?.errorMessage ? (
                <p className="text-xs text-red-300">{conn.errorMessage}</p>
              ) : null}

              {fields.length > 0 && status !== 'connected' ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {fields.map((field) => (
                    <label key={field} className="text-xs text-white/60 space-y-1">
                      <span>{field}</span>
                      <input
                        type={field.toLowerCase().includes('secret') || field === 'apiKey' ? 'password' : 'text'}
                        autoComplete="off"
                        className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
                        value={draftCreds[provider.id]?.[field] || ''}
                        onChange={(e) =>
                          setDraftCreds((prev) => ({
                            ...prev,
                            [provider.id]: {
                              ...(prev[provider.id] || {}),
                              [field]: e.target.value,
                            },
                          }))
                        }
                        placeholder={`Enter ${field}`}
                      />
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
                          await completeDeliveryConnection(tenantId, provider.id, {});
                          toast.success(`${provider.displayName} marked ready (manual)`);
                          return;
                        }
                        const credentials = draftCreds[provider.id] || {};
                        await completeDeliveryConnection(tenantId, provider.id, { credentials });
                        toast.success(`${provider.displayName} connection saved`);
                        setDraftCreds((prev) => ({ ...prev, [provider.id]: {} }));
                      })
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF6B00] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {busy ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
                    Connect
                  </button>
                ) : null}

                {status === 'connected' || status === 'pending' || status === 'error' ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void run(provider.id, async () => {
                        await validateDeliveryConnection(tenantId, provider.id);
                        toast.success('Connection tested');
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
