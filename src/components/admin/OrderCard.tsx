import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Clock, CreditCard, ChevronRight, X, AlertCircle } from 'lucide-react';
import { OrderStatus, Order, PaymentStatus } from '../../types';
import { getDisplayStatus, updatePaymentStatus } from '../../services/api';
import { safeParseDate } from '../../lib/utils';
import { OrderStateService } from '../../services/OrderStateService';
import { getOrderDisplayState } from '../../lib/orderDisplay';
import OrderDetailsModal from './OrderDetailsModal';
import { Printer, MessageCircle, Plus, Send } from 'lucide-react';
import { generateWhatsAppLink, getDeliveryMessage } from '../../utils/whatsapp';

const formatTime = (ts: any) => {
  if (!ts) return 'N/A';
  return safeParseDate(ts).toLocaleString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    day: 'numeric',
    month: 'short'
  });
};

interface OrderCardProps {
  order: Order;
  updateOrderStatus: (id: string, status: OrderStatus, trackingData?: any) => void;
  getStatusColor: (status: string) => string;
  onHandOver: () => void;
  compactMode?: boolean;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, updateOrderStatus, getStatusColor, onHandOver, compactMode = false }) => {
  const [showDetails, setShowDetails] = useState(false);
  const priorityLabel = order.deliveryType === 'asap'
    ? '🔥 High Priority (ASAP)'
    : `⏰ Scheduled: ${formatTime(order.scheduledTime)}`;
  const borderClass = order.deliveryType === 'asap'
    ? 'border-red-300 dark:border-red-700'
    : order.deliveryType === 'scheduled'
      ? 'border-amber-300 dark:border-amber-700'
      : 'border-gray-100 dark:border-gray-800';
  const displayState = getOrderDisplayState(order, new Date());
  const statusClass = order.status === OrderStatus.PREPARING
    ? 'bg-orange-50 dark:bg-orange-900/20'
    : order.status === OrderStatus.DELIVERED
      ? 'bg-green-50 dark:bg-green-900/20'
      : '';
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [canCancel, setCanCancel] = useState(false);
  const [localDelay, setLocalDelay] = useState(0);
  const [nowTime, setNowTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const createdAtTime = order.createdAt?.toDate ? order.createdAt.toDate().getTime() : new Date(order.createdAt).getTime();
  const diffInSecondsGlobal = (nowTime - createdAtTime) / 1000;
  
  const normalizedOrderStatus = OrderStateService.normalizeStatus(order.status) || order.status;
  const isTerminalStatus = OrderStateService.isTerminalStatus(normalizedOrderStatus as OrderStatus);
  const isTerminalState = isTerminalStatus || displayState.phase === 'cancelled' || displayState.phase === 'expired';

  const isNew = diffInSecondsGlobal < 120 && !isTerminalState && order.status !== OrderStatus.PREPARING && order.status !== OrderStatus.READY;
  
  const prepTime = (order.prepTime || 20) + localDelay;
  const deliveryTime = order.deliveryTime || 20;
  const etaTime = createdAtTime + (prepTime + deliveryTime) * 60000;
  const isUrgent = (!isTerminalState && order.status !== OrderStatus.READY && order.status !== OrderStatus.OUT_FOR_DELIVERY && order.status !== OrderStatus.PICKED_UP) && (localDelay > 0 || nowTime > etaTime);

  const handlePrintKOT = () => {
    const printWindow = window.open('', '_blank', 'width=300,height=500');
    if (!printWindow) return;
    
    const itemsHtml = order.items.map((item: any) => `
      <div style="display:flex; justify-content:space-between; margin-bottom: 5px; font-weight:bold; font-size: 16px;">
        <span>${item.quantity}x ${item.name}</span>
      </div>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>KOT #${order.orderNumber || order.id}</title>
          <style>
            body { font-family: monospace; font-size: 14px; margin: 0; padding: 10px; width: 80mm; }
            .header { text-align: center; margin-bottom: 10px; border-bottom: 1px dashed black; padding-bottom: 10px; }
            .notes { margin-top: 10px; border-top: 1px dashed black; padding-top: 10px; font-weight: bold; font-size: 16px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2 style="margin:0;">KOT #${order.orderNumber || order.id}</h2>
            <p style="margin:5px 0;">${new Date().toLocaleTimeString()}</p>
            <p style="margin:0; font-weight:bold;">${order.deliveryType === 'scheduled' ? `SCHED: ${formatTime(order.scheduledTime)}` : 'ASAP'}</p>
          </div>
          <div class="items">
            ${itemsHtml}
          </div>
          ${order.specialInstructions ? `<div class="notes">Notes: ${order.specialInstructions}</div>` : ''}
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  useEffect(() => {
    const createdAt = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
    const now = new Date();
    const diffInSeconds = (now.getTime() - createdAt.getTime()) / 1000;
    
    // Allow cancellation within 60 seconds
    if (diffInSeconds < 60 && order.status === OrderStatus.PENDING) {
      setCanCancel(true);
    } else {
      setCanCancel(false);
    }

    const scheduledFor = order.scheduledFor ? safeParseDate(order.scheduledFor) : order.scheduledTime ? safeParseDate(order.scheduledTime) : null;
    const scheduledPrepStart = scheduledFor ? new Date(scheduledFor.getTime() - 60 * 60000) : null;

    // Stop timer if order is in a terminal or failed state or is still a future scheduled order
    if ([OrderStatus.CANCELLED, OrderStatus.READY, OrderStatus.DELIVERED, OrderStatus.EXPIRED, OrderStatus.FAILED_DELIVERY].includes(order.status) || order.paymentStatus === 'failed' || (scheduledFor && new Date() < scheduledPrepStart!)) {
      setTimeLeft(null);
      return;
    }

    // Assuming 20 mins prep time and 20 mins delivery time if not provided
    const prepTime = (order.prepTime || 20) + localDelay;
    const deliveryTime = order.deliveryTime || 20;
    const eta = new Date(createdAt.getTime() + (prepTime + deliveryTime) * 60000);
    
    const timer = setInterval(() => {
      const now = new Date();
      const diff = Math.max(0, Math.floor((eta.getTime() - now.getTime()) / 1000));
      setTimeLeft(diff);
    }, 1000);

    return () => clearInterval(timer);
  }, [order]);

  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateStatus = async (id: string, status: OrderStatus) => {
    setIsUpdating(true);
    await updateOrderStatus(id, status);
    setIsUpdating(false);
  };

  const handleUpdatePaymentStatus = async (id: string, status: PaymentStatus) => {
    setIsUpdating(true);
    await updatePaymentStatus(id, status);
    setIsUpdating(false);
  };

  const handleConfirmPayment = async (id: string) => {
    setIsUpdating(true);
    console.log('[Admin OrderCard] confirm payment for', id, 'status=', order.status, 'paymentStatus=', order.paymentStatus);
    try {
      await updateOrderStatus(id, OrderStatus.ACCEPTED);
      await updatePaymentStatus(id, 'success', {}, 'admin');
      console.log('[Admin OrderCard] payment confirmed for', id);
    } catch (error) {
      console.error('Error confirming payment:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const isPaymentVerificationPending = normalizedOrderStatus === OrderStatus.PAYMENT_VERIFICATION;
  const isOrderPlaced = normalizedOrderStatus === OrderStatus.PLACED || normalizedOrderStatus === OrderStatus.PENDING;

  const getAdminTargetStatus = () => {
    console.log('[OrderCard] Current status:', normalizedOrderStatus, 'Payment status:', order.paymentStatus);
    let targetStatus;
    switch (normalizedOrderStatus) {
      case OrderStatus.PLACED:
      case OrderStatus.PENDING:
      case OrderStatus.CONFIRMED:
        targetStatus = OrderStatus.ACCEPTED;
        break;
      case OrderStatus.ACCEPTED:
      case OrderStatus.SCHEDULED:
        targetStatus = OrderStatus.PREPARING;
        break;
      case OrderStatus.PREPARING:
        targetStatus = OrderStatus.READY;
        break;
      case OrderStatus.READY:
        targetStatus = OrderStatus.OUT_FOR_DELIVERY;
        break;
      case OrderStatus.OUT_FOR_DELIVERY:
        targetStatus = OrderStatus.DELIVERED;
        break;
      default: {
        const fallbackStatuses = OrderStateService.getNextStatuses(normalizedOrderStatus as OrderStatus);
        targetStatus = fallbackStatuses.find(status => status !== OrderStatus.CANCELLED) ?? fallbackStatuses[0] ?? null;
        break;
      }
    }
    console.log('[OrderCard] Target status:', targetStatus);
    return targetStatus;
  };

  const currentAction = getAdminTargetStatus();

  const canShowAdvanceButton = !displayState.isInvalidPayment
    && !isPaymentVerificationPending
    && !isTerminalState
    && currentAction
    && currentAction !== OrderStatus.CANCELLED
    && !(isOrderPlaced && displayState.paymentStatus !== 'success' && order.paymentMethod !== 'cod' && !order.isCOD);

  const getActionLabel = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.ACCEPTED:
        return 'Accept Order';
      case OrderStatus.PREPARING:
        return 'Start Preparing';
      case OrderStatus.READY:
        return 'Mark as Ready';
      case OrderStatus.COURIER_BOOKED:
        return 'Courier Booked';
      case OrderStatus.PICKED_UP:
        return 'Picked Up';
      case OrderStatus.OUT_FOR_DELIVERY:
        return 'Out for Delivery';
      case OrderStatus.DELIVERED:
        return 'Mark as Delivered';
      case OrderStatus.PAYMENT_VERIFICATION:
        return 'Verify Payment';
      case OrderStatus.PAYMENT_PENDING:
        return 'Mark Payment Pending';
      default:
        return `Advance to ${getDisplayStatus(status)}`;
    }
  };

  const handleAction = () => {
    if (!currentAction) return;

    // When marking as ready -> out for delivery, show handover modal
    if (currentAction === OrderStatus.OUT_FOR_DELIVERY && normalizedOrderStatus === OrderStatus.READY) {
      onHandOver();
    } else {
      handleUpdateStatus(order.id, currentAction);
    }
  };

  return (
    <>
      <motion.div 
        layout
        className={`bg-white dark:bg-gray-900 ${compactMode ? 'rounded-xl p-3' : 'rounded-2xl p-5'} premium-card-shadow border ${borderClass} hover:premium-card-shadow-hover transition-all duration-200 ${statusClass}`}
      >
        <div className="flex justify-between items-start mb-2.5">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className={`${compactMode ? 'text-[15px]' : 'text-lg'} font-black text-gray-900 dark:text-white tracking-tight`}>#{order.orderNumber || 'N/A'}</h3>
              {isNew && <span className="bg-blue-500 text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded animate-pulse">New</span>}
              {isUrgent && <span className="bg-red-600 text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded animate-pulse">Urgent</span>}
            </div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
              {order.customerName || 'Guest'}
              {order.phone && (
                <a 
                  href={`https://wa.me/${order.phone.replace(/\D/g, '')}?text=${encodeURIComponent("Hi, this is Mana Inti Bojanam. Your order is being prepared...")}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="ml-2 text-green-500 hover:text-green-600 transition-colors"
                  title="WhatsApp Customer"
                >
                  <MessageCircle size={16} />
                </a>
              )}
            </p>
            <p className="text-xs uppercase tracking-[0.25em] mt-2 font-black text-gray-500 dark:text-gray-400">
              {priorityLabel}
            </p>
          </div>
          <div className="text-right">
              <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${displayState.adminBadgeColor} mb-2`}>
              {displayState.adminBadge}
            </div>
            <div className="text-lg font-black text-gray-900 dark:text-white">₹{order.totalAmount?.toFixed(2)}</div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <CreditCard size={16} className={displayState.paymentStatus === 'success' ? 'text-green-600' : displayState.isInvalidPayment ? 'text-red-600' : 'text-orange-600'} />
              <span className={`text-xs font-bold uppercase ${displayState.paymentStatus === 'success' ? 'text-green-600' : displayState.isInvalidPayment ? 'text-red-600' : 'text-orange-600'}`}>
                {order.paymentMethod?.toUpperCase()} - {displayState.paymentStatus}
              </span>
            </div>
            <div>
              {order.deliveryType === 'scheduled' ? (
                <span className="text-xs font-bold text-amber-600">Scheduled: {formatTime(order.scheduledTime)}</span>
              ) : (
                <span className="text-xs font-bold text-emerald-600">ASAP Order</span>
              )}
            </div>
          </div>
          {timeLeft !== null && timeLeft > 0 && (
            <div className="flex flex-col items-end gap-1">
              <div className={`text-xs font-black flex items-center gap-1 ${timeLeft < 300 ? 'text-red-600 animate-pulse' : 'text-gray-600 dark:text-gray-400'}`}>
                <Clock size={14} />
                ETA: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </div>
              {localDelay > 0 && (
                <span className="text-[10px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded">+{localDelay}m delay</span>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handlePrintKOT}
            className={`flex-1 min-w-[80px] flex items-center justify-center gap-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 ${compactMode ? 'py-1.5 text-[10px]' : 'py-2.5 text-xs'} rounded-xl font-black uppercase tracking-wide hover:bg-gray-200 transition-all shadow-sm`}
          >
            <Printer size={compactMode ? 12 : 14} /> KOT
          </button>
          
          {!isTerminalState && localDelay < 30 && (
            <button
              onClick={() => setLocalDelay(prev => prev + 15)}
              className={`flex-1 min-w-[80px] flex items-center justify-center gap-1 bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 ${compactMode ? 'py-1.5 text-[10px]' : 'py-2.5 text-xs'} rounded-xl font-black uppercase tracking-wide hover:bg-amber-200 transition-all shadow-sm`}
            >
              <Plus size={compactMode ? 12 : 14} /> 15m
            </button>
          )}

          {isPaymentVerificationPending && !isTerminalState && (
            <button
              onClick={() => handleConfirmPayment(order.id)}
              disabled={isUpdating}
              className={`flex-1 min-w-[160px] bg-emerald-600 text-white ${compactMode ? 'py-1.5 text-xs' : 'py-2.5 text-sm'} rounded-xl font-black uppercase tracking-wide hover:bg-emerald-700 transition-all disabled:opacity-50 shadow-sm`}
            >
              {isUpdating ? 'Updating...' : 'Payment Received'}
            </button>
          )}

          {displayState.paymentStatus === 'success' && isOrderPlaced && !isTerminalState && !displayState.isInvalidPayment && (
            <button
              onClick={() => handleUpdateStatus(order.id, OrderStatus.ACCEPTED)}
              disabled={isUpdating}
              className={`flex-1 min-w-[160px] bg-blue-600 text-white ${compactMode ? 'py-1.5 text-xs' : 'py-2.5 text-sm'} rounded-xl font-black uppercase tracking-wide hover:bg-blue-700 transition-all disabled:opacity-50 shadow-sm`}
            >
              {isUpdating ? 'Updating...' : 'Accept Order'}
            </button>
          )}

          {canShowAdvanceButton && currentAction && (
            <button
              onClick={handleAction}
              disabled={isUpdating}
              className={`flex-1 min-w-[160px] ${currentAction === OrderStatus.READY ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-700 hover:bg-slate-800'} text-white ${compactMode ? 'py-1.5 text-xs' : 'py-2.5 text-sm'} rounded-xl font-black uppercase tracking-wide transition-all disabled:opacity-50 shadow-sm`}
            >
              {isUpdating ? 'Updating...' : currentAction === OrderStatus.READY ? 'Mark as Ready' : getActionLabel(currentAction)}
            </button>
          )}

          {!isTerminalState && (
            <button
              onClick={() => handleUpdateStatus(order.id, OrderStatus.CANCELLED)}
              disabled={isUpdating}
              className="flex-1 min-w-[160px] bg-red-600 text-white py-2.5 rounded-xl font-black text-sm uppercase tracking-wide hover:bg-red-700 transition-all disabled:opacity-50 shadow-sm"
            >
              {isUpdating ? 'Updating...' : 'Reject Order'}
            </button>
          )}
          
          {order.status === OrderStatus.DELIVERED && (
            <button
              onClick={() => {
                const invoiceUrl = `https://mana-inti-bojanam-pune-492610.web.app/order/${order.id}`;
                const message = getDeliveryMessage(order.orderNumber?.toString() || order.id, order.customerName || 'Customer', invoiceUrl);
                const link = generateWhatsAppLink(order.phone, message);
                window.open(link, '_blank');
              }}
              className="flex-1 min-w-[160px] bg-green-500 text-white py-2.5 rounded-xl font-black text-sm uppercase tracking-wide hover:bg-green-600 transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <Send size={16} /> Notify WhatsApp
            </button>
          )}

          <button 
            onClick={() => setShowDetails(true)}
            className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-xs hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
          >
            Details
          </button>
        </div>
      </motion.div>

      {showDetails && (
        <OrderDetailsModal order={order} onClose={() => setShowDetails(false)} />
      )}
    </>
  );
};

export default OrderCard;
