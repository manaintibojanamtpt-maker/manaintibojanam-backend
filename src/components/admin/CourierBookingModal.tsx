import React, { useState, useEffect } from 'react';
import { getDb } from '../../lib/firebase-db';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { getCourierAdapter, CourierBookingRequest } from '../../services/courierAdapters';
import { Order } from '../../types';

interface CourierBookingModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (tripId: string, provider: 'porter' | 'rapido') => void;
}

/**
 * Admin Courier Booking Modal
 * Allows admin to book courier and assign delivery to Porter/Rapido
 */
export function CourierBookingModal({
  order,
  isOpen,
  onClose,
  onSuccess,
}: CourierBookingModalProps) {
  const [provider, setProvider] = useState<'porter' | 'rapido'>('porter');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [estimatedWeight, setEstimatedWeight] = useState('0.5');
  const [apiKey, setApiKey] = useState('');

  const handleBookCourier = async () => {
    if (!apiKey.trim()) {
      setError(`${provider.charAt(0).toUpperCase() + provider.slice(1)} API key is required`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Get courier adapter
      const adapter = getCourierAdapter(provider, apiKey);

      // Prepare booking request
      const bookingRequest: CourierBookingRequest = {
        orderId: order.id,
        customerName: order.customerName || 'Customer',
        customerPhone: order.phone || '',
        pickupAddress: 'Restaurant Address', // TODO: Get from config
        deliveryAddress: order.address || '',
        estimatedWeight: parseFloat(estimatedWeight),
        amount: order.totalAmount,
      };

      // Book delivery
      const result = await adapter.bookDelivery(bookingRequest);

      // Update order with courier info
      await updateDoc(doc(getDb(), 'orders', order.id), {
        courierProvider: provider,
        courierTripId: result.tripId,
        trackingUrl: result.trackingUrl,
        riderName: result.riderName,
        riderPhone: result.riderPhone,
        estimatedDeliveryTime: result.estimatedDeliveryTime
          ? Timestamp.fromDate(result.estimatedDeliveryTime)
          : null,
        status: 'COURIER_BOOKED',
        updatedAt: Timestamp.now(),
      });

      onSuccess(result.tripId, provider);
      onClose();
    } catch (err) {
      console.error('Courier booking error:', err);
      setError(err instanceof Error ? err.message : 'Failed to book courier');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4">Book Courier Delivery</h2>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Provider Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Courier Provider
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="provider"
                  value="porter"
                  checked={provider === 'porter'}
                  onChange={(e) => setProvider(e.target.value as 'porter' | 'rapido')}
                  className="mr-2"
                  disabled={loading}
                />
                <span>Porter</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="provider"
                  value="rapido"
                  checked={provider === 'rapido'}
                  onChange={(e) => setProvider(e.target.value as 'porter' | 'rapido')}
                  className="mr-2"
                  disabled={loading}
                />
                <span>Rapido</span>
              </label>
            </div>
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {provider.charAt(0).toUpperCase() + provider.slice(1)} API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your API key"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              API key from your {provider} account settings
            </p>
          </div>

          {/* Estimated Weight */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estimated Weight (kg)
            </label>
            <input
              type="number"
              value={estimatedWeight}
              onChange={(e) => setEstimatedWeight(e.target.value)}
              step="0.1"
              min="0.1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              disabled={loading}
            />
          </div>

          {/* Order Info */}
          <div className="bg-gray-50 p-3 rounded-md text-sm">
            <p>
              <strong>Order ID:</strong> {order.id}
            </p>
            <p>
              <strong>Amount:</strong> ₹{order.totalAmount.toFixed(2)}
            </p>
            <p>
              <strong>Delivery Address:</strong> {order.address}
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleBookCourier}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
            >
              {loading ? 'Booking...' : 'Book Courier'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CourierBookingModal;
