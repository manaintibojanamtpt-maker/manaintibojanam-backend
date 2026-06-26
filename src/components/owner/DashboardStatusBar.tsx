import React from 'react';
import { Store, ShoppingBag, CreditCard, Truck, AlertTriangle, Circle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface DashboardStatusBarProps {
  storeLive: boolean;
  acceptingOrders: boolean;
  ordersToday: number;
  payoutsActive: boolean;
  deliveryActive: boolean;
  urgentCount: number;
  storeUrl?: string;
}

const StatusPill: React.FC<{
  label: string;
  value: string;
  ok: boolean;
  icon: React.ReactNode;
  onClick?: () => void;
}> = ({ label, value, ok, icon, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={!onClick}
    className={`flex flex-col items-start p-3 sm:p-4 rounded-xl border text-left transition-colors min-w-0 ${
      onClick ? 'hover:border-white/20 cursor-pointer' : 'cursor-default'
    } ${ok ? 'border-white/10 bg-white/[0.03]' : 'border-amber-500/30 bg-amber-500/[0.06]'}`}
  >
    <div className="flex items-center gap-2 text-white/50 mb-1">
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-wider truncate">{label}</span>
    </div>
    <div className="flex items-center gap-1.5">
      <Circle size={8} className={ok ? 'fill-emerald-400 text-emerald-400' : 'fill-amber-400 text-amber-400'} />
      <span className="text-sm font-bold text-white truncate">{value}</span>
    </div>
  </button>
);

export const DashboardStatusBar: React.FC<DashboardStatusBarProps> = ({
  storeLive,
  acceptingOrders,
  ordersToday,
  payoutsActive,
  deliveryActive,
  urgentCount,
}) => {
  const navigate = useNavigate();

  return (
    <section className="rounded-2xl border border-white/10 bg-[#0A0A0A] p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-black text-white">Today at a glance</h2>
          <p className="text-xs text-white/45 mt-0.5">Store status, orders, and anything that needs attention.</p>
        </div>
        {urgentCount > 0 && (
          <button
            type="button"
            onClick={() => navigate('/owner/notifications')}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-bold"
          >
            <AlertTriangle size={14} />
            {urgentCount} need{urgentCount === 1 ? 's' : ''} attention
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
        <StatusPill
          label="Store"
          value={storeLive ? 'Live' : 'Offline'}
          ok={storeLive}
          icon={<Store size={14} />}
          onClick={() => navigate('/owner/settings?tab=hours')}
        />
        <StatusPill
          label="Orders"
          value={acceptingOrders ? 'Open' : 'Paused'}
          ok={acceptingOrders}
          icon={<ShoppingBag size={14} />}
          onClick={() => navigate('/owner/orders')}
        />
        <StatusPill
          label="Today"
          value={`${ordersToday} order${ordersToday === 1 ? '' : 's'}`}
          ok={ordersToday > 0}
          icon={<ShoppingBag size={14} />}
          onClick={() => navigate('/owner/orders')}
        />
        <StatusPill
          label="Payouts"
          value={payoutsActive ? 'Active' : 'Setup needed'}
          ok={payoutsActive}
          icon={<CreditCard size={14} />}
          onClick={() => navigate('/owner/subscription')}
        />
        <StatusPill
          label="Delivery"
          value={deliveryActive ? 'On' : 'Not set'}
          ok={deliveryActive}
          icon={<Truck size={14} />}
          onClick={() => navigate('/owner/settings?tab=location')}
        />
      </div>
    </section>
  );
};

export default DashboardStatusBar;
