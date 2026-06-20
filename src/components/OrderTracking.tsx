import React, { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { 
  CheckCircle2, 
  Clock, 
  ChefHat, 
  Bike, 
  PackageCheck, 
  ArrowLeft,
  Phone,
  MapPin,
  MessageCircle,
  XCircle,
  AlertCircle,
  RefreshCcw,
  Star,
  MessageSquare,
  Send,
  Utensils,
  ChevronDown
} from "lucide-react";
import { motion, AnimatePresence, useScroll, useSpring, useTransform } from "framer-motion";
import { doc, onSnapshot, updateDoc, collection, addDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { getDb, handleFirestoreError, OperationType } from '../lib/firebase-db';
import { OrderStatus } from "../types";
import toast from "react-hot-toast";
import DigitalInvoice from "./DigitalInvoice";
import { FileText, Bell, BellOff } from "lucide-react";
import { notificationService } from "../services/NotificationService";
import { useStoreBranding } from "../hooks/useStoreBranding";
import { formatPrice, safeParseDate } from "../lib/utils";
import { getOrderDisplayState } from "../lib/orderDisplay";

const toPaise = (rupees: number) => Math.round(rupees * 100);
const fromPaise = (paise: number) => paise / 100;

const STATUS_STEPS = [
  { id: 'created', label: 'Order created', icon: <Clock size={24} />, description: 'We have received your order' },
  { id: 'scheduled', label: 'Scheduled', icon: <Clock size={24} />, description: 'Your order will begin at the scheduled time' },
  { id: 'preparing', label: 'Preparing', icon: <ChefHat size={24} />, description: 'Our chef is preparing your meal' },
  { id: 'ready', label: 'Ready', icon: <PackageCheck size={24} />, description: 'Your order is ready for delivery' },
  { id: 'dispatched', label: 'Out for Delivery', icon: <Bike size={24} />, description: 'Your food is on the way' },
  { id: 'delivered', label: 'Delivered', icon: <PackageCheck size={24} />, description: 'Enjoy your meal!' },
  { id: 'expired', label: 'Expired', icon: <AlertCircle size={24} />, description: 'Payment expired before confirmation' },
  { id: 'cancelled', label: 'Cancelled', icon: <XCircle size={24} />, description: 'This order was cancelled' }
] as const;

export default function OrderTracking() {
  const { orderId } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(60);
  const [canCancel, setCanCancel] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  const [prevStatus, setPrevStatus] = useState<string | null>(null);
  const [etaRemaining, setEtaRemaining] = useState<number | null>(null);
  const etaIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { brandName } = useStoreBranding();
  const { scrollYProgress } = useScroll();
  const scrollProgress = useSpring(scrollYProgress, { stiffness: 320, damping: 42, mass: 0.7 });

  const refreshOrder = async () => {
    if (!orderId) return;
    setIsRefreshing(true);
    try {
      const docRef = doc(getDb(), "orders", orderId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setOrder({ id: docSnap.id, ...docSnap.data() });
        toast.success("Order updated");
      }
    } catch (err) {
      console.error("Refresh error:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!orderId) return;

    // Check if notifications are already granted
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
      if (Notification.permission === 'granted') {
        setNotificationsEnabled(true);
      }
    }

    const unsub = onSnapshot(doc(getDb(), "orders", orderId), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        const orderSnapshot = { id: doc.id, ...data } as any;
        const displayState = getOrderDisplayState(orderSnapshot, new Date());
        setOrder(orderSnapshot);

        
        // Calculate ETA
        const terminalStatuses = [
          OrderStatus.CANCELLED,
          OrderStatus.READY,
          OrderStatus.DELIVERED,
          OrderStatus.EXPIRED,
          OrderStatus.FAILED_DELIVERY
        ];
        const isPaymentFailed = data.paymentStatus === 'failed';
        if (terminalStatuses.includes(data.status) || isPaymentFailed || displayState.orderStage === 'future_scheduled') {
          if (etaIntervalRef.current) {
            clearInterval(etaIntervalRef.current);
            etaIntervalRef.current = null;
          }
          setEtaRemaining(null);
        } else {
          const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
          const prepTime = data.prepTime || 20;
          const deliveryTime = data.deliveryTime || 20;
          const eta = new Date(createdAt.getTime() + (prepTime + deliveryTime) * 60000);
          
          if (etaIntervalRef.current) clearInterval(etaIntervalRef.current);
          
          const updateEta = () => {
            const now = new Date();
            const diffInMs = eta.getTime() - now.getTime();
            setEtaRemaining(Math.max(0, Math.floor(diffInMs / 60000)));
          };
          updateEta();
          etaIntervalRef.current = setInterval(updateEta, 1000);
        }
        
        if (prevStatus && prevStatus !== data.status) {
          notificationService.simulatePushNotification(orderId!, data.status);
          
          const statusLabels: Record<string, string> = {
            [OrderStatus.PREPARING]: 'Our chef is now preparing your meal! 👨‍🍳',
            [OrderStatus.OUT_FOR_DELIVERY]: 'Your food is out for delivery! 🛵',
            [OrderStatus.DELIVERED]: 'Your delicious meal has been delivered! Enjoy! 🍛',
            [OrderStatus.CANCELLED]: 'Your order has been cancelled.'
          };
          
          if (statusLabels[data.status]) {
            toast.success(statusLabels[data.status], {
              duration: 5000,
              icon: '🔔'
            });
            
            // Play a sound for status updates
            try {
              // Avoid loading external audio assets that may be blocked.
            } catch (e) {}
          }
        }
        setPrevStatus(data.status);
        
        if (data.status === OrderStatus.DELIVERED && !data.reviewed) {
          setShowRating(true);
        }

        // Calculate time left for cancellation
        if (data.status === OrderStatus.PLACED || data.status === OrderStatus.PENDING) {
          const orderTime = data.createdAt?.seconds ? data.createdAt.seconds * 1000 : new Date(data.createdAt).getTime();
          const now = new Date().getTime();
          const diffInSeconds = Math.floor((now - orderTime) / 1000);
          const remaining = 60 - diffInSeconds;
          
          if (remaining > 0) {
            setTimeLeft(remaining);
            setCanCancel(true);
          } else {
            setTimeLeft(0);
            setCanCancel(false);
          }
        } else {
          setCanCancel(false);
        }
      } else {
        toast.error("Order not found");
      }
      setLoading(false);
    }, (err) => {
      console.error("Order Tracking Error:", err);
      if (err.code === 'permission-denied') {
        handleFirestoreError(err, OperationType.GET, `orders/${orderId}`);
      }
      toast.error("Failed to track order");
      setLoading(false);
    });

    return () => {
      unsub();
      if ((window as any).supportUnsubscribe) {
        (window as any).supportUnsubscribe();
      }
      if (etaIntervalRef.current) clearInterval(etaIntervalRef.current);
    };
  }, [orderId]);

  useEffect(() => {
    if (canCancel && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setCanCancel(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [canCancel, timeLeft]);

  const handleEnableNotifications = async () => {
    const granted = await notificationService.requestPermission();
    if (granted) {
      setNotificationsEnabled(true);
      toast.success('Notifications enabled successfully!');
    } else {
      toast.error('Permission denied for notifications.');
    }
  };

  const handleCancelOrder = async () => {
    if (!canCancel) {
      toast.error("Cancellation window has expired.");
      return;
    }

    if (!window.confirm("Are you sure you want to cancel this order?")) return;

    try {
      await updateDoc(doc(getDb(), "orders", orderId!), {
        status: OrderStatus.CANCELLED
      });
      toast.success("Order cancelled successfully");
    } catch (err: any) {
      console.error("Cancel error:", err);
      if (err.code === 'permission-denied') {
        handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}`);
      }
      toast.error("Failed to cancel order");
    }
  };

  const handleSubmitReview = async () => {
    if (!orderId || !order) return;
    setIsSubmittingReview(true);
    try {
      await addDoc(collection(getDb(), "reviews"), {
        orderId,
        orderNumber: order.orderNumber,
        userId: order.userId,
        rating,
        review: reviewText,
        items: order.items.map((i: any) => i.name),
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(getDb(), "orders", orderId), {
        reviewed: true
      });

      setReviewSubmitted(true);
      toast.success("Thank you for your feedback!");
      setTimeout(() => setShowRating(false), 2000);
    } catch (err: any) {
      console.error("Review Error:", err);
      if (err.code === 'permission-denied') {
        handleFirestoreError(err, OperationType.WRITE, "reviews/orders");
      }
      toast.error("Failed to submit review");
    } finally {
      setIsSubmittingReview(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
        <h2 className="text-2xl font-black text-gray-900 mb-4">Order Not Found</h2>
        <Link to="/" className="bg-red-600 text-white px-8 py-3 rounded-2xl font-bold">Go Back Home</Link>
      </div>
    );
  }

  const displayState = getOrderDisplayState(order, new Date());
  const currentStepIndex = STATUS_STEPS.findIndex(s => s.id === displayState.phase);

  // Filter out 'expired' step for COD orders since they never expire
  const filteredStatusSteps = STATUS_STEPS.filter(step => 
    !(step.id === 'expired' && (order?.paymentMethod === 'cod' || order?.isCOD))
  );
  
  // Recalculate currentStepIndex after filtering
  const filteredCurrentStepIndex = filteredStatusSteps.findIndex(s => s.id === displayState.phase);
  const statusProgress = filteredStatusSteps.length > 1
    ? Math.max(0, Math.min(1, filteredCurrentStepIndex / (filteredStatusSteps.length - 1)))
    : 0;
  const currentStatusStep = filteredStatusSteps[Math.max(0, filteredCurrentStepIndex)] || filteredStatusSteps[0];
  const nextStatusStep = filteredStatusSteps[filteredCurrentStepIndex + 1] || null;

  // Integer-based math for currency
  const subtotalPaise = toPaise(order.subtotal || 0);
  const gstPaise = toPaise(order.gstAmount || 0);
  const packingPaise = toPaise(order.packingFee || 0);
  const deliveryPaise = toPaise(order.deliveryFee || 0);
  const totalPaidPaise = subtotalPaise + gstPaise + packingPaise + deliveryPaise;
  const totalPaid = fromPaise(totalPaidPaise);

  const generateWhatsAppMessage = () => {
    const items = order.items.map((i: any) => `${i.name} x ${i.quantity}`).join(', ');
    const text = `Hello! I'm tracking my order #${order.orderNumber}.\nItems: ${items}\nTotal: ${formatPrice(totalPaid)}\nStatus: ${order.status}`;
    return `https://wa.me/917666258454?text=${encodeURIComponent(text)}`;
  };

  if (order.orderType === 'subscription_master') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Link to="/my-orders" className="p-2 -ml-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
            <ArrowLeft size={24} className="text-gray-900 dark:text-white" />
          </Link>
          <h1 className="text-xl font-black text-gray-900 dark:text-white">Service Details</h1>
        </div>

        {/* Service Status Card */}
        <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-3xl p-6 text-white shadow-xl shadow-red-600/20 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={24} className="text-white" />
            <h2 className="text-xl font-black tracking-tight">Your Monthly Meal Plan is Active!</h2>
          </div>
          <p className="text-orange-100 text-sm font-semibold mb-4">
            Day 1 of 30 - Today's {order.deliveryTimeSlot || 'meal'} is arriving based on your schedule.
          </p>

          <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 flex justify-between items-center">
            <div>
              <p className="text-[10px] text-orange-100 font-bold uppercase tracking-widest mb-1">Status</p>
              <p className="text-sm font-black text-white bg-green-500/80 px-2 py-0.5 rounded-md inline-block">Payment Confirmed via Razorpay</p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex flex-col gap-3">
          <Link to="/subscription" className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-700 py-4 rounded-2xl font-black text-center shadow-sm hover:border-gray-300 dark:hover:border-gray-600 transition-all">
            Go to Subscription Dashboard
          </Link>
          <a href={generateWhatsAppMessage()} className="w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-2xl font-black text-center shadow-lg shadow-green-500/20 transition-all flex items-center justify-center gap-2">
            <MessageCircle size={20} /> Contact Support
          </a>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="min-h-screen bg-brand-bg dark:bg-dark-bg flex flex-col" 
      style={{ minHeight: '100dvh', paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
    >
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-2 sm:px-3"
        style={{
          paddingTop: 'calc(0.5rem + env(safe-area-inset-top))',
          paddingLeft: 'max(0.5rem, env(safe-area-inset-left))',
          paddingRight: 'max(0.5rem, env(safe-area-inset-right))'
        }}
      >
      <motion.div className="fixed left-0 right-0 top-0 z-[60] h-1 origin-left bg-gradient-to-r from-orange-500 via-red-500 to-rose-500" style={{ scaleX: scrollProgress }} />
      {/* PULL TO REFRESH INDICATOR */}
      <AnimatePresence>
        {isRefreshing && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 60, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden flex items-center justify-center bg-red-50 text-red-600 rounded-b-3xl mb-4"
          >
            <RefreshCcw size={20} className="animate-spin" />
            <span className="ml-2 font-black text-xs uppercase tracking-widest">Refreshing...</span>
          </motion.div>
        )}
      </AnimatePresence>
      {/* DIGITAL INVOICE MODAL */}
      <AnimatePresence>
        {showInvoice && (
          <DigitalInvoice order={order} onClose={() => setShowInvoice(false)} />
        )}
      </AnimatePresence>

      {/* RATING MODAL */}
      <AnimatePresence>
        {showRating && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-3xl p-10 max-w-md w-full shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-2 bg-red-600" />
              
              {!reviewSubmitted ? (
                <>
                  <div className="text-center mb-5">
                    <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
                      <Utensils size={40} className="text-red-600" />
                    </div>
                    <h2 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Rate Your Meal</h2>
                    <p className="text-gray-500 font-medium">How was the food from {brandName}?</p>
                  </div>

                  <div className="flex justify-center gap-3 mb-5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRating(star)}
                        className="transition-transform active:scale-90"
                      >
                        <Star 
                          size={40} 
                          className={`${rating >= star ? 'fill-red-500 text-red-500' : 'text-gray-200'} transition-colors`} 
                        />
                      </button>
                    ))}
                  </div>

                  <div className="space-y-4 mb-5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Your Feedback</label>
                    <textarea
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      placeholder="Tell us what you liked or how we can improve..."
                      className="w-full p-5 bg-gray-50 border-none rounded-2xl font-medium text-gray-900 focus:ring-2 focus:ring-red-500 outline-none min-h-[120px] resize-none"
                    />
                  </div>

                  <button
                    onClick={handleSubmitReview}
                    disabled={isSubmittingReview}
                    className="w-full py-5 bg-red-600 text-white rounded-2xl font-black text-lg hover:bg-red-700 transition-all shadow-xl shadow-red-600/20 flex items-center justify-center gap-3"
                  >
                    {isSubmittingReview ? (
                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send size={20} />
                        <span>Submit Review</span>
                      </>
                    )}
                  </button>
                  
                  <button 
                    onClick={() => setShowRating(false)}
                    className="w-full mt-4 py-2 text-gray-400 font-bold text-sm hover:text-gray-600 transition-colors"
                  >
                    Maybe later
                  </button>
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
                    <CheckCircle2 size={40} className="text-green-600" />
                  </div>
                  <h2 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Thank You!</h2>
                  <p className="text-gray-500 font-medium">Your review helps us serve you better.</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* HEADER */}
      <div className="bg-white/80 dark:bg-dark-bg/85 backdrop-blur-xl border-b border-gray-100 dark:border-white/5 sticky top-0 z-50">
        <div className="px-3 py-4 sm:px-4 sm:py-5 lg:max-w-3xl lg:mx-auto flex items-center justify-between">
          <Link to="/" className="p-2 hover:bg-gray-50 dark:hover:bg-white/10 rounded-xl transition-colors">
            <ArrowLeft size={24} className="text-gray-900 dark:text-white" />
          </Link>
          <div className="text-center">
            <p className="text-[10px] font-black text-gray-500 dark:text-white/40 uppercase tracking-[0.2em]">Tracking Order</p>
            <h1 className="text-xl font-black text-gray-900 dark:text-white">#{order.orderNumber}</h1>
          </div>
          <div className="flex gap-2">
            {!notificationsEnabled && notificationPermission !== 'denied' && (
              <button 
                onClick={handleEnableNotifications}
                className="p-2 hover:bg-red-50 rounded-xl text-red-600 transition-colors"
                title="Enable Push Notifications"
              >
                <Bell size={24} />
              </button>
            )}
            {notificationPermission === 'denied' && (
              <div className="p-2 text-red-600" title="Notifications Denied">
                <BellOff size={24} />
              </div>
            )}
            {order.status === OrderStatus.DELIVERED && (
              <button 
                onClick={() => setShowInvoice(true)}
                className="p-2 hover:bg-red-50 rounded-xl text-red-600 transition-colors"
                title="Download Invoice"
              >
                <FileText size={24} />
              </button>
            )}
            <a href={generateWhatsAppMessage()} target="_blank" rel="noreferrer" className="p-2 hover:bg-green-50 rounded-xl text-green-600 transition-colors" title="Contact on WhatsApp">
              <MessageCircle size={24} />
            </a>
            {canCancel && (
              <button 
                onClick={handleCancelOrder}
                className="p-2 hover:bg-red-50 rounded-xl text-red-600 transition-colors"
                title="Cancel Order"
              >
                <XCircle size={24} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-2 sm:px-3 mt-2 lg:max-w-3xl lg:mx-auto">
        
        {/* LIVE STATUS HERO */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24 }}
          className="mb-4 rounded-2xl border border-red-100 bg-white p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-gray-400">Live order status</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-gray-900">{displayState.customerTitle || currentStatusStep?.label}</h2>
              <p className="mt-1 text-sm font-medium text-gray-500">{displayState.customerSubtitle || currentStatusStep?.description}</p>
            </div>
            <motion.div
              className="inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-red-600"
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Live
            </motion.div>
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-[11px] font-black uppercase tracking-[0.18em] text-gray-500">
              <span>{currentStatusStep?.label || 'In progress'}</span>
              <span>{Math.round(statusProgress * 100)}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-orange-500 via-red-500 to-red-600"
                initial={false}
                animate={{ width: `${statusProgress * 100}%` }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-gray-500">
                {nextStatusStep ? `Up next: ${nextStatusStep.label}` : 'Final status reached'}
              </p>
              <Link
                to="#order-details"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('order-details')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.2em] text-red-600 hover:underline"
              >
                View full timeline
                <ChevronDown size={14} />
              </Link>
            </div>
          </div>
        </motion.div>

        {/* DELIVERY DETAILS MVP */}
        {order.deliveryPartner && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-3">
              <Bike className="text-blue-500" size={20} />
              <h3 className="text-lg font-black text-gray-900">Delivery Information</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Partner</p>
                <p className="font-semibold text-gray-800">{order.deliveryPartner}</p>
              </div>
              {order.riderName && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Rider</p>
                  <p className="font-semibold text-gray-800">{order.riderName}</p>
                </div>
              )}
              {order.riderPhone && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Contact</p>
                  <a href={`tel:${order.riderPhone}`} className="font-semibold text-blue-600 flex items-center gap-1">
                    <Phone size={14} /> {order.riderPhone}
                  </a>
                </div>
              )}
            </div>

            {order.trackingUrl && (
              <a 
                href={order.trackingUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <MapPin size={18} /> Track Live Delivery
              </a>
            )}
          </motion.div>
        )}

        {/* CANCELLATION TIMER */}
        <AnimatePresence>
          {canCancel && (order.status === OrderStatus.PLACED || order.status === OrderStatus.PENDING) && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-red-600 text-white rounded-2xl p-8 shadow-xl shadow-red-600/20 mb-5 flex flex-col sm:flex-row items-center justify-between gap-6"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl font-black">
                  {timeLeft}
                </div>
                <div>
                  <h3 className="text-xl font-black">Cancellation Window</h3>
                  <p className="text-white/80 font-medium">You can cancel within 60 seconds</p>
                </div>
              </div>
              <button 
                onClick={handleCancelOrder}
                className="bg-white text-red-600 px-8 py-3 rounded-xl font-black hover:bg-gray-100 transition-all active:scale-95 flex items-center gap-2"
              >
                <XCircle size={20} /> Cancel Order
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* STATUS TIMELINE */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 mb-4">
          {displayState.phase === 'cancelled' ? (
            <div className="text-center py-8 text-lg font-bold text-red-600">
              Order Cancelled ❌
            </div>
          ) : (
            <>
              {displayState.isInvalidPayment && (
                <div className="mb-4">
                  <div className="bg-red-50 dark:bg-red-900/10 rounded-xl px-4 py-4 shadow-sm border border-red-100 dark:border-red-900/30 inline-flex flex-col items-center gap-1 mx-auto max-w-sm">
                    <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest">{displayState.customerTitle}</span>
                    <p className="text-xs text-red-700 dark:text-red-300 text-center">{displayState.customerSubtitle}</p>
                  </div>
                </div>
              )}

              {displayState.showScheduledLabel && !displayState.isInvalidPayment && (
                <div className="mb-5">
                  <div className="bg-yellow-50 dark:bg-yellow-900/10 rounded-2xl p-4 shadow-sm border border-yellow-100 dark:border-yellow-900/30 inline-flex flex-col items-center gap-2 mx-auto max-w-md">
                    <span className="text-[11px] font-black text-amber-700 uppercase tracking-[0.24em]">Scheduled Delivery</span>
                    <h2 className="text-2xl sm:text-3xl font-black text-amber-600 tracking-tight">{displayState.customerTitle}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center">{displayState.customerSubtitle}</p>
                  </div>
                </div>
              )}

              {order.deliveryType === 'scheduled' ? (
                <div className="mb-5">
                  <div className="bg-yellow-50 dark:bg-yellow-900/10 rounded-2xl p-4 shadow-sm border border-yellow-100 dark:border-yellow-900/30 inline-flex flex-col items-center gap-2 mx-auto max-w-md">
                    <span className="text-[11px] font-black text-amber-700 uppercase tracking-[0.24em]">Scheduled Delivery</span>
                    <h2 className="text-2xl sm:text-3xl font-black text-amber-600 tracking-tight">
                      Delivery at {safeParseDate(order.scheduledTime || order.scheduledFor).toLocaleString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Your delivery is scheduled for the selected time slot.</p>
                  </div>
                </div>
              ) : displayState.showEta && etaRemaining !== null ? (
                <div className="mb-5">
                  <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 inline-flex flex-col items-center gap-2 mx-auto max-w-md">
                    <span className="text-[11px] font-black text-gray-500 uppercase tracking-[0.24em]">Estimated Delivery</span>
                    <h2 className="text-2xl sm:text-3xl font-black text-red-600 tracking-tight">Arriving in {Math.max(0, etaRemaining)} mins</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Delivered fresh to your doorstep soon.</p>
                  </div>
                </div>
              ) : null}

              <div className="space-y-6 pt-2">
                {filteredStatusSteps.map((step, index) => {
                  const isCompleted = index < filteredCurrentStepIndex;
                  const isCurrent = index === filteredCurrentStepIndex;
                  const isLast = index === filteredStatusSteps.length - 1;

                  return (
                    <motion.div
                      key={step.id}
                      className="relative flex gap-4"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22, delay: Math.min(index * 0.05, 0.25) }}
                    >
                      {!isLast && (
                        <div className={`absolute left-4 top-6 bottom-[-16px] w-0.5 ${isCompleted ? 'bg-red-500' : 'bg-gray-100 dark:bg-gray-800'}`}></div>
                      )}
                      
                      <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500 flex-shrink-0 ${
                        isCompleted ? 'bg-red-500 text-white shadow-sm' : 
                        isCurrent ? 'bg-red-600 text-white ring-4 ring-red-50 dark:ring-red-900/20' : 
                        'bg-gray-50 dark:bg-gray-800 text-gray-300 border border-gray-100 dark:border-gray-700'
                      }`}>
                        {isCompleted ? <CheckCircle2 size={16} /> : React.cloneElement(step.icon as React.ReactElement, { size: 12 } as any)}
                      </div>

                      <div className="flex-1 pt-0.5 min-w-0">
                        <h3 className={`text-sm font-bold truncate ${isCurrent ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                          {step.label}
                        </h3>
                        {isCurrent && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{step.description}</p>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* ORDER DETAILS */}
        <div id="order-details" className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
          <h3 className="text-xs font-bold text-gray-400 mb-4 uppercase tracking-wider">Order Summary</h3>
          
          <div className="space-y-4 mb-4">
            {order.items.map((item: any, idx: number) => {
              const unitPrice = Number(item.unitPrice ?? item.finalPrice ?? item.price ?? 0);
              const itemTotal = Number(item.lineTotal ?? unitPrice * Number(item.quantity));
              return (
                <div key={idx} className="flex justify-between items-center gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-6 h-6 bg-gray-50 border border-gray-100 rounded flex items-center justify-center font-bold text-gray-500 text-[10px] flex-shrink-0">
                      {item.quantity}x
                    </div>
                    <span className="font-semibold text-sm text-gray-700 truncate">{item.name}</span>
                  </div>
                  <span className="font-bold text-sm text-gray-900 flex-shrink-0">{formatPrice(itemTotal)}</span>
                </div>
              );
            })}
          </div>

          <div className="border-t border-gray-50 pt-4 space-y-3">
            <div className="flex justify-between text-xs font-medium text-gray-500">
              <span>Subtotal</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-xs font-medium text-gray-500">
              <span>GST ({order.gst}%)</span>
              <span>{formatPrice(order.gstAmount || order.gst)}</span>
            </div>
            <div className="flex justify-between text-xs font-medium text-gray-500">
              <span>Delivery Fee</span>
              <span>{formatPrice(order.deliveryFee || 0)}</span>
            </div>
            <div className="flex justify-between text-xs font-medium text-gray-500">
              <span>Packing Fee</span>
              <span>{formatPrice(order.packingFee || 0)}</span>
            </div>
            <div className="flex justify-between pt-4 border-t border-dashed border-gray-200 mt-2">
              <span className="font-bold text-gray-900">Total Paid</span>
              <span className="font-black text-red-600">{formatPrice(order.totalAmount)}</span>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-50 grid grid-cols-1 gap-6">
            {order.deliveryPartner && (
              <div className="flex gap-3 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 flex-shrink-0 shadow-sm">
                   <Bike size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">Delivery Partner</p>
                  <p className="font-bold text-sm text-gray-900">{order.deliveryPartner}</p>
                  
                  {(order.riderName || order.riderPhone) && (
                    <div className="mt-3 pt-3 border-t border-blue-100/50 flex items-center gap-4">
                      {order.riderName && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-700">{order.riderName}</span>
                        </div>
                      )}
                      {order.riderPhone && (
                        <a href={`tel:${order.riderPhone}`} className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-xs font-bold">
                          <Phone size={12} />
                          {order.riderPhone}
                        </a>
                      )}
                    </div>
                  )}

                  {order.trackingLink && order.status === OrderStatus.OUT_FOR_DELIVERY && (
                    <a href={order.trackingLink} target="_blank" rel="noreferrer" className="mt-3 inline-block bg-red-600 px-4 py-2 rounded-lg text-xs font-bold text-white shadow-sm hover:bg-red-700">
                      Track Live Location
                    </a>
                  )}
                </div>
              </div>
            )}
            
            <div className="flex flex-col gap-4 bg-gray-50/50 p-3 rounded-xl">
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-white border border-gray-100 rounded flex items-center justify-center text-gray-400 flex-shrink-0">
                  <MapPin size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Delivery Address</p>
                  <p className="text-xs font-medium text-gray-700 leading-relaxed">{order.address}</p>
                </div>
              </div>
              <div className="flex gap-3 pt-3 border-t border-gray-200">
                <div className="w-6 h-6 bg-white border border-gray-100 rounded flex items-center justify-center text-gray-400 flex-shrink-0">
                  <Phone size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Contact Number</p>
                  <p className="text-xs font-medium text-gray-700">{order.phone}</p>
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* CANCELLATION & REFUND INFO */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-6 h-6 bg-gray-50 border border-gray-100 rounded flex items-center justify-center text-gray-500">
              <AlertCircle size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 tracking-tight">Policies</h3>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-5 h-5 bg-gray-50 rounded flex items-center justify-center text-gray-400 flex-shrink-0 mt-0.5">
                <Clock size={12} />
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Orders can be cancelled within <span className="font-bold text-gray-900">60 seconds</span> of placement.
              </p>
            </div>
            <div className="flex gap-4">
              <div className="w-6 h-6 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400 flex-shrink-0">
                <RefreshCcw size={16} />
              </div>
              <p className="text-sm text-gray-600 font-medium leading-relaxed">
                If the restaurant cancels your order, a <span className="font-black text-gray-900">full refund</span> will be issued to your original payment method.
              </p>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-50 flex flex-wrap gap-4">
            <Link to="/cancellation-policy" className="text-xs font-black text-red-600 uppercase tracking-widest hover:underline">Cancellation Policy</Link>
            <Link to="/refund-policy" className="text-xs font-black text-red-600 uppercase tracking-widest hover:underline">Refund Policy</Link>
          </div>
        </div>
      </div>


      {/* INVOICE MODAL */}
      <AnimatePresence>
        {showInvoice && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowInvoice(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-8 w-full max-w-2xl mx-auto max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <DigitalInvoice order={order} onClose={() => setShowInvoice(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </motion.div>
  );
}
