import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Rocket, AlertTriangle, CheckCircle2, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTenant } from '../../context/TenantContext';
import { publishOwnerStorefrontViaApi, warmOwnerApi } from '../../lib/ownerProvisioning';
import { EnvironmentConfig } from '../../config/environment';

export const PublishStorefrontPanel: React.FC = () => {
  const { tenantId, tenantInfo, refreshTenant } = useTenant();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const slug = tenantInfo?.slug || tenantId || '';
  const isPublished = tenantInfo?.storeStatus === 'published';
  const orderBhojanUrl = useMemo(
    () => (slug ? EnvironmentConfig.getOrderBhojanRestaurantUrl(slug) : ''),
    [slug],
  );
  const legacyStoreUrl = useMemo(
    () => (slug ? EnvironmentConfig.getLegacyBhojanOSStorefrontUrl(slug) : ''),
    [slug],
  );

  useEffect(() => {
    if (!isPublished && tenantId) {
      void warmOwnerApi();
    }
  }, [isPublished, tenantId]);

  const handlePublish = async () => {
    if (!tenantId) {
      toast.error('Kitchen not loaded yet.');
      return;
    }
    setLoading(true);
    setErrors([]);
    try {
      const result = await publishOwnerStorefrontViaApi(tenantId);
      if (!result.success) {
        setErrors(result.validationErrors ?? ['Publish failed. Complete setup checklist first.']);
        toast.error('Kitchen is not ready to publish on OrderBhojan.');
        return;
      }
      toast.success(`Published on OrderBhojan as "${slug}"`);
      await refreshTenant();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Publish failed';
      setErrors([message]);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (isPublished) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="text-emerald-400 shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-sm font-bold text-emerald-300">Live on OrderBhojan</p>
            <p className="mt-1 text-xs text-emerald-100/80">
              Kitchen <span className="font-mono text-emerald-200">{slug}</span> is published.
              Customers discover it on OrderBhojan home and nearby search when your location is set.
            </p>
            {orderBhojanUrl ? (
              <a
                href={orderBhojanUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-300 underline"
              >
                View on OrderBhojan
                <ExternalLink size={12} />
              </a>
            ) : null}
            {legacyStoreUrl ? (
              <a
                href={legacyStoreUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block text-xs text-emerald-100/60 underline"
              >
                Legacy BhojanOS storefront (/k/{slug})
              </a>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-orange-500/30 bg-gradient-to-br from-orange-500/15 to-[#0A0A0A] p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-orange-300/80">OrderBhojan</p>
          <h3 className="text-lg font-black text-white mt-1">Publish to marketplace</h3>
          <p className="mt-1 text-sm text-white/60 max-w-xl">
            Make <span className="font-mono text-white/80">{slug || 'your kitchen'}</span> discoverable on
            OrderBhojan home, nearby, and restaurant pages. Requires location, store hours, menu items, and delivery fees.
          </p>
        </div>
        <button
          type="button"
          disabled={loading || !tenantId}
          onClick={() => void handlePublish()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-50 shadow-lg shadow-orange-500/20"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
          {loading ? 'Publishing…' : 'Publish Now'}
        </button>
      </div>
      {loading ? (
        <p className="mt-3 text-xs text-white/50">
          Waking backend and validating your kitchen — this can take up to a minute on first publish.
        </p>
      ) : null}

      {errors.length > 0 ? (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
            <ul className="text-xs text-red-100/90 space-y-1 list-disc pl-4">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default PublishStorefrontPanel;
