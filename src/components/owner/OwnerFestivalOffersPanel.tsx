import React, { useCallback, useEffect, useState } from 'react';
import { CalendarRange, Plus, Sparkles, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useOwnerTenantId } from '../../hooks/useOwnerTenantId';
import { fetchOwnerStorefront, updateOwnerStorefront } from '../../lib/ownerStorefrontApi';

export interface OwnerFestivalOfferDraft {
  offerId: string;
  title: string;
  displayText: string;
  validFrom: string;
  validTo: string;
  enabled: boolean;
}

function emptyOffer(): OwnerFestivalOfferDraft {
  return {
    offerId: `offer_${Date.now()}`,
    title: '',
    displayText: '',
    validFrom: '',
    validTo: '',
    enabled: true,
  };
}

function parseOfferDraft(raw: unknown, index: number): OwnerFestivalOfferDraft | null {
  if (!raw || typeof raw !== 'object') return null;
  const body = raw as Record<string, unknown>;
  const displayText = typeof body.displayText === 'string' ? body.displayText.trim() : '';
  if (!displayText) return null;
  return {
    offerId: typeof body.offerId === 'string' ? body.offerId : `offer_${index}`,
    title: typeof body.title === 'string' ? body.title : '',
    displayText,
    validFrom: typeof body.validFrom === 'string' ? body.validFrom : '',
    validTo: typeof body.validTo === 'string' ? body.validTo : '',
    enabled: body.enabled !== false,
  };
}

function offerStatusLabel(offer: OwnerFestivalOfferDraft): string {
  if (!offer.enabled) return 'Paused';
  const today = new Date().toISOString().slice(0, 10);
  if (offer.validFrom && today < offer.validFrom) return 'Scheduled';
  if (offer.validTo && today > offer.validTo) return 'Expired';
  return 'Live on OrderBhojan';
}

const OwnerFestivalOffersPanel: React.FC = () => {
  const tenantId = useOwnerTenantId();
  const [offers, setOffers] = useState<OwnerFestivalOfferDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadOffers = useCallback(async (activeTenantId: string) => {
    setLoading(true);
    try {
      const data = await fetchOwnerStorefront(activeTenantId);
      const rawOffers = Array.isArray(data.marketplace?.offers) ? data.marketplace.offers : [];
      const parsed = rawOffers
        .map((entry, index) => parseOfferDraft(entry, index))
        .filter((entry): entry is OwnerFestivalOfferDraft => entry != null);
      setOffers(parsed);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load festival offers');
      setOffers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!tenantId) {
      setOffers([]);
      setLoading(false);
      return;
    }
    void loadOffers(tenantId);
  }, [tenantId, loadOffers]);

  const updateOffer = (offerId: string, patch: Partial<OwnerFestivalOfferDraft>) => {
    setOffers((current) =>
      current.map((offer) => (offer.offerId === offerId ? { ...offer, ...patch } : offer)),
    );
  };

  const addOffer = () => {
    setOffers((current) => [...current, emptyOffer()]);
  };

  const removeOffer = (offerId: string) => {
    setOffers((current) => current.filter((offer) => offer.offerId !== offerId));
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!tenantId) return;

    const invalid = offers.find((offer) => !offer.displayText.trim());
    if (invalid) {
      toast.error('Every offer needs discount text customers will see');
      return;
    }

    setSaving(true);
    try {
      await updateOwnerStorefront(tenantId, {
        marketplace: {
          offers: offers.map((offer, index) => ({
            offerId: offer.offerId,
            title: offer.title.trim() || undefined,
            displayText: offer.displayText.trim(),
            badge: offer.title.trim().slice(0, 24) || undefined,
            validFrom: offer.validFrom || undefined,
            validTo: offer.validTo || undefined,
            enabled: offer.enabled,
            priority: index,
            type: 'festival',
          })),
        },
      });
      toast.success('Festival offer saved — visible on OrderBhojan when active');
      await loadOffers(tenantId);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to save festival offer');
    } finally {
      setSaving(false);
    }
  };

  if (!tenantId) return null;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
          <Sparkles size={20} className="text-[#FF6B00]" /> Festival & Special Offers
        </h3>
        <p className="text-sm text-white/50">
          Publish limited-time offers for Diwali, weekends, or new launches. Customers see badges on
          kitchen cards, home rails, and your restaurant page — no checkout changes.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {loading ? (
          <p className="text-white/40 text-sm py-4 text-center">Loading offers…</p>
        ) : offers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-6 text-center">
            <CalendarRange className="mx-auto mb-3 text-white/30" size={28} />
            <p className="text-sm text-white/50 mb-4">No active campaign yet — add one for the next festival or launch.</p>
            <button
              type="button"
              onClick={addOffer}
              className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/15"
            >
              <Plus size={16} /> Add festival offer
            </button>
          </div>
        ) : (
          offers.map((offer) => (
            <div
              key={offer.offerId}
              className="rounded-xl border border-white/10 bg-[#0a0a0a] p-4 space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-white/40">Campaign</p>
                  <p
                    className={`mt-1 text-xs font-bold uppercase tracking-wider ${
                      offerStatusLabel(offer) === 'Live on OrderBhojan'
                        ? 'text-emerald-400'
                        : 'text-white/40'
                    }`}
                  >
                    {offerStatusLabel(offer)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateOffer(offer.offerId, { enabled: !offer.enabled })}
                    className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-lg ${
                      offer.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/40'
                    }`}
                  >
                    {offer.enabled ? 'Active' : 'Paused'}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeOffer(offer.offerId)}
                    className="text-red-400 hover:text-red-300 p-1"
                    aria-label="Remove offer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-white/60 mb-2 uppercase tracking-widest">
                    Title
                  </label>
                  <input
                    type="text"
                    value={offer.title}
                    onChange={(e) => updateOffer(offer.offerId, { title: e.target.value })}
                    placeholder="Diwali Feast"
                    className="w-full px-4 py-2.5 bg-black border border-white/10 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/60 mb-2 uppercase tracking-widest">
                    Discount text
                  </label>
                  <input
                    type="text"
                    value={offer.displayText}
                    onChange={(e) => updateOffer(offer.offerId, { displayText: e.target.value })}
                    placeholder="20% off orders above ₹499"
                    className="w-full px-4 py-2.5 bg-black border border-white/10 rounded-lg text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/60 mb-2 uppercase tracking-widest">
                    Valid from
                  </label>
                  <input
                    type="date"
                    value={offer.validFrom}
                    onChange={(e) => updateOffer(offer.offerId, { validFrom: e.target.value })}
                    className="w-full px-4 py-2.5 bg-black border border-white/10 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/60 mb-2 uppercase tracking-widest">
                    Valid to
                  </label>
                  <input
                    type="date"
                    value={offer.validTo}
                    onChange={(e) => updateOffer(offer.offerId, { validTo: e.target.value })}
                    className="w-full px-4 py-2.5 bg-black border border-white/10 rounded-lg text-white"
                  />
                </div>
              </div>
            </div>
          ))
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={addOffer}
            disabled={offers.length >= 5}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/5 disabled:opacity-40"
          >
            <Plus size={16} /> Add another offer
          </button>
          <button
            type="submit"
            disabled={saving || loading}
            className="inline-flex items-center gap-2 rounded-lg bg-[#FF6B00] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#E56D00] disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save festival offers'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default OwnerFestivalOffersPanel;
