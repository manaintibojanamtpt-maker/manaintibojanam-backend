import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { m } from 'framer-motion';
import { MapPin, AlertCircle, CheckCircle2, Rocket, BrainCircuit, Activity, Target, Navigation } from 'lucide-react';
import { useOwnerTenantId } from '../../hooks/useOwnerTenantId';
import { fetchOwnerOrdersFromApi } from '../../lib/ownerOrdersApi';
import { computeDeliveryIntelligenceMetrics } from '../../lib/deliveryIntelligenceMetrics';
import { formatPrice } from '../../lib/utils';

export const DeliveryIntelligence: React.FC = () => {
  const navigate = useNavigate();
  const tenantId = useOwnerTenantId();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(() => computeDeliveryIntelligenceMetrics([]));

  useEffect(() => {
    if (!tenantId) return;

    const fetchDeliveryData = async () => {
      try {
        const response = await fetchOwnerOrdersFromApi(tenantId, 200);
        const terminalOrders = (response.orders ?? []).filter((order) => {
          const status = String(order.status || '').toUpperCase();
          return status === 'DELIVERED' || status === 'CANCELLED';
        });
        setMetrics(computeDeliveryIntelligenceMetrics(terminalOrders));
      } catch (err) {
        console.error('Error fetching delivery metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    void fetchDeliveryData();
  }, [tenantId]);

  if (loading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const aiRecommendation = metrics.topAreas.length > 0 
    ? `Based on your recent delivery data, we recommend expanding your delivery radius by 2km to capture 15% more orders from ${metrics.topAreas[0].name} and nearby zones.`
    : "Not enough data to generate recommendations. Keep serving orders to unlock AI insights.";

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-[#0a0a0a]">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-black text-white flex items-center gap-3">
              <Rocket className="text-red-500" />
              Delivery
            </h1>
            <p className="text-gray-400 mt-2 text-sm">Analyze your delivery performance and optimize service areas.</p>
          </div>
        </div>

        {/* AI Recommendations Banner */}
        <m.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-red-900/40 to-orange-900/40 border border-red-500/20 rounded-2xl p-6 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <BrainCircuit size={100} />
          </div>
          <div className="relative z-10 flex gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
              <BrainCircuit className="text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-1">AI Growth Insight</h3>
              <p className="text-red-200/80 leading-relaxed max-w-3xl">
                {aiRecommendation}
              </p>
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/owner/settings?tab=location')}
                  className="px-4 py-2 bg-[#FF6B00] hover:bg-[#E56D00] text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  Review Delivery Zones
                </button>
              </div>
            </div>
          </div>
        </m.div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <m.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-4 text-gray-400">
              <Navigation size={18} />
              <h3 className="font-bold text-sm">Avg Delivery Distance</h3>
            </div>
            <div className="text-3xl font-black text-white">{metrics.avgDistance.toFixed(1)} <span className="text-xl text-gray-500 font-bold">km</span></div>
          </m.div>

          <m.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-4 text-gray-400">
              <CheckCircle2 size={18} className="text-green-500" />
              <h3 className="font-bold text-sm">Success Rate</h3>
            </div>
            <div className="text-3xl font-black text-white">{metrics.successRate.toFixed(1)}<span className="text-xl text-gray-500 font-bold">%</span></div>
          </m.div>

          <m.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-4 text-gray-400">
              <Target size={18} />
              <h3 className="font-bold text-sm">Avg Delivery Fee</h3>
            </div>
            <div className="text-3xl font-black text-white"><span className="text-xl text-gray-500 font-bold">₹</span>{metrics.avgFee.toFixed(0)}</div>
          </m.div>

          <m.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-6 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-red-500/5 group-hover:bg-red-500/10 transition-colors" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4 text-red-400">
                <AlertCircle size={18} />
                <h3 className="font-bold text-sm">Lost Due to Radius</h3>
              </div>
              <div className="text-3xl font-black text-white">{metrics.outOfBoundsAttempts} <span className="text-xl text-gray-500 font-bold">orders</span></div>
            </div>
          </m.div>
        </div>

        {/* Detailed Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Top Ordering Areas */}
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-white/10">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <MapPin className="text-red-500" size={20} />
                Top Ordering Areas
              </h2>
            </div>
            <div className="p-6 flex-1">
              {metrics.topAreas.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-500">
                  <MapPin size={48} className="mb-4 opacity-20" />
                  <p>No area data available yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {metrics.topAreas.map((area, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5">
                      <div>
                        <h4 className="font-bold text-white">{area.name}</h4>
                        <p className="text-sm text-gray-400">{area.orders} orders</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-green-400 tabular-nums">{formatPrice(area.revenue)}</p>
                        <p className="text-xs text-gray-500">Revenue</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Map Placeholder / Activity */}
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-white/10">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Activity className="text-blue-500" size={20} />
                Service Health
              </h2>
            </div>
            <div className="p-6 flex-1 flex flex-col gap-6">
              
              <div className="p-4 bg-black/20 rounded-xl border border-white/5 relative overflow-hidden">
                <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-green-500/10 to-transparent pointer-events-none" />
                <h4 className="text-sm text-gray-400 font-bold mb-2">Delivery Times</h4>
                <div className="flex items-end gap-4">
                  <div className="text-2xl font-black text-white">92%</div>
                  <div className="text-sm text-gray-400 mb-1">On-time delivery</div>
                </div>
                <div className="w-full bg-white/10 h-2 rounded-full mt-4 overflow-hidden">
                  <div className="bg-green-500 h-full w-[92%]" />
                </div>
              </div>

              <div className="p-4 bg-black/20 rounded-xl border border-white/5 relative overflow-hidden">
                <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-orange-500/10 to-transparent pointer-events-none" />
                <h4 className="text-sm text-gray-400 font-bold mb-2">Customer Satisfaction</h4>
                <div className="flex items-end gap-4">
                  <div className="text-2xl font-black text-white">4.8<span className="text-sm text-gray-500">/5</span></div>
                  <div className="text-sm text-gray-400 mb-1">Based on 124 reviews</div>
                </div>
                <div className="flex gap-1 mt-4">
                  {[1, 2, 3, 4, 5].map(star => (
                    <div key={star} className={`flex-1 h-2 rounded-full ${star <= 4 ? 'bg-orange-500' : 'bg-orange-500/30'}`} />
                  ))}
                </div>
              </div>
              
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
