import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { useOwnerTenantId } from '../../hooks/useOwnerTenantId';
import { EnvironmentConfig } from '../../config/environment';
import { fetchOwnerStorefront, updateOwnerStorefront } from '../../lib/ownerStorefrontApi';
import {
  MonitorSmartphone,
  ExternalLink,
  ShieldCheck,
  Wifi,
  Receipt,
  ChefHat,
  ShoppingBag,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Lock,
  Store,
} from 'lucide-react';
import toast from 'react-hot-toast';

export const OwnerPosPage: React.FC = () => {
  const { userProfile, loading: authLoading } = useAuth();
  const { tenantInfo, loading: tenantLoading } = useTenant();
  const contextTenantId = useOwnerTenantId();

  const [loading, setLoading] = useState(true);
  const [enabling, setEnabling] = useState(false);
  const [posEnabled, setPosEnabled] = useState(true);
  const [storefrontData, setStorefrontData] = useState<any>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<string>(contextTenantId || '');

  // Keep selectedTenantId in sync with active context
  useEffect(() => {
    if (contextTenantId) {
      setSelectedTenantId(contextTenantId);
    }
  }, [contextTenantId]);

  // Fetch tenant storefront settings to check POS feature provisioning
  useEffect(() => {
    let cancelled = false;
    const checkPosState = async () => {
      const activeId = selectedTenantId || contextTenantId || tenantInfo?.id;
      if (!activeId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const data = await fetchOwnerStorefront(activeId);
        if (cancelled) return;
        setStorefrontData(data);
        // Default to true if not explicitly set to false, matching backend POS availability
        const isEnabled = data?.features?.posEnabled !== false;
        setPosEnabled(isEnabled);
      } catch (err) {
        if (!cancelled) {
          // If storefront fetch fails, posEnabled defaults to true for authorized owners
          setPosEnabled(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void checkPosState();
    return () => {
      cancelled = true;
    };
  }, [selectedTenantId, contextTenantId, tenantInfo?.id]);

  const activeTenantId = selectedTenantId || contextTenantId || tenantInfo?.id || '';
  const restaurantName =
    storefrontData?.name || tenantInfo?.name || tenantInfo?.slug || activeTenantId;

  // Handle Enable POS provisioning
  const handleEnablePos = async () => {
    if (!activeTenantId) return;
    setEnabling(true);
    try {
      const existingFeatures = (storefrontData?.features || {}) as Record<string, unknown>;
      await updateOwnerStorefront(activeTenantId, {
        features: {
          ...existingFeatures,
          posEnabled: true,
        },
      });
      setPosEnabled(true);
      toast.success('Point of Sale (POS) enabled successfully for this restaurant');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to enable POS');
    } finally {
      setEnabling(false);
    }
  };

  // Launch POS Terminal with restaurant context
  const handleOpenPos = () => {
    if (!activeTenantId) {
      toast.error('No active restaurant context found');
      return;
    }
    const targetUrl = EnvironmentConfig.getPosUrl(activeTenantId);
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  // 1. Loading State
  if (authLoading || tenantLoading || loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6" aria-busy="true">
        <div className="h-8 w-64 bg-zinc-800 rounded-lg animate-pulse" />
        <div className="h-4 w-96 bg-zinc-800/60 rounded-md animate-pulse" />
        <div className="h-64 bg-zinc-900 border border-zinc-800 rounded-2xl animate-pulse" />
      </div>
    );
  }

  // 2. Permission Denied / No Restaurant Context State
  if (!activeTenantId) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">No Restaurant Context Available</h2>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">
            Your account is currently not assigned as an owner or staff member of any active
            restaurant. To use the Point of Sale terminal, please complete restaurant onboarding or
            request access from your kitchen owner.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <MonitorSmartphone className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Point of Sale (POS)</h1>
              <p className="text-xs text-zinc-400 font-medium">
                High-performance billing, offline order queue, and kitchen ticketing
              </p>
            </div>
          </div>
        </div>

        {/* Multi-tenant Switcher if owner owns multiple restaurants */}
        {userProfile?.ownedTenantIds && userProfile.ownedTenantIds.length > 1 && (
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl text-xs">
            <Store className="w-4 h-4 text-zinc-400" />
            <span className="text-zinc-400">Context:</span>
            <select
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
            >
              {userProfile.ownedTenantIds.map((id) => (
                <option key={id} value={id} className="bg-zinc-900 text-white">
                  {id === contextTenantId ? `${restaurantName} (${id})` : id}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Terminal Launch Card */}
      <div className="rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 p-8 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-zinc-800/80">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="text-lg font-bold text-white">{restaurantName}</span>
              <span className="text-xs font-mono text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-md">
                {activeTenantId}
              </span>
              {posEnabled ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Available
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Lock className="w-3.5 h-3.5" />
                  Requires Provisioning
                </span>
              )}
            </div>
            <p className="text-sm text-zinc-400 max-w-xl leading-relaxed">
              Launch the dedicated OrderBhojan POS terminal configured for {restaurantName}. Designed
              for tablets and counter stations with offline queueing, KOT printing, and walk-in sales.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="shrink-0 flex items-center gap-3">
            {posEnabled ? (
              <button
                type="button"
                onClick={handleOpenPos}
                className="min-h-[48px] px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-sm uppercase tracking-wide flex items-center gap-2.5 shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98]"
              >
                <span>Open POS Terminal</span>
                <ExternalLink className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleEnablePos}
                disabled={enabling}
                className="min-h-[48px] px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm uppercase tracking-wide flex items-center gap-2.5 shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50"
              >
                {enabling ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Provisioning...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Enable POS</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Security & Multi-Origin Sign-in Notice */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 flex items-start gap-3.5 text-xs text-zinc-400">
          <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-zinc-200">
              Cross-Origin Session Security & Server-Side Enforcement
            </div>
            <p className="leading-relaxed">
              The POS runs on the dedicated OrderBhojan terminal origin (
              <code className="text-zinc-300">orderbhojan.web.app/pos</code>). Never passes authentication
              tokens or credentials in the URL. If opening on a separate till or tablet, sign in with
              your registered BhojanOS owner or staff account to confirm server authorization.
            </p>
          </div>
        </div>
      </div>

      {/* POS Capabilities Overview */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
          Terminal Capabilities
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Wifi className="w-4 h-4" />
            </div>
            <div className="font-bold text-white text-sm">Offline-First Durability</div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Local IndexedDB command queue survives network outages. Orders drain safely when
              reconnected with fenced lease guarantees.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <ChefHat className="w-4 h-4" />
            </div>
            <div className="font-bold text-white text-sm">Live KOT Kitchen Display</div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Real-time kitchen order tickets, order timers, and item preparation tracking for kitchen
              staff.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div className="font-bold text-white text-sm">Walk-In & Counter Billing</div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Instant menu item lookup, custom modifications, dynamic UPI QR generation, and split
              payment recording.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <div className="font-bold text-white text-sm">Thermal Receipts & EOD</div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              58mm/80mm ESC/POS compatible thermal printing, cash drawer reconciliation, and
              end-of-day register closure.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerPosPage;
