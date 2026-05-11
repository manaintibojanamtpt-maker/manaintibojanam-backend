import React, { useEffect, useState, useMemo } from "react";
import { 
  subscribeToOrders, 
  updateOrderStatus as apiUpdateOrderStatus, 
  getDisplayStatus 
} from "../services/api";
import { getOrderDisplayState } from "../lib/orderDisplay";
import { OrderStatus, Order } from "../types";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Clock, ChevronRight, XCircle, RefreshCcw, MapPin, Star, FileText } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";
import { addDoc, serverTimestamp, collection, doc, updateDoc } from "firebase/firestore";
import { getDb } from "../firebase";
import DigitalInvoice from "../components/DigitalInvoice";
import { formatPrice, safeParseDate } from "../lib/utils";

export default function MyOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  
  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      // First, prioritize by order status - active orders before completed ones
      const activeStatuses = ['placed', 'pending', 'payment_pending', 'payment_verification', 'accepted', 'preparing', 'ready', 'courrier_booked', 'picked_up', 'out_for_delivery'];
      const aIsActive = activeStatuses.includes(String(a.status || '').toLowerCase());
      const bIsActive = activeStatuses.includes(String(b.status || '').toLowerCase());
      
      if (aIsActive && !bIsActive) return -1;
      if (!aIsActive && bIsActive) return 1;

      // Then prioritize by delivery type - live (asap) orders before scheduled
      const aDelivery = a.deliveryType || 'asap';
      const bDelivery = b.deliveryType || 'asap';

      if (aDelivery === 'asap' && bDelivery !== 'asap') return -1;
      if (aDelivery !== 'asap' && bDelivery === 'asap') return 1;

      // For scheduled orders, sort by scheduled time
      if (aDelivery === 'scheduled' && bDelivery === 'scheduled') {
        const aScheduled = safeParseDate(a.scheduledTime || a.scheduledFor).getTime();
        const bScheduled = safeParseDate(b.scheduledTime || b.scheduledFor).getTime();
        if (aScheduled !== bScheduled) return aScheduled - bScheduled;
      }

      // Finally, sort by creation time (newest first)
      const aCreated = safeParseDate(a.createdAt).getTime();
      const bCreated = safeParseDate(b.createdAt).getTime();
      return bCreated - aCreated;
    });
  }, [orders]);
  const [ratingOrder, setRatingOrder] = useState<any>(null);
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState("");
  const [showInvoice, setShowInvoice] = useState<any>(null);
  const [now, setNow] = useState(Date.now());
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const handleRatingSubmit = async () => {
    if (!ratingOrder || !currentUser) return;

    try {
      await addDoc(collection(getDb(), "reviews"), {
        orderId: ratingOrder.id,
        userId: currentUser.uid,
        userName: currentUser.displayName || "Customer",
        rating,
        feedback,
        items: ratingOrder.items.map((i: any) => i.name),
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(getDb(), "orders", ratingOrder.id), {
        rating,
        feedback
      });

      toast.success("Thank you for your feedback! ❤️");
      setRatingOrder(null);
      setRating(5);
      setFeedback("");
    } catch (err: any) {
      console.error("Rating error:", err);
      toast.error("Failed to save rating");
    }
  };

  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = subscribeToOrders((ordersList) => {
      setOrders(ordersList);
      setLoading(false);
    }, currentUser.uid);

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleCancelOrder = async (orderId: string) => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;

    try {
      await apiUpdateOrderStatus(orderId, OrderStatus.CANCELLED);
      toast.success("Order cancelled successfully");
    } catch (err: any) {
      console.error("Cancel error:", err);
      toast.error(err.message || "Failed to cancel order");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 px-4 sm:px-6">
      <AnimatePresence>
        {showInvoice && (
          <DigitalInvoice order={showInvoice} onClose={() => setShowInvoice(null)} />
        )}
      </AnimatePresence>

      <div className="max-w-3xl mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">My Orders</h1>
          <p className="text-sm text-gray-500 font-medium">Track and manage your past orders</p>
        </div>

        {orders.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-brand-bg dark:bg-dark-bg p-8 text-center flex flex-col items-center justify-center py-20"
          >
            <div className="w-40 h-40 mb-6 relative flex items-center justify-center">
              <div className="absolute inset-0 bg-red-100 dark:bg-red-900/10 rounded-full animate-pulse opacity-50"></div>
              <div className="absolute inset-5 bg-red-50 dark:bg-red-900/20 rounded-full"></div>
              <ShoppingBag size={48} className="text-red-500 relative z-10" strokeWidth={1.5} />
            </div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">Your history is clear</h2>
            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-8 max-w-xs mx-auto leading-relaxed">
              Every great dining experience starts with a first order. Let's make today special.
            </p>
            <Link to="/menu" className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 font-black rounded-2xl shadow-xl shadow-red-600/30 transition-transform active:scale-95 w-full max-w-[280px] uppercase tracking-widest text-sm inline-block">
              Browse Menu
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {sortedOrders.map((order, index) => {
              const displayState = getOrderDisplayState(order, new Date());
              const itemsText = (order.items || []).map((item: any) => `${item.name} x${item.quantity}`).join(', ');
              
              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.03, 0.18) }}
                  className="bg-gradient-to-br from-gray-900 to-black rounded-2xl border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:border-white/20 transition-all overflow-hidden group"
                >
                  <div className="p-5 sm:p-6">
                    {/* Header: Title, Status, Price */}
                    <div className="flex justify-between items-start gap-4 mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <h3 className="text-lg font-black text-white tracking-tight">Mana Inti Bojanam</h3>
                          <span className="text-[10px] font-bold bg-white/10 text-gray-300 px-2 py-0.5 rounded-md">#{order.orderNumber}</span>
                        </div>
                        <p className="text-sm font-medium text-gray-400 line-clamp-2 leading-relaxed">{itemsText}</p>
                      </div>
                      <div className="text-right flex-shrink-0 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                        <p className="text-lg font-black text-white">{formatPrice(order.totalAmount)}</p>
                      </div>
                    </div>

                    {/* Meta: Time & Status */}
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b border-white/10 pb-5 mb-5">
                      <div className="flex items-center gap-2 text-gray-400 font-medium">
                        <Clock size={14} className="text-gray-500" />
                        <span>{safeParseDate(order.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {displayState.orderStage !== 'delivered' && displayState.orderStage !== 'cancelled' && (
                          <span className="flex h-2 w-2 rounded-full bg-red-500 animate-ping shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                        )}
                        <span className={`px-3 py-1.5 rounded-lg font-black uppercase tracking-widest text-[9px] shadow-inner border border-black/10 ${getStatusColor(order.status)}`}>
                          {getDisplayStatus(order.status)}
                        </span>
                        {displayState.orderStage === "future_scheduled" && (
                           <span className="text-amber-400 font-black text-[9px] uppercase tracking-widest bg-amber-900/30 border border-amber-500/30 px-3 py-1.5 rounded-lg shadow-inner">Scheduled</span>
                        )}
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className="flex flex-wrap items-center gap-3">
                      <Link 
                        to={`/order/${order.id}`}
                        className="flex-1 sm:flex-none text-center bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-black text-xs transition-colors shadow-[0_0_15px_rgba(220,38,38,0.3)] active:scale-95"
                      >
                        Track Order
                      </Link>
                      
                      {order.status === OrderStatus.DELIVERED && !order.rating && (
                        <button 
                          onClick={() => setRatingOrder(order)}
                          className="flex-1 sm:flex-none text-center bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 px-6 py-3 rounded-xl font-black text-xs transition-colors active:scale-95"
                        >
                          Rate Order
                        </button>
                      )}
                      
                      <button 
                        onClick={() => {
                          toast.success("Items added back to cart!");
                          navigate('/menu');
                        }}
                        className="flex-1 sm:flex-none text-center bg-transparent border-2 border-white/20 text-white hover:border-white/40 hover:bg-white/5 px-6 py-3 rounded-xl font-black text-xs transition-colors active:scale-95"
                      >
                        Reorder
                      </button>

                      {order.status === OrderStatus.DELIVERED && (
                        <button 
                          onClick={() => setShowInvoice(order)}
                          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                          title="View Invoice"
                        >
                          <FileText size={16} />
                        </button>
                      )}

                      {(order.status === OrderStatus.PENDING) && ((now - safeParseDate(order.createdAt).getTime()) / 1000 < 60) && (
                        <button 
                          onClick={() => handleCancelOrder(order.id)}
                          className="text-red-400 hover:text-red-300 text-[10px] uppercase tracking-widest font-black px-4 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 transition-colors ml-auto active:scale-95"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* RATING MODAL */}
      <AnimatePresence>
        {ratingOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRatingOrder(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl"
            >
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">Rate Your Experience</h3>
                <p className="text-xs text-gray-500 mt-1">How was the food?</p>
              </div>

              <div className="flex justify-center gap-2 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="transition-transform active:scale-90"
                  >
                    <Star 
                      size={32} 
                      className={`${star <= rating ? "fill-red-500 text-red-500" : "text-gray-200"} transition-colors`} 
                    />
                  </button>
                ))}
              </div>

              <div className="mb-6">
                <textarea 
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none resize-none"
                  rows={3}
                  placeholder="Tell us what you liked..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                />
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setRatingOrder(null)}
                  className="flex-1 py-3 rounded-xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 text-sm transition-colors"
                >
                  Skip
                </button>
                <button 
                  onClick={handleRatingSubmit}
                  className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-red-700 transition-colors"
                >
                  Submit
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case OrderStatus.PENDING: return 'bg-blue-50 text-blue-600';
    case OrderStatus.PAYMENT_PENDING: 
    case OrderStatus.PAYMENT_VERIFICATION: return 'bg-yellow-50 text-yellow-600';
    case OrderStatus.ACCEPTED: return 'bg-emerald-50 text-emerald-600';
    case OrderStatus.PREPARING: return 'bg-orange-50 text-orange-600';
    case OrderStatus.OUT_FOR_DELIVERY: return 'bg-purple-50 text-purple-600';
    case OrderStatus.DELIVERED: return 'bg-green-50 text-green-600';
    case OrderStatus.CANCELLED: return 'bg-red-50 text-red-600';
    default: return 'bg-gray-50 text-gray-600';
  }
}
