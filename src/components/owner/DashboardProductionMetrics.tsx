/**
 * GA-2 — Production KPI strip for owner dashboard.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IndianRupee,
  ShoppingBag,
  Clock,
  Users,
  TrendingUp,
  ChevronRight,
} from 'lucide-react';
import type { OwnerOrderMetrics } from '../../lib/ownerOrderAnalytics';
import { formatInr } from '../../lib/ownerOrderAnalytics';
import type { Order } from '../../types';
import { formatOwnerOrderTime } from '../../lib/ownerOrderTimeFormat';

export interface DashboardProductionMetricsProps {
  metrics: OwnerOrderMetrics;
  analyticsRevenue?: number;
  analyticsOrders?: number;
  paymentOnlineEnabled?: boolean;
}

const MetricCard: React.FC<{
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  onClick?: () => void;
}> = ({ label, value, sub, icon, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={!onClick}
    className={`rounded-2xl border border-white/10 bg-[#0A0A0A] p-4 sm:p-5 text-left transition-colors ${
      onClick ? 'hover:border-white/20 cursor-pointer' : 'cursor-default'
    }`}
  >
    <div className="flex items-center justify-between mb-3">
      <span className="text-[10px] font-bold uppercase tracking-widest text-white/45">{label}</span>
      <span className="text-white/30">{icon}</span>
    </div>
    <div className="text-2xl sm:text-3xl font-black text-white">{value}</div>
    {sub ? <p className="text-xs text-white/40 mt-1">{sub}</p> : null}
  </button>
);

function formatOrderTime(order: Order): string {
  return formatOwnerOrderTime(order.createdAt);
}

export const DashboardProductionMetrics: React.FC<DashboardProductionMetricsProps> = ({
  metrics,
  analyticsRevenue,
  analyticsOrders,
  paymentOnlineEnabled,
}) => {
  const navigate = useNavigate();
  const lifetimeRevenue = analyticsRevenue ?? metrics.totalRevenue;
  const lifetimeOrders = analyticsOrders ?? metrics.totalOrders;

  return (
    <section className="space-y-4" aria-label="Production metrics">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-white">Production overview</h2>
          <p className="text-xs text-white/45 mt-0.5">Live data from your kitchen orders.</p>
        </div>
        {metrics.peakHourLabel ? (
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
            Peak: {metrics.peakHourLabel}
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Today's revenue"
          value={formatInr(metrics.todayRevenue)}
          sub={`${metrics.todayOrderCount} order${metrics.todayOrderCount === 1 ? '' : 's'} today`}
          icon={<IndianRupee size={16} />}
          onClick={() => navigate('/owner/orders')}
        />
        <MetricCard
          label="Pending orders"
          value={String(metrics.pendingCount)}
          sub={metrics.pendingCount > 0 ? 'Needs kitchen action' : 'All caught up'}
          icon={<Clock size={16} />}
          onClick={() => navigate('/owner/orders')}
        />
        <MetricCard
          label="Lifetime revenue"
          value={formatInr(lifetimeRevenue)}
          sub={`${lifetimeOrders} completed orders`}
          icon={<TrendingUp size={16} />}
        />
        <MetricCard
          label="Customers"
          value={String(metrics.uniqueCustomers)}
          sub={`AOV ${formatInr(metrics.averageOrderValue)}`}
          icon={<Users size={16} />}
          onClick={() => navigate('/owner/customers')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/10 bg-[#0A0A0A] p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShoppingBag size={14} className="text-emerald-400" />
              Top items
            </h3>
            <button
              type="button"
              onClick={() => navigate('/owner/menu')}
              className="text-xs font-bold text-white/50 hover:text-white flex items-center gap-1"
            >
              Menu <ChevronRight size={12} />
            </button>
          </div>
          {metrics.topItems.length > 0 ? (
            <ul className="space-y-2">
              {metrics.topItems.map((item) => (
                <li
                  key={item.name}
                  className="flex items-center justify-between gap-3 text-sm border-b border-white/5 pb-2 last:border-0 last:pb-0"
                >
                  <span className="text-white font-medium truncate">{item.name}</span>
                  <span className="text-white/50 shrink-0">
                    {item.quantity} sold · {formatInr(item.revenue)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-white/40">No sales yet — share your storefront to get your first order.</p>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0A0A0A] p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock size={14} className="text-blue-400" />
              Recent orders
            </h3>
            <button
              type="button"
              onClick={() => navigate('/owner/orders')}
              className="text-xs font-bold text-white/50 hover:text-white flex items-center gap-1"
            >
              View all <ChevronRight size={12} />
            </button>
          </div>
          {metrics.recentOrders.length > 0 ? (
            <ul className="space-y-2">
              {metrics.recentOrders.map((order) => (
                <li
                  key={order.id}
                  className="flex items-center justify-between gap-3 text-sm border-b border-white/5 pb-2 last:border-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <span className="text-white font-medium">
                      #{order.orderNumber || order.id?.slice(-6)}
                    </span>
                    <span className="text-white/40 ml-2">{formatOrderTime(order)}</span>
                  </div>
                  <span className="text-white/60 shrink-0">
                    {formatInr(orderAmount(order))} · {order.status || 'NEW'}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-white/40">Orders will appear here in real time.</p>
          )}
          <p className="text-[10px] text-white/30 mt-4">
            Payments: {paymentOnlineEnabled ? 'COD + Online' : 'COD'} · Legacy Firestore path
          </p>
        </div>
      </div>
    </section>
  );
};

function orderAmount(order: Order): number {
  return order.totalAmount ?? order.total ?? 0;
}
