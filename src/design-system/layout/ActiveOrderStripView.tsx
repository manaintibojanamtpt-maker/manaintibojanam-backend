import React from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Clock, CheckCircle2, Package, Truck, Sparkles, X, LucideIcon } from 'lucide-react';

export interface ActiveOrderStripViewConfig {
  label: string;
  icon: LucideIcon;
  color: string;
  bg: string;
}

export interface ActiveOrderStripViewProps {
  visible: boolean;
  config: ActiveOrderStripViewConfig;
  onNavigate: () => void;
  onDismiss: (e: React.MouseEvent) => void;
}

export const ActiveOrderStripView: React.FC<ActiveOrderStripViewProps> = ({
  visible,
  config,
  onNavigate,
  onDismiss,
}) => {
  if (!visible) return null;

  const Icon = config.icon;

  return (
    <AnimatePresence>
      <m.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        onClick={onNavigate}
        className="pointer-events-auto mb-3 cursor-pointer group"
      >
        <div className="relative p-[1px] rounded-[1.25rem] overflow-hidden">
          <div className="absolute inset-[-1000%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2E8F0_0%,#FF6B35_50%,#E2E8F0_100%)] opacity-20" />
          <div className="relative mx-auto max-w-sm overflow-hidden rounded-[1.2rem] bg-dark-bg/95 p-3 backdrop-blur-xl border border-white/5 shadow-2xl flex items-center justify-between gap-3 px-4 group-active:scale-[0.98] transition-transform">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${config.bg} ${config.color} shadow-lg relative`}>
                <div className={`absolute inset-0 ${config.bg} blur-md rounded-xl opacity-50`} />
                <Icon size={20} className="relative z-10" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 leading-none mb-1.5">Active Order</p>
                <h4 className="text-[13px] font-black text-white tracking-tight leading-none">{config.label}</h4>
              </div>
            </div>
            <div className="flex items-center gap-3 border-l border-white/5 pl-3">
              <div className="flex flex-col items-center">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)] mb-1" />
                <span className="text-[9px] font-black uppercase text-white/30 tracking-widest leading-none">Live</span>
              </div>
              <button
                onClick={onDismiss}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors ml-1"
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </div>
      </m.div>
    </AnimatePresence>
  );
};

export default ActiveOrderStripView;
