import React, { useState, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, Activity, AlertTriangle, CheckCircle2, 
  Calendar, ShoppingBag, Utensils, PieChart, Info,
  Lightbulb, BrainCircuit, RefreshCw, BarChart2
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { generateMorningBrief } from '../../services/AIOperationsManager';
import { getLearningDampener } from '../../services/ForecastAccuracyService';
import { simulateScenario } from '../../services/ForecastSimulationService';
import { AIOperationsInsight, SimulationResult } from '../../types';

export default function ForecastDashboard() {
  const { tenantId } = useTenant();
  const [brief, setBrief] = useState<AIOperationsInsight | null>(null);
  const [accuracy, setAccuracy] = useState<number>(100);
  const [loading, setLoading] = useState(true);
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [simScenario, setSimScenario] = useState<'discount' | 'ad_spend' | 'vip_campaign' | 'promo'>('vip_campaign');

  useEffect(() => {
    async function loadData() {
      if (!tenantId) return;
      setLoading(true);
      try {
        const [briefData, dampener] = await Promise.all([
          generateMorningBrief(tenantId),
          getLearningDampener(tenantId)
        ]);
        setBrief(briefData);
        // dampen is a multiplier like 0.95 or 1.05. We'll convert it to an accuracy %.
        const variance = Math.abs(1 - dampener) * 100;
        setAccuracy(Math.round(100 - variance));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [tenantId]);

  const handleSimulate = async () => {
    if (!tenantId) return;
    setSimLoading(true);
    try {
      const result = await simulateScenario(tenantId, simScenario);
      setSimResult(result);
    } finally {
      setSimLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-white">
        <RefreshCw className="animate-spin text-purple-400" size={32} />
      </div>
    );
  }

  if (!brief) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-black text-white mb-4">Operations Intelligence</h2>
        <div className="bg-dark-card border border-white/10 rounded-2xl p-8 text-center">
          <BrainCircuit size={48} className="text-white/20 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Not enough historical data yet.</h3>
          <p className="text-white/60">The Forecasting Engine requires a minimum of 30 historical orders to begin generating predictions.</p>
        </div>
      </div>
    );
  }

  const riskColor = brief.inventoryRisk === 'Low' ? 'text-green-400' : 
                    brief.inventoryRisk === 'Medium' ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">AI Operations Manager</h1>
          <p className="text-white/60 font-medium">Predictive forecasting and actionable intelligence.</p>
        </div>
        <div className="flex items-center gap-2 bg-purple-500/10 px-4 py-2 rounded-full border border-purple-500/20">
          <Activity size={16} className="text-purple-400" />
          <span className="text-purple-300 font-bold text-sm">System Active</span>
        </div>
      </div>

      {/* Morning Briefing Card */}
      <div className="bg-gradient-to-br from-[#1a1a24] to-[#14141d] rounded-3xl p-6 md:p-8 border border-white/5 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-white tracking-tight">Good Morning, Owner 👋</h2>
            <div className="flex items-center gap-3">
              <span className="bg-white/10 px-3 py-1 rounded-full text-xs font-bold text-white/80 border border-white/10">
                Confidence: {brief.confidence}
              </span>
              <span className="bg-white/10 px-3 py-1 rounded-full text-xs font-bold text-white/80 border border-white/10 flex items-center gap-1">
                Accuracy: {accuracy}% <Info size={12} className="text-white/50" />
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 relative z-10">
          <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
            <div className="text-white/50 text-xs font-bold uppercase tracking-wider mb-1">Expected Orders</div>
            <div className="text-3xl font-black text-white">{brief.expectedOrders}</div>
          </div>
          <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
            <div className="text-white/50 text-xs font-bold uppercase tracking-wider mb-1">Expected Revenue</div>
            <div className="text-3xl font-black text-green-400">₹{brief.expectedRevenue}</div>
          </div>
          <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
            <div className="text-white/50 text-xs font-bold uppercase tracking-wider mb-1">Inventory Risk</div>
            <div className={`text-2xl font-black ${riskColor}`}>{brief.inventoryRisk}</div>
          </div>
          <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
            <div className="text-white/50 text-xs font-bold uppercase tracking-wider mb-1">Kitchen Health</div>
            <div className="text-3xl font-black text-white">{brief.kitchenHealth}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Recommendations */}
        <div className="lg:col-span-2 bg-dark-card rounded-3xl p-6 border border-white/5 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <Lightbulb size={24} className="text-amber-400" />
            <h2 className="text-xl font-bold text-white">Top 3 Recommendations</h2>
          </div>
          <div className="space-y-4">
            {brief.recommendations.map((rec, i) => (
              <div key={i} className="bg-white/5 p-4 rounded-2xl border border-white/5 flex gap-4">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  <span className="text-white font-bold text-sm">{i + 1}</span>
                </div>
                <p className="text-white/90 font-medium leading-relaxed">{rec}</p>
              </div>
            ))}
            {brief.recommendations.length === 0 && (
              <p className="text-white/50 italic">No urgent actions required today. Operations are optimal.</p>
            )}
          </div>
        </div>

        {/* Forecast Simulation Lab */}
        <div className="bg-dark-card rounded-3xl p-6 border border-purple-500/20 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <BarChart2 size={24} className="text-purple-400" />
            <h2 className="text-xl font-bold text-white">Simulation Lab</h2>
          </div>
          
          <div className="space-y-4 relative z-10">
            <p className="text-sm text-white/60 mb-4">Run "What if?" scenarios without affecting real data.</p>
            
            <select 
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500"
              value={simScenario}
              onChange={(e) => setSimScenario(e.target.value as any)}
            >
              <option value="vip_campaign">Launch VIP Reactivation</option>
              <option value="discount">Launch 10% Discount</option>
              <option value="ad_spend">Increase Ad Spend</option>
              <option value="promo">Promote Best Seller</option>
            </select>

            <button 
              onClick={handleSimulate}
              disabled={simLoading}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {simLoading ? <RefreshCw size={18} className="animate-spin" /> : <BrainCircuit size={18} />}
              Run Simulation
            </button>

            <AnimatePresence>
              {simResult && !simLoading && (
                <m.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-black/30 p-4 rounded-xl border border-white/10 mt-4"
                >
                  <h4 className="text-white font-bold mb-3">{simResult.action} Expected Impact</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-white/60 text-sm">Orders Lift</span>
                      <span className="text-green-400 font-bold">+{simResult.expectedOrderLift}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/60 text-sm">Revenue Lift</span>
                      <span className="text-green-400 font-bold">+{simResult.expectedRevenueLift}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/60 text-sm">Repeat Customers</span>
                      <span className="text-green-400 font-bold">+{simResult.expectedRepeatLift}%</span>
                    </div>
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
