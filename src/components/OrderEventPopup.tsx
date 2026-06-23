/**
 * Order Event Popup Component
 * Shows animated notifications when order status changes
 * Appears for each significant order event (ACCEPTED, PREPARING, DELIVERED, etc.)
 */

import React, { useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { OrderStatus } from '../types';
import { OrderStateService } from '../services/OrderStateService';
import { X } from 'lucide-react';

interface OrderEventPopupProps {
  orderId: string;
  status: OrderStatus;
  isVisible: boolean;
  onDismiss: () => void;
}

export const OrderEventPopup: React.FC<OrderEventPopupProps> = ({
  orderId,
  status,
  isVisible,
  onDismiss,
}) => {
  const display = OrderStateService.getStatusDisplay(status);

  // Auto-dismiss after 5 seconds if visible
  useEffect(() => {
    if (!isVisible) return;

    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [isVisible, onDismiss]);

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onDismiss}
            className="fixed inset-0 bg-black/40 z-40"
          />

          {/* Popup Card */}
          <m.div
            initial={{ opacity: 0, scale: 0.8, y: -100 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -100 }}
            transition={{
              type: 'spring',
              damping: 20,
              stiffness: 300,
            }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm px-4"
          >
            <div
              className={`
                bg-white rounded-2xl shadow-2xl overflow-hidden
                border-4 border-${display.color === 'orange' ? 'orange' : display.color === 'green' ? 'green' : display.color === 'blue' ? 'blue' : display.color === 'yellow' ? 'yellow' : 'gray'}-500
              `}
            >
              {/* Color accent bar at top */}
              <div
                className={`
                  h-1 bg-gradient-to-r
                  ${
                    display.color === 'orange'
                      ? 'from-orange-400 to-orange-600'
                      : display.color === 'green'
                      ? 'from-green-400 to-green-600'
                      : display.color === 'blue'
                      ? 'from-blue-400 to-blue-600'
                      : display.color === 'yellow'
                      ? 'from-yellow-400 to-yellow-600'
                      : 'from-gray-400 to-gray-600'
                  }
                `}
              />

              <div className="p-6">
                {/* Icon with bounce animation */}
                <m.div
                  className="text-6xl text-center mb-4"
                  animate={{ y: [0, -10, 0] }}
                  transition={{
                    duration: 1,
                    repeat: 2, // Bounce 2 times
                  }}
                >
                  {display.icon}
                </m.div>

                {/* Status label */}
                <h2 className="text-2xl font-black text-center text-gray-900 mb-2">
                  {display.label}
                </h2>

                {/* Description */}
                {display.description && (
                  <p className="text-center text-sm text-gray-600 mb-4">
                    {display.description}
                  </p>
                )}

                {/* Order ID */}
                <div className="bg-gray-100 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-600 font-bold">ORDER ID</p>
                  <p className="text-lg font-black text-gray-900 font-mono">
                    #{orderId.slice(0, 12)}
                  </p>
                </div>

                {/* Action button */}
                <m.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onDismiss}
                  className={`
                    w-full mt-4 py-3 rounded-lg font-black uppercase tracking-wider
                    text-white transition-all
                    ${
                      display.color === 'orange'
                        ? 'bg-gradient-to-r from-orange-600 to-orange-700 hover:shadow-lg hover:shadow-orange-600/50'
                        : display.color === 'green'
                        ? 'bg-gradient-to-r from-green-600 to-green-700 hover:shadow-lg hover:shadow-green-600/50'
                        : display.color === 'blue'
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:shadow-lg hover:shadow-blue-600/50'
                        : 'bg-gradient-to-r from-gray-600 to-gray-700 hover:shadow-lg hover:shadow-gray-600/50'
                    }
                  `}
                >
                  Got It!
                </m.button>

                {/* Close icon (top-right) */}
                <m.button
                  whileHover={{ scale: 1.15 }}
                  onClick={onDismiss}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors"
                >
                  <X size={24} />
                </m.button>
              </div>
            </div>
          </m.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default OrderEventPopup;
