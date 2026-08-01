import React, { useEffect, useState } from 'react';
import { collection, query, where, limit, onSnapshot } from 'firebase/firestore';
import { getDb } from '../lib/firebase-db';
import { useStorefrontAuth } from '../hooks/useStorefrontAuth';
import { Order, OrderStatus } from '../types';
import { Clock, CheckCircle2, Package, Truck, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LEGACY_UNPAID_CUSTOMER_LABEL } from '../config/legacyPaymentCopy';
import { findActiveOrder } from '../lib/activeOrder';
import {
  ActiveOrderStripView,
  type ActiveOrderStripViewConfig,
} from '../design-system/layout/ActiveOrderStripView';

const getStatusConfig = (status: OrderStatus): ActiveOrderStripViewConfig => {
  switch (status) {
    case OrderStatus.PAYMENT_VERIFICATION:
      return { label: LEGACY_UNPAID_CUSTOMER_LABEL, icon: Clock, color: 'text-orange-400', bg: 'bg-orange-500/10' };
    case OrderStatus.PENDING:
    case OrderStatus.PAYMENT_PENDING:
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

const ActiveOrderStrip: React.FC = () => {
  const { currentUser } = useStorefrontAuth();
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) {
      setActiveOrder(null);
      return;
    }

    const q = query(
      collection(getDb(), 'orders'),
      where('userId', '==', currentUser.uid),
      limit(25),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(
        (docSnap) => ({ id: docSnap.id, ...docSnap.data() } as Order),
      );
      setActiveOrder(findActiveOrder(orders));
    }, (error) => {
      console.warn('ActiveOrderStrip:', error);
      setActiveOrder(null);
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser]);

  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (activeOrder) {
      const lastSeen = localStorage.getItem(`active_order_seen_${activeOrder.id}`);
      setIsDismissed(lastSeen === activeOrder.status);
    }
  }, [activeOrder]);

  if (!activeOrder || isDismissed) return null;

  const config = getStatusConfig(activeOrder.status as OrderStatus);

  return (
    <ActiveOrderStripView
      visible
      config={config}
      onNavigate={() => navigate(`/order/${activeOrder.id}`)}
      onDismiss={(e) => {
        e.stopPropagation();
        setIsDismissed(true);
      }}
    />
  );
};

export default ActiveOrderStrip;
