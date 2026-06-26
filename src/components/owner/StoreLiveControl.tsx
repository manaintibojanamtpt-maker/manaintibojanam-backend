import React, { useEffect, useState } from 'react';
import { Clock, Power, Store } from 'lucide-react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { getDb } from '../../lib/firebase-db';
import { useTenant } from '../../context/TenantContext';
import { DEFAULT_STORE_OPERATIONS, TenantStoreOperations } from '../../lib/tenantStoreOperations';

interface StoreLiveControlProps {
  variant?: 'compact' | 'full';
}

export const StoreLiveControl: React.FC<StoreLiveControlProps> = ({ variant = 'compact' }) => {
  const { tenantId, tenantInfo } = useTenant();
  const [saving, setSaving] = useState(false);
  const [ops, setOps] = useState<TenantStoreOperations>({
    ...DEFAULT_STORE_OPERATIONS,
  });

  useEffect(() => {
    const current = tenantInfo?.storeOperations;
    if (current) {
      setOps({
        isStoreOpen: current.isStoreOpen !== false,
        businessHoursEnabled: current.businessHoursEnabled === true,
        openTime: current.openTime || DEFAULT_STORE_OPERATIONS.openTime,
        closeTime: current.closeTime || DEFAULT_STORE_OPERATIONS.closeTime,
        offlineMessage: current.offlineMessage || '',
      });
    }
  }, [tenantInfo?.storeOperations]);

  const persistOperations = async (nextOps: TenantStoreOperations, successMessage: string) => {
    if (!tenantId) {
      toast.error('Tenant not loaded yet.');
      return;
    }

    setSaving(true);
    try {
      await updateDoc(doc(getDb(), 'tenants', tenantId), {
        storeOperations: {
          isStoreOpen: nextOps.isStoreOpen !== false,
          businessHoursEnabled: nextOps.businessHoursEnabled === true,
          openTime: nextOps.openTime || DEFAULT_STORE_OPERATIONS.openTime,
          closeTime: nextOps.closeTime || DEFAULT_STORE_OPERATIONS.closeTime,
          offlineMessage: nextOps.offlineMessage?.trim() || '',
          updatedAt: serverTimestamp(),
        },
      });
      toast.success(successMessage);
    } catch (error) {
      console.error('Failed to update store status:', error);
      toast.error('Failed to update store status.');
    } finally {
      setSaving(false);
    }
  };

  const toggleLive = async () => {
    const next = { ...ops, isStoreOpen: ops.isStoreOpen === false };
    setOps(next);
    await persistOperations(
      next,
      next.isStoreOpen ? 'Store is now LIVE — accepting orders' : 'Store is OFFLINE — not accepting orders'
    );
  };

  const saveHours = async () => {
    await persistOperations(ops, 'Store hours updated');
  };

  const isLive = ops.isStoreOpen !== false;

  if (variant === 'compact') {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0A0A0A] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl border ${isLive ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-red-500/30 bg-red-500/10'}`}>
              <Store size={18} className={isLive ? 'text-emerald-400' : 'text-red-400'} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-white/40">Storefront Status</p>
              <p className={`text-lg font-black ${isLive ? 'text-emerald-400' : 'text-red-400'}`}>
                {isLive ? 'Live — Accepting Orders' : 'Offline — Paused'}
              </p>
              <p className="mt-1 text-xs text-white/50">
                {ops.businessHoursEnabled
                  ? `Auto offline outside ${ops.openTime} – ${ops.closeTime}`
                  : 'Manual control only (business hours off)'}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={saving || !tenantId}
            onClick={toggleLive}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-all disabled:opacity-50 ${
              isLive
                ? 'bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/25'
                : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20'
            }`}
          >
            <Power size={16} />
            {saving ? 'Updating…' : isLive ? 'Go Offline' : 'Go Live'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-white/10 bg-[#0a0a0a] p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white">Accept Orders Now</h3>
            <p className="mt-1 text-xs text-white/50">
              Turn off during breaks, stock-outs, or after closing time.
            </p>
          </div>
          <button
            type="button"
            disabled={saving || !tenantId}
            onClick={toggleLive}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${isLive ? 'bg-emerald-500' : 'bg-red-500'}`}
            aria-label={isLive ? 'Store live' : 'Store offline'}
          >
            <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${isLive ? 'translate-x-7' : 'translate-x-1'}`} />
          </button>
        </div>
        <p className={`mt-3 text-xs font-bold uppercase tracking-wider ${isLive ? 'text-emerald-400' : 'text-red-400'}`}>
          {isLive ? 'Online' : 'Offline'}
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#0a0a0a] p-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock size={16} className="text-[#FF6B00]" />
              Business Hours
            </h3>
            <p className="mt-1 text-xs text-white/50">
              Automatically show the store as closed outside these hours.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOps((prev) => ({ ...prev, businessHoursEnabled: !prev.businessHoursEnabled }))}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${ops.businessHoursEnabled ? 'bg-[#FF6B00]' : 'bg-white/20'}`}
          >
            <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${ops.businessHoursEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/40 mb-2">Opens</label>
            <input
              type="time"
              value={ops.openTime}
              onChange={(e) => setOps((prev) => ({ ...prev, openTime: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-[#0f0f11] px-3 py-2.5 text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/40 mb-2">Closes</label>
            <input
              type="time"
              value={ops.closeTime}
              onChange={(e) => setOps((prev) => ({ ...prev, closeTime: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-[#0f0f11] px-3 py-2.5 text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-white/40 mb-2">Offline Message (optional)</label>
          <input
            type="text"
            value={ops.offlineMessage || ''}
            onChange={(e) => setOps((prev) => ({ ...prev, offlineMessage: e.target.value }))}
            placeholder="We are closed for today. See you tomorrow!"
            className="w-full rounded-lg border border-white/10 bg-[#0f0f11] px-3 py-2.5 text-white placeholder-white/30"
          />
        </div>

        <button
          type="button"
          disabled={saving || !tenantId}
          onClick={saveHours}
          className="w-full rounded-lg bg-[#FF6B00] py-3 text-sm font-bold text-white hover:bg-[#e55f00] disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Store Hours'}
        </button>
      </div>
    </div>
  );
};

export default StoreLiveControl;
