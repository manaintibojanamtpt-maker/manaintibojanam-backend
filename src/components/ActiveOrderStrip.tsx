import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { getDb } from '../lib/firebase-db';
import { useAuth } from '../context/AuthContext';
import { Order, OrderStatus } from '../types';
import { Clock, CheckCircle2, Package, Truck, Sparkles, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ActiveOrderStrip: React.FC = () => {
  const { currentUser } = useAuth();
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) {
      setActiveOrder(null);
      return;
    }

    // Tightly scoped query for the narrowest data source:
    // Only fetch the most recent order that is NOT delivered, cancelled, or expired
    const q = query(
      collection(getDb(), 'orders'),
      where('userId', '==', currentUser.uid),
      where('status', 'not-in', [OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.EXPIRED]),
      orderBy('status'), 
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const orderData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Order;
        
        // Client-side filter for expired/failed payments to ensure consistency
        const isInvalidPayment = (orderData.paymentStatus === 'failed' || orderData.paymentStatus === 'expired') && 
                                 orderData.paymentMethod !== 'cod' && !orderData.isCOD;

        if (isInvalidPayment) {
          setActiveOrder(null);
        } else {
          setActiveOrder(orderData);
        }
      } else {
        setActiveOrder(null);
      }
    }, (error) => {
      console.error("ActiveOrderStrip Error:", error);
      setActiveOrder(null);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (activeOrder) {
      const lastSeen = localStorage.getItem(`active_order_seen_${activeOrder.id}`);
      if (lastSeen === activeOrder.status) {
        setIsDismissed(true);
      } else {
        setIsDismissed(false);
      }
    }
  }, [activeOrder]);

  if (!activeOrder || isDismissed) return null;

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeOrder) {
      // Replaced strict hiding logic
      setIsDismissed(true);
    }
  };

  const getStatusConfig = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
      case OrderStatus.PAYMENT_PENDING:
      case OrderStatus.PAYMENT_VERIFICATION:
      case OrderStatus.PLACED:
      case OrderStatus.CREATED:
        return { label: 'Order Placed', icon: Clock, color: 'text-orange-400', bg: 'bg-orange-500/10' };
      case OrderStatus.CONFIRMED:
      case OrderStatus.ACCEPTED:
        return { label: 'Chef is reviewing', icon: Sparkles, color: 'text-amber-400', bg: 'bg-amber-500/10' };
      case OrderStatus.PREPARING:
        return { label: 'Preparing your meal', icon: Package, color: 'text-indigo-400', bg: 'bg-indigo-500/10' };
      case OrderStatus.READY:
        return { label: 'Ready for pickup', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
      case OrderStatus.OUT_FOR_DELIVERY:
      case OrderStatus.DISPATCHED:
        return { label: 'On the way', icon: Truck, color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
      default:
        return { label: 'Active Order', icon: Clock, color: 'text-orange-400', bg: 'bg-orange-500/10' };
    }
  };

  const config = getStatusConfig(activeOrder.status as OrderStatus);
  const Icon = config.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        onClick={() => {
          // Replaced strict hiding logic
          navigate(`/order/${activeOrder.id}`);
        }}
        className="pointer-events-auto mb-3 cursor-pointer group"
      >
        <div className="relative p-[1px] rounded-[1.25rem] overflow-hidden">
          {/* Animated Gradient Border */}
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
                onClick={handleDismiss}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors ml-1"
                aria-label="Dismiss"
               >
                  <X size={14} />
               </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ActiveOrderStrip;
