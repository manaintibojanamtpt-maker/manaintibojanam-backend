import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Shield, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchPendingKyc, reviewTenantKyc, type PendingKycTenant } from '../../services/api';

function derivePendingFromTenants(tenants: any[] | undefined): PendingKycTenant[] {
  if (!Array.isArray(tenants) || tenants.length === 0) return [];
  return tenants
    .filter(
      (t) =>
        t?.kyc?.status === 'pending_verification' || t?.kyc?.verificationLevel === 1,
    )
    .map((t) => ({
      tenantId: String(t.id ?? ''),
      slug: String(t.slug ?? t.id ?? ''),
      name: String(t.name ?? t.slug ?? t.id ?? ''),
      status: String(t.status ?? ''),
      kyc: t.kyc ?? {},
      fssai: t.fssai,
      updatedAt: t.updatedAt,
    }));
}

export function KycReviewPanel({
  refreshToken = 0,
  initialPending,
  seedTenants,
}: {
  refreshToken?: number;
  /** Prefer server-bundled pending KYC from superadmin-data (avoids second scan). */
  initialPending?: PendingKycTenant[];
  /** Fallback derive from already-loaded tenants while network refresh runs. */
  seedTenants?: any[];
}) {
  const seeded =
    (initialPending && initialPending.length > 0
      ? initialPending
      : derivePendingFromTenants(seedTenants)) ?? [];
  const [pending, setPending] = useState<PendingKycTenant[]>(seeded);
  const [loading, setLoading] = useState(seeded.length === 0);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});

  const loadPending = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent && pending.length === 0) {
      setLoading(true);
    }
    try {
      const rows = await fetchPendingKyc();
      setPending(rows);
    } catch (error) {
      console.error('Failed to load pending KYC', error);
      if (pending.length === 0) {
        toast.error(error instanceof Error ? error.message : 'Failed to load KYC queue');
      }
    } finally {
      setLoading(false);
    }
  }, [pending.length]);

  useEffect(() => {
    if (initialPending && initialPending.length > 0) {
      setPending(initialPending);
      setLoading(false);
      return;
    }
    const derived = derivePendingFromTenants(seedTenants);
    if (derived.length > 0) {
      setPending(derived);
      setLoading(false);
      // Soft refresh in background — no spinner flash.
      void loadPending({ silent: true });
      return;
    }
    void loadPending();
    // seedTenants / initialPending intentionally keyed by refreshToken from parent sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadPending, refreshToken]);

  const handleReview = async (tenantId: string, action: 'approve' | 'reject') => {
    if (action === 'reject' && !rejectReason[tenantId]?.trim()) {
      toast.error('Enter a rejection reason');
      return;
    }

    setReviewingId(tenantId);
    try {
      await reviewTenantKyc({
        tenantId,
        action,
        reason: action === 'reject' ? rejectReason[tenantId]?.trim() : undefined,
      });
      toast.success(action === 'approve' ? 'KYC approved — merchant can go live' : 'KYC rejected');
      setPending((current) => current.filter((row) => row.tenantId !== tenantId));
    } catch (error) {
      console.error('KYC review failed', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update KYC');
    } finally {
      setReviewingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
      </div>
    );
  }

  return (
    <div className="bg-[#151515] border border-white/5 rounded-2xl overflow-hidden">
      <div className="p-6 border-b border-white/5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Shield className="text-orange-400" size={20} />
          <div>
            <h2 className="text-lg font-bold text-white">KYC Compliance Review</h2>
            <p className="text-xs text-gray-500 mt-0.5">Approve or reject merchant identity submissions</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void loadPending()}
          className="text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-white transition-colors"
        >
          Refresh
        </button>
      </div>

      {pending.length === 0 ? (
        <div className="p-8 text-center text-sm text-gray-500">No kitchens awaiting KYC review.</div>
      ) : (
        <div className="divide-y divide-white/5">
          {pending.map((tenant) => (
            <div key={tenant.tenantId} className="p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-white">{tenant.name || tenant.slug}</h3>
                  <p className="text-xs text-gray-500 mt-1">{tenant.slug} · {tenant.kyc.email || 'No email'}</p>
                  <p className="text-sm text-gray-400 mt-2">
                    {tenant.kyc.ownerName || 'Owner'} · {tenant.kyc.businessName || 'Business'}
                  </p>
                  {(tenant.kyc.gstNumber || tenant.kyc.panNumber) && (
                    <p className="text-xs text-gray-500 mt-1">
                      {tenant.kyc.gstNumber ? `GST: ${tenant.kyc.gstNumber}` : ''}
                      {tenant.kyc.gstNumber && tenant.kyc.panNumber ? ' · ' : ''}
                      {tenant.kyc.panNumber ? `PAN: ${tenant.kyc.panNumber}` : ''}
                    </p>
                  )}
                </div>
                <span className="inline-flex self-start px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Pending
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  disabled={reviewingId === tenant.tenantId}
                  onClick={() => void handleReview(tenant.tenantId, 'approve')}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm font-bold hover:bg-emerald-500/25 disabled:opacity-50"
                >
                  {reviewingId === tenant.tenantId ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}
                  Approve
                </button>
                <div className="flex-1 flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={rejectReason[tenant.tenantId] || ''}
                    onChange={(e) =>
                      setRejectReason((prev) => ({ ...prev, [tenant.tenantId]: e.target.value }))
                    }
                    placeholder="Rejection reason"
                    className="flex-1 px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm text-white placeholder:text-gray-600"
                  />
                  <button
                    type="button"
                    disabled={reviewingId === tenant.tenantId}
                    onClick={() => void handleReview(tenant.tenantId, 'reject')}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm font-bold hover:bg-red-500/25 disabled:opacity-50"
                  >
                    <XCircle size={16} />
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
