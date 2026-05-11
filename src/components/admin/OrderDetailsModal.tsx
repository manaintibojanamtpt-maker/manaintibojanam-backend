import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Package, Clock, CreditCard, MapPin, Phone, User } from 'lucide-react';

import { Order } from '../../types';
import { safeParseDate } from '../../lib/utils';

interface OrderDetailsModalProps {
  order: Order;
  onClose: () => void;
}

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

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ order, onClose }) => {
  const isScheduled = order.deliveryType === 'scheduled' || (order.scheduledTime && order.deliveryType !== 'asap');
  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4"
      >
        <motion.div 
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.9 }}
          className="bg-white dark:bg-gray-900 rounded-3xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black dark:text-white">Order #{order.orderNumber}</h2>
            <button onClick={onClose}><X className="dark:text-white" /></button>
          </div>

          <div className="space-y-6">
            {/* Customer Info */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold"><User size={16} /> {order.customerName}</div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"><Phone size={16} /> {order.phone}</div>
              <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                <MapPin size={16} className="mt-1 flex-shrink-0" />
                <div className="flex flex-col">
                  {order.address?.split(',').map((part: string, i: number) => (
                    <span key={i} className={i === 0 ? "font-bold text-gray-900 dark:text-white" : ""}>
                      {part.trim()}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                {isScheduled ? (
                  <p style={{ color: '#f59e0b' }} className="text-sm font-bold">
                    Scheduled: {formatTime(order.scheduledTime)}
                  </p>
                ) : (
                  <p style={{ color: '#22c55e' }} className="text-sm font-bold">
                    ASAP Order
                  </p>
                )}
              </div>
            </div>

            {/* Items */}
            <div>
              <h4 className="font-bold mb-2">Items</h4>
              {order.items?.map((item: any, idx: number) => {
                const unitPrice = Number(item.unitPrice ?? item.price ?? 0);
                const lineTotal = Number(item.lineTotal ?? unitPrice * Number(item.quantity));
                return (
                  <div key={idx} className="flex justify-between text-sm mb-1">
                    <span>{item.name} x {item.quantity}</span>
                    <span>₹{lineTotal.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>

            {/* Fees */}
            <div className="border-t pt-4 space-y-1 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>₹{order.subtotal?.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>GST</span><span>₹{order.gst?.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Delivery</span><span>₹{order.deliveryFee?.toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-lg pt-2"><span>Total</span><span>₹{order.totalAmount?.toFixed(2)}</span></div>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-800 pt-4 mt-4">
              <h4 className="font-bold mb-4 text-sm uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">Order Timeline</h4>
              {Array.isArray(order.timeline) && order.timeline.length > 0 ? (
                order.timeline
                  .slice()
                  .sort((a, b) => safeParseDate(a.timestamp).getTime() - safeParseDate(b.timestamp).getTime())
                  .map((event, index) => (
                    <div key={event.id || index} className="flex items-start gap-3 mb-4 last:mb-0">
                      <div className="mt-1 w-2.5 h-2.5 rounded-full bg-red-600 dark:bg-red-400 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{event.description || `${event.previousStatus || 'Status'} → ${event.newStatus || ''}`}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{safeParseDate(event.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                  ))
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No timeline events recorded for this order yet.</p>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OrderDetailsModal;
