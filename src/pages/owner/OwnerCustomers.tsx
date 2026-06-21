import React, { useEffect, useMemo, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { getDb } from '../../lib/firebase-db';
import { useAuth } from '../../context/AuthContext';
import { Order } from '../../types';
import toast from 'react-hot-toast';
import { deriveOwnerCustomerMemories } from '../../utils/customerMemory';
import { safeParseDate } from '../../lib/utils';
import { MessageCircle, Phone, Search, Users } from 'lucide-react';
import { generateWhatsAppLink } from '../../utils/whatsapp';

const OwnerCustomers: React.FC = () => {
  const { userProfile } = useAuth();
  const tenantId = userProfile?.ownedTenantIds?.[0];
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!tenantId) {
      setOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const customersQuery = query(
      collection(getDb(), 'orders'),
      where('tenantId', '==', tenantId)
    );

    const unsubscribe = onSnapshot(
      customersQuery,
      (snapshot) => {
        setOrders(snapshot.docs.map((snapshotDoc) => ({ id: snapshotDoc.id, ...snapshotDoc.data() } as Order)));
        setLoading(false);
      },
      (error) => {
        console.error('Failed to load owner customers:', error);
        toast.error('Could not load customer memory');
        setOrders([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [tenantId]);

  const customerMemories = useMemo(() => deriveOwnerCustomerMemories(orders), [orders]);

  const filteredCustomers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return customerMemories;

    return customerMemories.filter((customer) =>
      customer.name.toLowerCase().includes(term) ||
      String(customer.phone || '').toLowerCase().includes(term) ||
      customer.topDishes.some((dish) => dish.name.toLowerCase().includes(term))
    );
  }, [customerMemories, search]);

  const openWhatsApp = (customerName: string, phone?: string) => {
    const message = `Hi ${customerName}, thank you for ordering with us again. We are ready when you want your usual meal.`;
    window.open(generateWhatsAppLink(phone, message), '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0f0f11] p-10 text-center text-white/60">
        Loading customer memory...
      </div>
    );
  }

  return (
    <div className="text-white">
      <header className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers Lite</h1>
          <p className="text-white/50 text-sm mt-1">A lightweight CRM view of repeat buyers, usuals, and contact context.</p>
        </div>
        <div className="relative w-full md:w-[320px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search customer, phone, or dish"
            className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder:text-white/30 focus:border-red-500/40 focus:outline-none"
          />
        </div>
      </header>

      {filteredCustomers.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#0f0f11] p-10 text-center">
          <Users size={36} className="mx-auto text-white/25 mb-4" />
          <h2 className="text-xl font-bold text-white">No repeat customers yet</h2>
          <p className="text-white/50 mt-2">Customers will appear here once the same buyer orders at least twice in this tenant.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredCustomers.map((customer) => (
            <div key={customer.id} className="rounded-2xl border border-white/10 bg-[#0f0f11] p-5">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-black tracking-tight text-white">{customer.name}</h2>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-white/70">
                      {customer.totalOrders} orders
                    </span>
                    {customer.totalOrders >= 5 && (
                      <span className="rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-purple-300">
                        VIP
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-sm text-white/55">
                    <p>{customer.phone || 'Phone unavailable'}</p>
                    <div className="w-1 h-1 rounded-full bg-white/20" />
                    <p className="font-bold text-green-400">LTV: ₹{(customer.lifetimeSpend || 0).toLocaleString()}</p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {customer.topDishes.map((dish) => (
                      <span key={dish.name} className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-red-200">
                        {dish.name} x{dish.count}
                      </span>
                    ))}
                    {customer.preferredDeliverySlot && (
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-white/70">
                        Slot {customer.preferredDeliverySlot}
                      </span>
                    )}
                    {customer.lastPaymentPreference && (
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-white/70">
                        {customer.lastPaymentPreference}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-white/60">
                    <p>Last order: {customer.latestOrderAt ? safeParseDate(customer.latestOrderAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Unknown'}</p>
                    {customer.recentNote ? (
                      <p>Recent note: {customer.recentNote}</p>
                    ) : (
                      <p>No saved delivery notes remembered yet.</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 lg:w-auto">
                  <button
                    type="button"
                    onClick={() => openWhatsApp(customer.name, customer.phone)}
                    className="inline-flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm font-bold text-green-300 hover:bg-green-500/20"
                  >
                    <MessageCircle size={16} />
                    WhatsApp
                  </button>
                  {customer.phone && (
                    <a
                      href={`tel:${customer.phone}`}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white/80 hover:bg-white/10"
                    >
                      <Phone size={16} />
                      Call
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OwnerCustomers;
