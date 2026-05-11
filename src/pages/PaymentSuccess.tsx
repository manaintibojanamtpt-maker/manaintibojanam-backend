import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getDb } from '../firebase';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { updateOrderStatus, updatePaymentStatus } from '../services/api';
import { Order, OrderStatus } from '../types';
import { motion } from 'framer-motion';
import { CheckCircle2, X, Home, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';
import { safeParseDate } from '../lib/utils';

const RAZORPAY_ME_LINK = 'https://razorpay.me/@manaintibojanampune492610';

const PaymentSuccess: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { clearCart } = useCart();
  const { currentUser } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const searchParams = new URLSearchParams(location.search);
  const queryOrderId = searchParams.get('orderId');

  useEffect(() => {
    const loadOrder = async () => {
      try {
        const stored = localStorage.getItem('manual_payment_order');
        const storedOrder = stored ? JSON.parse(stored) : null;
        const orderId = queryOrderId || storedOrder?.orderId;

        if (!orderId) {
          throw new Error('No payment session found. Please place a new order.');
        }

        const orderRef = doc(getDb(), 'orders', orderId);
        const snapshot = await getDoc(orderRef);
        if (!snapshot.exists()) {
          throw new Error('Order not found. Please contact support.');
        }

        const orderData = { id: snapshot.id, ...snapshot.data() } as Order;
        console.log('[PaymentSuccess] loaded order', orderData.id, 'status=', orderData.status, 'paymentStatus=', orderData.paymentStatus);
        const expiresAt = safeParseDate(orderData.expiresAt).getTime();
        const now = Date.now();

        if (orderData.status !== OrderStatus.EXPIRED && now > expiresAt) {
          await updateDoc(orderRef, {
            status: OrderStatus.EXPIRED,
            paymentStatus: 'expired',
            updatedAt: serverTimestamp()
          });
          orderData.status = OrderStatus.EXPIRED;
          orderData.paymentStatus = 'expired';
        }

        setOrder(orderData);
        clearCart();
      } catch (err: any) {
        console.error('[PaymentSuccess] loadOrder error', err);
        setError(err.message || 'Failed to load payment confirmation.');
      } finally {
        setIsLoading(false);
      }
    };

    loadOrder();
  }, [clearCart, queryOrderId]);



  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-brand-bg dark:bg-dark-bg p-6">
        <div className="w-24 h-24 bg-white rounded-[2rem] shadow-sm flex items-center justify-center text-green-600 mb-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
        <p className="text-gray-500 font-medium text-center">Loading payment confirmation...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-brand-bg dark:bg-dark-bg p-6">
        <div className="w-24 h-24 bg-red-100 rounded-[2rem] shadow-sm flex items-center justify-center text-red-600 mb-8">
          <X size={36} />
        </div>
        <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-4">Payment Session Missing</h2>
        <p className="text-gray-500 dark:text-gray-400 text-center mb-8">{error || 'Please return to checkout and place your order again.'}</p>
        <div className="flex gap-4">
          <Link to="/checkout" className="btn-orange px-8 py-3">Go to Checkout</Link>
          <Link to="/" className="btn-secondary px-8 py-3">Back Home</Link>
        </div>
      </div>
    );
  }

  const isExpired = order.status === OrderStatus.EXPIRED;
  const amountLabel = order.totalAmount ? `₹${order.totalAmount.toFixed(2)}` : '₹0.00';

  return (
    <div className="min-h-screen bg-brand-bg dark:bg-dark-bg">
      <div className="w-full px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white dark:bg-dark-card rounded-[2rem] shadow-2xl p-8 sm:p-12 text-center"
        >
          <div className="mx-auto mb-8 w-28 h-28 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
            <CheckCircle2 size={48} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white mb-4">Payment Confirmed!</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 font-bold">
            We've received your payment and your order is confirmed.
          </p>
          <div className="rounded-3xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-6 text-left mb-8">
            <p className="text-xs uppercase tracking-[0.3em] font-black text-gray-400 dark:text-gray-500 mb-3">Order Number</p>
            <p className="text-xl font-black text-gray-900 dark:text-white">#{order.orderNumber || order.id.slice(-6).toUpperCase()}</p>
          </div>
          <div className="grid gap-4 mb-8 sm:grid-cols-2">
            <div className="rounded-3xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-6 text-left">
              <p className="text-xs uppercase tracking-[0.3em] font-black text-gray-400 dark:text-gray-500 mb-3">Payment</p>
              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <CheckCircle2 size={20} /> Successful
              </p>
            </div>
            <div className="rounded-3xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-6 text-left">
              <p className="text-xs uppercase tracking-[0.3em] font-black text-gray-400 dark:text-gray-500 mb-3">Delivery</p>
              <p className="text-xl font-black text-gray-900 dark:text-white">
                {order.deliveryType === 'scheduled'
                  ? `Delivery at ${safeParseDate(order.scheduledTime || order.scheduledFor).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}`
                  : 'Within 60 mins'}
              </p>
            </div>
          </div>
          <div className="rounded-3xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-6 text-left">
            <p className="text-xs uppercase tracking-[0.3em] font-black text-gray-400 dark:text-gray-500 mb-3">Payment Amount</p>
            <p className="text-xl font-black text-gray-900 dark:text-white">{amountLabel}</p>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/" className="px-8 py-3 rounded-3xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-black uppercase tracking-[0.16em] hover:bg-gray-200 dark:hover:bg-gray-700 transition-all">
              Back to Home
            </Link>
            <Link to={`/order/${order.id}`} className="px-8 py-3 rounded-3xl bg-white dark:bg-gray-900 text-red-600 dark:text-red-400 font-black uppercase tracking-[0.16em] border border-gray-200 dark:border-gray-800 hover:bg-red-50 dark:hover:bg-gray-800 transition-all">
              Track Order
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
