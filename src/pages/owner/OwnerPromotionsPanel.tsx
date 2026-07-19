import React, { useCallback, useEffect, useState } from 'react';
import { useOwnerTenantId } from '../../hooks/useOwnerTenantId';
import { Plus, Trash2, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  createOwnerCoupon,
  deleteOwnerCoupon,
  fetchOwnerCoupons,
  setOwnerCouponActive,
  type OwnerCoupon,
} from '../../lib/ownerCouponsApi';

const OwnerPromotionsPanel: React.FC = () => {
  const tenantId = useOwnerTenantId();
  const [coupons, setCoupons] = useState<OwnerCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: '',
    discountType: 'fixed' as 'fixed' | 'percentage',
    discountValue: '',
    minOrder: '0',
  });

  const loadCoupons = useCallback(async (activeTenantId: string) => {
    setLoading(true);
    try {
      const response = await fetchOwnerCoupons(activeTenantId);
      setCoupons(response.coupons ?? []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load coupons');
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!tenantId) {
      setCoupons([]);
      setLoading(false);
      return;
    }
    void loadCoupons(tenantId);
  }, [tenantId, loadCoupons]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !form.code.trim() || !form.discountValue) {
      toast.error('Code and discount value are required');
      return;
    }
    setSaving(true);
    try {
      await createOwnerCoupon({
        tenantId,
        code: form.code.toUpperCase().trim(),
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        minOrder: Number(form.minOrder) || 0,
      });
      setForm({ code: '', discountType: 'fixed', discountValue: '', minOrder: '0' });
      toast.success('Coupon created — customers can apply it at checkout');
      await loadCoupons(tenantId);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Failed to create coupon');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    if (!tenantId) return;
    try {
      await setOwnerCouponActive(tenantId, id, !current);
      await loadCoupons(tenantId);
    } catch {
      toast.error('Failed to update coupon');
    }
  };

  const handleDelete = async (id: string) => {
    if (!tenantId || !window.confirm('Delete this coupon?')) return;
    try {
      await deleteOwnerCoupon(tenantId, id);
      toast.success('Coupon deleted');
      await loadCoupons(tenantId);
    } catch {
      toast.error('Failed to delete coupon');
    }
  };

  if (!tenantId) return null;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
          <Zap size={20} className="text-[#FF6B00]" /> Promo Codes
        </h3>
        <p className="text-sm text-white/50">Create discount codes for your storefront checkout. Active codes appear on kitchen cards, restaurant pages, and checkout.</p>
      </div>

      <form onSubmit={handleCreate} className="p-4 bg-[#0a0a0a] border border-white/10 rounded-xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-white/60 mb-2 uppercase tracking-widest">Code</label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="SAVE20"
              className="w-full px-4 py-2.5 bg-black border border-white/10 rounded-lg text-white uppercase"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-white/60 mb-2 uppercase tracking-widest">Type</label>
            <select
              value={form.discountType}
              onChange={(e) => setForm({ ...form, discountType: e.target.value as 'fixed' | 'percentage' })}
              className="w-full px-4 py-2.5 bg-black border border-white/10 rounded-lg text-white"
            >
              <option value="fixed">Fixed (₹ off)</option>
              <option value="percentage">Percentage (% off)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-white/60 mb-2 uppercase tracking-widest">Discount</label>
            <input
              type="number"
              min={1}
              value={form.discountValue}
              onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
              className="w-full px-4 py-2.5 bg-black border border-white/10 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-white/60 mb-2 uppercase tracking-widest">Min Order (₹)</label>
            <input
              type="number"
              min={0}
              value={form.minOrder}
              onChange={(e) => setForm({ ...form, minOrder: e.target.value })}
              className="w-full px-4 py-2.5 bg-black border border-white/10 rounded-lg text-white"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#FF6B00] hover:bg-[#E56D00] text-white font-bold rounded-lg disabled:opacity-50"
        >
          <Plus size={16} /> Create Coupon
        </button>
      </form>

      <div className="space-y-2">
        {loading ? (
          <p className="text-white/40 text-sm py-4 text-center">Loading coupons…</p>
        ) : coupons.length === 0 ? (
          <p className="text-white/40 text-sm py-4 text-center">No coupons yet — checkout promo field stays hidden until you create one.</p>
        ) : (
          coupons.map((c) => (
            <div key={c.id} className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/10 rounded-xl">
              <div>
                <p className="font-black text-white tracking-wider">{c.code}</p>
                <p className="text-xs text-white/50 mt-0.5">
                  {c.discountType === 'percentage' ? `${c.discountValue}% off` : `₹${c.discountValue} off`}
                  {c.minOrder > 0 ? ` · min ₹${c.minOrder}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleActive(c.id, c.isActive)}
                  className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-lg ${c.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/40'}`}
                >
                  {c.isActive ? 'Active' : 'Off'}
                </button>
                <button type="button" onClick={() => handleDelete(c.id)} className="text-red-400 hover:text-red-300 p-1">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default OwnerPromotionsPanel;
