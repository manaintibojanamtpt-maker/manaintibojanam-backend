import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { getDb } from '../firebase';
import { Order } from '../types';
import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';

const OrderSuccess: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { clearCart } = useCart();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      const searchParams = new URLSearchParams(location.search);
      const orderId = searchParams.get('orderId');

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
  }, [location.search, clearCart]);

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
        <Link to="/" className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold">Back to Menu</Link>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-brand-bg dark:bg-dark-bg flex flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", bounce: 0.5, duration: 0.6 }}
        className="w-32 h-32 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-6"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring", bounce: 0.5 }}
        >
          <CheckCircle2 size={72} className="text-green-500" strokeWidth={2.5} />
        </motion.div>
      </motion.div>
      
      <motion.h1 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-2xl font-black text-gray-900 dark:text-white mb-2"
      >
        Order Placed Successfully!
      </motion.h1>
      
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-gray-500 dark:text-gray-400 mb-10 font-medium"
      >
        Order #{order.orderNumber || order.id.slice(-6).toUpperCase()}
      </motion.p>
      
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="w-full max-w-sm flex flex-col gap-3"
      >
        <Link 
          to={`/order/${order.id}`} 
          className="w-full py-4 bg-green-500 text-white rounded-2xl font-black text-lg shadow-lg shadow-green-500/30 hover:bg-green-600 transition-all active:scale-[0.98]"
        >
          Track Order
        </Link>
        <Link 
          to="/" 
          className="w-full py-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-2xl font-black text-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-[0.98]"
        >
          Back to Menu
        </Link>
      </motion.div>
    </div>
  );
};

export default OrderSuccess;
