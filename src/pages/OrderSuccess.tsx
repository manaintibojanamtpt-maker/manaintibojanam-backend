import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { getDb } from '../lib/firebase-db';
import { Order } from '../types';
import { m } from 'framer-motion';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useTenant } from '../context/TenantContext';

const OrderSuccess: React.FC = () => {
  const location = useLocation();
  const { clearCart } = useCart();
  const { tenantSlug } = useTenant();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const basePath = tenantSlug ? `/k/${tenantSlug}` : '';

  useEffect(() => {
    const fetchOrder = async () => {
      const searchParams = new URLSearchParams(location.search);
      const stateOrderId = (location.state as { orderId?: string } | null)?.orderId;
      const orderId = stateOrderId || searchParams.get('orderId');

      if (!orderId) {
        setError('Order ID not found');
        setIsLoading(false);
        return;
      }

      try {
        const orderDoc = await getDoc(doc(getDb(), 'orders', orderId));
        if (orderDoc.exists()) {
          setOrder({ id: orderDoc.id, ...orderDoc.data() } as Order);
          clearCart(); // Clear cart here just in case
        } else {
          setError('Order not found');
        }
      } catch (err) {
        console.error('Failed to fetch order details:', err);
        setError('Failed to load order details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [location.search, location.state, clearCart]);

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-brand-bg dark:bg-dark-bg">
        <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-brand-bg dark:bg-dark-bg p-6 text-center">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h1 className="text-2xl font-black text-white mb-2">Oops!</h1>
        <p className="text-gray-400 mb-8">{error || 'Could not load order details'}</p>
        <Link to={`${basePath}/menu`} className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold">Back to Menu</Link>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-brand-bg dark:bg-dark-bg flex flex-col items-center justify-center p-6 text-center">
      <m.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", bounce: 0.5, duration: 0.6 }}
        className="w-32 h-32 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-6"
      >
        <m.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring", bounce: 0.5 }}
        >
          <CheckCircle2 size={72} className="text-green-500" strokeWidth={2.5} />
        </m.div>
      </m.div>
      
      <m.h1 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-2xl font-black text-gray-900 dark:text-white mb-2"
      >
        Order Placed Successfully!
      </m.h1>
      
      <m.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-gray-500 dark:text-gray-400 mb-10 font-medium"
      >
        Order #{order.orderNumber || order.id.slice(-6).toUpperCase()}
      </m.p>
      
      <m.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="w-full max-w-sm flex flex-col gap-3"
      >
        <Link 
          to={`${basePath}/order/${order.id}`} 
          className="w-full py-4 bg-green-500 text-white rounded-2xl font-black text-lg shadow-lg shadow-green-500/30 hover:bg-green-600 transition-all active:scale-[0.98]"
        >
          Track Order
        </Link>
        <Link 
          to={`${basePath}/menu`} 
          className="w-full py-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-2xl font-black text-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-[0.98]"
        >
          Back to Menu
        </Link>
      </m.div>
    </div>
  );
};

export default OrderSuccess;
