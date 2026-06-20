import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Clock, 
  Package, 
  Truck, 
  CheckCircle2, 
  ArrowLeft, 
  Send, 
  Check, 
  Copy, 
  ShieldCheck, 
  Phone, 
  ExternalLink, 
  MapPin 
} from 'lucide-react';
import { 
  subscribeToOrder, 
  updateOrderStatus as apiUpdateOrderStatus, 
  getDisplayStatus 
} from '../services/api';
import { getOrderDisplayState } from '../lib/orderDisplay';
import { OrderStatus, Order } from '../types';
import CourierTrackingTimeline from '../components/CourierTrackingTimeline';
import toast from 'react-hot-toast';
import { formatPrice } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';

const OrderStatusPage: React.FC = () => {
  const { tenantInfo } = useTenant();
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [cancelling, setCancelling] = useState(false);

  const getWhatsAppMessage = (order: Order) => {
    const itemsList = (order.items || []).map(i => `• ${i.name} x ${i.quantity}`).join('\n');
    return `*New Order - Mana Inti Bojanam*\n\n` +
      `*Order ID:* #${order.orderNumber || order.id?.slice(-6)}\n` +
      `*Items:*\n${itemsList}\n\n` +
      `*Total:* ${formatPrice(Number(order.totalAmount))}\n` +
      `*Address:* ${order.address}\n` +
      `*Payment:* ${order.paymentMethod === 'razorpay' ? 'Online (Razorpay)' : 'Cash on Delivery'}\n\n` +
      `*Track your order here:* ${window.location.origin}/order/${order.id}\n\n` +
      `Tap below to send order on WhatsApp to confirm`;
  };

  const handleSendWhatsApp = () => {
    if (!order) return;
    try {
      const message = getWhatsAppMessage(order);
      const phone = tenantInfo?.contactPhone?.replace(/\D/g, '') || '';
      const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      const win = window.open(whatsappUrl, '_blank');
      if (!win) {
        throw new Error('Unable to open WhatsApp window. Please allow popups and try again.');
      }
    } catch (err: any) {
      console.error('WhatsApp open error:', err);
      toast.error(err?.message || 'Unable to open WhatsApp. Please try again.');
    }
  };

  const handleCopyMessage = () => {
    if (!order) return;
    const message = getWhatsAppMessage(order);
    navigator.clipboard.writeText(message);
    setCopied(true);
    toast.success('Order details copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCancelOrder = async () => {
    if (!order || !orderId) return;
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    
    setCancelling(true);
    try {
      await apiUpdateOrderStatus(orderId, OrderStatus.CANCELLED);
      toast.success('Order cancelled successfully');
    } catch (e: any) {
      toast.error(e.message || 'Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  useEffect(() => {
    if (!orderId) return;
    
    const unsubscribe = subscribeToOrder(orderId, (updatedOrder) => {
      setOrder(updatedOrder);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [orderId]);

  useEffect(() => {
    if (!order || order.status !== OrderStatus.PENDING) {
      setTimeLeft(0);
      return;
    }

    const calculateTimeLeft = () => {
      let createdTime: number;
      if (order.createdAt?._seconds) {
        createdTime = order.createdAt._seconds * 1000;
      } else if (order.createdAt?.seconds) {
        createdTime = order.createdAt.seconds * 1000;
      } else {
        createdTime = new Date(order.createdAt).getTime();
      }
      
      const now = Date.now();
      const diff = Math.floor((createdTime + 60000 - now) / 1000);
      return Math.max(0, diff);
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [order]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-red-200 dark:border-red-900 border-t-red-600 rounded-full animate-spin mx-auto mb-6"></div>
        <p className="text-gray-600 dark:text-gray-400 font-bold">Loading order...</p>
      </div>
    </div>
  );
  if (!order) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
      <div className="text-center">
        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">❌</span>
        </div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Order Not Found</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">We couldn't find your order. Please try again.</p>
        <Link to="/menu" className="inline-block px-8 py-4 bg-red-600 text-white rounded-2xl font-black hover:bg-red-700 transition-all">Back to Menu</Link>
      </div>
    </div>
  );

  // ✅ FIXED STATUS FLOW
  const statuses = [
    { id: OrderStatus.PENDING, label: 'Order Placed', icon: Clock },
    { id: OrderStatus.PAYMENT_PENDING, label: 'Payment Pending', icon: ShieldCheck },
    { id: OrderStatus.PAYMENT_VERIFICATION, label: 'Payment Verification', icon: ShieldCheck },
    { id: OrderStatus.ACCEPTED, label: 'Order Accepted', icon: Check },
    { id: OrderStatus.PREPARING, label: 'Preparing', icon: Package },
    { id: OrderStatus.READY, label: 'Ready', icon: Package },
    { id: OrderStatus.OUT_FOR_DELIVERY, label: 'On the Way', icon: Truck },
    { id: OrderStatus.DELIVERED, label: 'Delivered', icon: CheckCircle2 }
  ];

  const currentIdx = statuses.findIndex(s => s.id === order.status);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-900 dark:to-gray-800">
    <div className="w-full px-4 py-8 md:py-12">
      <Link to="/menu" className="inline-flex items-center gap-2 text-gray-500 hover:text-red-600 mb-8 font-bold">
        <ArrowLeft className="w-4 h-4" /> Back to Menu
      </Link>

      <div className="bg-white dark:bg-gray-900 rounded-[3rem] shadow-2xl shadow-red-600/5 overflow-hidden border border-gray-100 dark:border-gray-800">
        {/* HEADER */}
        <div className="bg-gradient-to-br from-red-600 to-orange-500 p-8 md:p-12 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
          <div className="relative z-10 flex flex-col items-center">
            {order.status !== OrderStatus.CANCELLED && order.status !== OrderStatus.DELIVERED && (
              <div className="flex items-center gap-2 mb-4 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white shadow-sm border border-white/10">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.8)]" /> LIVE
              </div>
            )}
            <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-3">Order #{order.id?.slice(-6)}</h1>
            <div className="bg-black/20 backdrop-blur-sm px-5 py-2 rounded-2xl border border-white/10 shadow-inner">
              <p className="text-white/90 font-bold text-sm tracking-wide">
                {getOrderDisplayState(order, new Date()).customerTitle}
              </p>
            </div>
          </div>
        </div>

        <div className="p-8 md:p-12">
          {/* CANCELLATION TIMER */}
          {timeLeft > 0 && order.status === OrderStatus.PENDING && (
            <div className="mb-8 p-4 sm:p-5 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/30 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <Clock size={20} className="text-red-600 dark:text-red-400 animate-pulse" />
                <p className="text-xs sm:text-sm text-red-600 dark:text-red-400 font-bold">You can cancel within {timeLeft}s</p>
              </div>
              <button
                onClick={handleCancelOrder}
                disabled={cancelling}
                className="px-4 py-2 bg-white dark:bg-gray-800 text-red-600 border border-red-200 dark:border-red-900/30 rounded-xl font-black text-xs hover:bg-red-50 dark:hover:bg-red-900/20 transition-all disabled:opacity-50 shadow-sm active:scale-95"
              >
                {cancelling ? 'Cancelling...' : 'Cancel Order'}
              </button>
            </div>
          )}

          {/* WHATSAPP CONFIRMATION SECTION */}
          {(() => {
            const displayState = getOrderDisplayState(order, new Date());
            if ((order.status === OrderStatus.PENDING || order.status === OrderStatus.PAYMENT_PENDING || order.status === OrderStatus.PAYMENT_VERIFICATION) && !displayState.isInvalidPayment) {
              return (
            <div className="mb-12 p-10 bg-green-50 dark:bg-green-900/10 rounded-[3rem] border-2 border-green-100 dark:border-green-900/30 text-center">
              <div className="w-20 h-20 bg-green-600 rounded-[2rem] flex items-center justify-center text-white mx-auto mb-8 shadow-2xl shadow-green-600/30">
                <Send size={36} />
              </div>
              <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-3 tracking-tight">Confirm on WhatsApp</h2>
              <p className="text-gray-600 dark:text-gray-400 font-medium mb-10 max-w-md mx-auto leading-relaxed">Tap below to send your order details to us on WhatsApp to confirm your order and get faster updates.</p>
              
              <div className="flex flex-col sm:flex-row gap-5">
                <button 
                  onClick={handleSendWhatsApp}
                  className="flex-1 py-6 bg-green-600 text-white rounded-2xl font-black text-xl shadow-2xl shadow-green-600/30 flex items-center justify-center gap-4 hover:bg-green-700 active:scale-95 transition-all"
                >
                  <Send size={24} /> Send to WhatsApp
                </button>
                <button 
                  onClick={handleCopyMessage}
                  className="px-10 py-6 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-2xl font-black text-xl border-2 border-gray-100 dark:border-gray-700 flex items-center justify-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all"
                >
                  {copied ? <Check size={24} className="text-green-600" /> : <Copy size={24} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
              );
            }
            return null;
          })()}

          {/* PAYMENT STATUS BADGE */}
          {order.paymentMethod === 'razorpay' && order.status === OrderStatus.PAYMENT_VERIFICATION && (
            <div className="mb-8 flex justify-center">
              <div className="px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest flex items-center gap-2 bg-yellow-100 text-yellow-700 border border-yellow-200">
                <ShieldCheck size={16} />
                Payment Pending Verification
              </div>
            </div>
          )}

          {/* TRACKER */}
          {order.status === OrderStatus.CANCELLED ? (
            <div className="text-center py-12 text-2xl font-black text-red-600 bg-red-50 dark:bg-red-900/10 rounded-[2rem] mb-12">
              Order Cancelled ❌
            </div>
          ) : order.status === OrderStatus.EXPIRED ? (
            <div className="text-center py-12 text-2xl font-black text-gray-500 bg-gray-50 dark:bg-gray-900/10 rounded-[2rem] mb-12">
              Order Expired ⏳
            </div>
          ) : (
            <div className="mb-12 max-w-sm mx-auto pl-4">
              <div className="relative border-l-2 border-dashed border-gray-200 dark:border-gray-700 ml-6 py-4 space-y-10">
                {statuses.map((s, i) => {
                  const Icon = s.icon;
                  const isCompleted = i < currentIdx;
                  const isActive = i === currentIdx;
                  const isFuture = i > currentIdx;

                  return (
                    <div key={s.id} className={`relative flex items-center gap-6 ${isFuture ? 'opacity-40' : ''}`}>
                      <div className={`absolute -left-[25px] w-12 h-12 rounded-full flex items-center justify-center border-4 border-white dark:border-gray-900 shadow-sm ${
                        isActive ? 'bg-orange-500 text-white scale-110 shadow-orange-500/40' : 
                        isCompleted ? 'bg-green-500 text-white' : 
                        'bg-gray-100 dark:bg-gray-800 text-gray-400'
                      } transition-all duration-500`}>
                        <Icon className="w-5 h-5" />
                      </div>

                      <div className="ml-8">
                        <h4 className={`text-base font-black tracking-tight ${isActive ? 'text-orange-600 dark:text-orange-400' : isCompleted ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                          {s.label}
                        </h4>
                        {isActive && (
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">In Progress</p>
                        )}
                        {isCompleted && (
                          <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest mt-1 flex items-center gap-1">
                            <Check size={10} /> Done
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ADDRESS */}
          <div className="mb-6">
            <h3 className="text-xs font-bold text-gray-400 mb-2">Delivery Address</h3>
            <p className="text-gray-700">{order.address}</p>
          </div>

          {/* DRIVER / RIDER DETAILS */}
          {(order.riderName || (order as any).driverName || order.trackingLink) && (
            <div className="mb-8 p-8 bg-red-50 dark:bg-red-900/10 rounded-[2.5rem] border-2 border-red-100 dark:border-red-900/30">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-red-600/20">
                  <Truck size={32} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xs font-black text-red-600 uppercase tracking-[0.2em] mb-1">Delivery Partner</h3>
                  <p className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                    {order.deliveryPartner ? `${(order.deliveryPartner as any).name || order.deliveryPartner} - ` : ''}
                    {order.riderName || 'Assigning Partner...'}
                  </p>
                  {order.riderPhone && (
                    <div className="flex items-center gap-4 mt-2">
                      <a href={`tel:${order.riderPhone}`} className="flex items-center gap-2 text-sm font-black text-gray-600 dark:text-gray-400 hover:text-red-600 transition-colors">
                        <Phone size={16} /> {order.riderPhone}
                      </a>
                    </div>
                  )}
                </div>
              </div>
              
              {order.trackingLink && (
                <div className="mt-8 flex flex-col gap-3">
                  <a 
                    href={order.trackingLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-3 w-full py-5 bg-white dark:bg-gray-800 text-red-600 rounded-2xl font-black text-base border-2 border-red-100 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all shadow-sm group"
                  >
                    <ExternalLink size={20} className="group-hover:scale-110 transition-transform" /> 
                    Track on {(order.deliveryPartner as any)?.name || order.deliveryPartner || 'Partner'} App
                  </a>
                  
                  {order.status === OrderStatus.OUT_FOR_DELIVERY && (
                    <button 
                      onClick={() => window.open(order.trackingLink, '_blank')}
                      className="flex items-center justify-center gap-3 w-full py-5 bg-red-600 text-white rounded-2xl font-black text-base shadow-xl shadow-red-600/20 hover:bg-red-700 active:scale-95 transition-all"
                    >
                      <MapPin size={20} /> Track Here
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* COURIER TRACKING TIMELINE */}
          {order.courierProvider && (
            <div className="mb-8">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Real-time Tracking</h3>
              <CourierTrackingTimeline order={order} />
            </div>
          )}

          {/* ITEMS */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-[2.5rem] p-8 border border-gray-100 dark:border-gray-800">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Order Summary</h3>

            <div className="space-y-4 mb-8">
              {order.items.map((item: any, index: number) => {
              const unitPrice = Number(item.unitPrice ?? item.price ?? 0);
              const lineTotal = Number(item.lineTotal ?? unitPrice * Number(item.quantity));
              return (
                <div key={item.menuItemId || item.id || index} className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="font-black text-gray-900 dark:text-white">{item.name}</span>
                    <span className="text-xs text-gray-500 font-bold">Qty: {item.quantity}</span>
                  </div>
                  <span className="font-black text-gray-900 dark:text-white">{formatPrice(lineTotal)}</span>
                </div>
              );
            })}
            </div>

            <div className="pt-6 border-t-2 border-dashed border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <span className="text-lg font-black text-gray-900 dark:text-white">Total Amount</span>
                <span className="text-2xl font-black text-red-600">{formatPrice(Number(order.totalAmount))}</span>
              </div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">
                Payment: {order.paymentMethod === 'razorpay' ? 'Online (Razorpay)' : 'Cash on Delivery'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

export default OrderStatusPage;