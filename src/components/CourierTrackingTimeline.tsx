import React, { useState, useEffect } from 'react';
import { Order, CourierDispatch } from '../types';
import { getDb } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { getCourierAdapter } from '../services/courierAdapters';

interface CourierTrackingTimelineProps {
  order: Order;
}

/**
 * Customer-facing Courier Tracking Timeline
 * Shows real-time delivery status, rider info, and tracking link
 * Provides transparency for order delivery after courier handover
 */
export function CourierTrackingTimeline({ order }: CourierTrackingTimelineProps) {
  const [courierStatus, setCourierStatus] = useState<any>(null);
  const [riderInfo, setRiderInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [estimatedDeliveryTime, setEstimatedDeliveryTime] = useState<Date | null>(null);

  // Subscribe to real-time updates from courier trips
  useEffect(() => {
    if (!order.courierTripId || !order.courierProvider) {
      setLoading(false);
      return;
    }

    // Set initial rider info
    if (order.riderName) {
      setRiderInfo({
        name: order.riderName,
        phone: order.riderPhone,
      });
    }

    if (order.estimatedDeliveryTime) {
      setEstimatedDeliveryTime(
        new Date(
          typeof order.estimatedDeliveryTime === 'number'
            ? order.estimatedDeliveryTime
            : order.estimatedDeliveryTime.toDate?.() || new Date()
        )
      );
    }

    // Subscribe to courier dispatch collection for live updates
    const dispatchQuery = query(
      collection(getDb(), 'courierDispatches'),
      where('orderId', '==', order.id),
      where('tripId', '==', order.courierTripId)
    );

    const unsubscribe = onSnapshot(dispatchQuery, (snapshot) => {
      if (!snapshot.empty) {
        const dispatchData = snapshot.docs[0].data() as any;
        setCourierStatus(dispatchData);
        setLoading(false);
      } else {
        // Use order data as fallback
        setCourierStatus({
          status: order.latestCourierStatus || 'booked',
          trackingUrl: order.trackingUrl,
        });
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [order]);

  if (!order.courierProvider) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-sm text-amber-800">
          ℹ️ Courier not yet assigned. We'll update you as soon as your order is picked up.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
        <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  const statusFlow = [
    { key: 'booked', label: 'Booked', icon: '📦' },
    { key: 'pickup_pending', label: 'Pickup Pending', icon: '⏳' },
    { key: 'picked_up', label: 'Picked Up', icon: '🚗' },
    { key: 'in_transit', label: 'In Transit', icon: '🚚' },
    { key: 'delivered', label: 'Delivered', icon: '✓' },
  ];

  const currentStatusIndex = statusFlow.findIndex(
    (s) => s.key === (courierStatus?.status || order.latestCourierStatus || 'booked')
  );

  return (
    <div className="space-y-4">
      {/* Rider Info Card */}
      {riderInfo && (
        <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">Your Delivery Driver</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold text-gray-900">{riderInfo.name}</p>
              {riderInfo.phone && (
                <a
                  href={`tel:${riderInfo.phone}`}
                  className="text-sm text-orange-600 hover:text-orange-700 flex items-center gap-1 mt-1"
                >
                  📱 {riderInfo.phone}
                </a>
              )}
            </div>
            <div className="text-4xl">🧑‍⚕️</div>
          </div>
        </div>
      )}

      {/* Estimated Delivery */}
      {estimatedDeliveryTime && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">Estimated Delivery</p>
          <p className="text-lg font-semibold text-gray-900">
            {estimatedDeliveryTime.toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            })}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {estimatedDeliveryTime.toLocaleDateString()}
          </p>
        </div>
      )}

      {/* Status Timeline */}
      <div className="bg-white rounded-lg p-4 border">
        <h3 className="font-medium text-gray-900 mb-4">Delivery Status</h3>

        <div className="space-y-3">
          {statusFlow.map((status, index) => (
            <div key={status.key} className="flex items-center gap-3">
              {/* Timeline dot */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${
                    index <= currentStatusIndex
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {status.icon}
                </div>
                {index < statusFlow.length - 1 && (
                  <div
                    className={`w-0.5 h-8 my-0.5 ${
                      index < currentStatusIndex ? 'bg-green-300' : 'bg-gray-200'
                    }`}
                  ></div>
                )}
              </div>

              {/* Status label */}
              <div className="flex-1">
                <p
                  className={`text-sm font-medium ${
                    index <= currentStatusIndex
                      ? 'text-gray-900'
                      : 'text-gray-500'
                  }`}
                >
                  {status.label}
                </p>
                {index === currentStatusIndex && (
                  <p className="text-xs text-orange-600 font-medium">Current</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tracking Link */}
      {courierStatus?.trackingUrl || order.trackingUrl ? (
        <a
          href={courierStatus?.trackingUrl || order.trackingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 text-sm font-medium transition"
        >
          📍 Real-time Tracking
          <span className="text-lg">→</span>
        </a>
      ) : null}

      {/* Delivery Proof */}
      {order.deliveredTime && courierStatus?.proofUrl && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-medium text-green-900 mb-2">Delivery Proof</h3>
          <a
            href={courierStatus.proofUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-green-600 hover:text-green-700"
          >
            📷 View Photo
            <span>→</span>
          </a>
        </div>
      )}

      {/* Failure/Exception Info */}
      {courierStatus?.status === 'failed' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-medium text-red-900 mb-1">Delivery Failed</h3>
          <p className="text-sm text-red-700 mb-3">
            {courierStatus?.failureReason || 'The delivery could not be completed.'}
          </p>
          <button className="text-sm text-red-600 hover:text-red-700 font-medium">
            Contact Support
          </button>
        </div>
      )}

      {/* Provider Name */}
      <div className="text-center text-xs text-gray-500 pt-2 border-t">
        Powered by {order.courierProvider === 'porter' ? 'Porter' : 'Rapido'}
      </div>
    </div>
  );
}

export default CourierTrackingTimeline;
