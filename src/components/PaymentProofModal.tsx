import React, { useState, useRef, useEffect } from 'react';
import { getDb } from '../lib/firebase-db';
import { doc, Timestamp } from 'firebase/firestore';
import { paymentVerificationService } from '../services/PaymentVerificationService';
import { updateOrderStatus, updatePaymentStatus } from '../services/api';
import { Order, OrderStatus } from '../types';
import { useAuth } from '../context/AuthContext';

interface PaymentProofModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type ProofType = 'upi_screenshot' | 'bank_transfer' | 'card_transaction';

/**
 * Customer Payment Proof Submission Modal
 * Requires customers to submit proof (UTR/screenshot) for UPI/bank payments
 * Prevents "I have paid" fraud by requiring verification before marking order as paid
 */
export function PaymentProofModal({ order, isOpen, onClose, onSuccess }: PaymentProofModalProps) {
  const { currentUser } = useAuth();
  const [proofType, setProofType] = useState<ProofType>('upi_screenshot');
  const [utrNumber, setUtrNumber] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  const handleScreenshotSelect = (file: File | null) => {
    if (!file) {
      setScreenshot(null);
      setScreenshotPreview('');
      return;
    }

    // Validate file
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      // 5MB max
      setError('Image must be less than 5MB');
      return;
    }

    setScreenshot(file);
    setError('');

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setScreenshotPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitProof = async () => {
    // Validate inputs
    if (proofType === 'upi_screenshot' && (!screenshot || !utrNumber.trim())) {
      setError('Please select a screenshot and enter the UTR number');
      return;
    }

    if (proofType !== 'upi_screenshot' && !utrNumber.trim()) {
      setError('Please enter the transaction reference number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Convert screenshot to base64 if provided
      let proofValue = utrNumber;

      if (screenshot) {
        await new Promise<void>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            proofValue = e.target?.result as string;
            resolve();
          };
          reader.readAsDataURL(screenshot);
        });
      }

      const submitterId = currentUser?.uid || order.userId;
      if (!submitterId) {
        throw new Error('Please log in to submit payment proof. We need your account to verify this payment.');
      }

      // Submit proof
      await paymentVerificationService.submitPaymentProof({
        orderId: order.id,
        proofType,
        proofValue,
        submittedAt: new Date(),
        submittedBy: submitterId,
        notes: notes || undefined,
      });

      // Transition order into verification state and keep payment pending verification
      await updateOrderStatus(order.id, OrderStatus.PAYMENT_VERIFICATION);
      await updatePaymentStatus(order.id, 'pending', { paymentSubmittedAt: Timestamp.fromDate(new Date()) }, 'customer');

      setSuccess(true);

      // Close modal after delay
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Error submitting payment proof:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit payment proof');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto border border-gray-100 dark:border-gray-800">
        <h2 className="text-xl font-black mb-2 dark:text-white">Verify Payment</h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
          Please submit proof of payment to verify your transaction
        </p>

        {success ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <div className="text-4xl mb-2">✓</div>
            <h3 className="font-semibold text-green-800 mb-2">Proof Submitted!</h3>
            <p className="text-green-700 text-sm">
              Your payment proof has been received. The admin will verify it within 24 hours.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm">
                {error}
              </div>
            )}

            {/* Proof Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method
              </label>
              <div className="space-y-2">
                <label className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="proofType"
                    value="upi_screenshot"
                    checked={proofType === 'upi_screenshot'}
                    onChange={(e) => setProofType(e.target.value as ProofType)}
                    disabled={loading}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <p className="font-medium text-gray-900">UPI Payment</p>
                    <p className="text-xs text-gray-500">
                      Upload transaction screenshot + enter UTR number
                    </p>
                  </div>
                </label>

                <label className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="proofType"
                    value="bank_transfer"
                    checked={proofType === 'bank_transfer'}
                    onChange={(e) => setProofType(e.target.value as ProofType)}
                    disabled={loading}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <p className="font-medium text-gray-900">Bank Transfer</p>
                    <p className="text-xs text-gray-500">Enter transaction/reference number</p>
                  </div>
                </label>

                <label className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="proofType"
                    value="card_transaction"
                    checked={proofType === 'card_transaction'}
                    onChange={(e) => setProofType(e.target.value as ProofType)}
                    disabled={loading}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <p className="font-medium text-gray-900">Card Payment</p>
                    <p className="text-xs text-gray-500">Enter transaction reference number</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Screenshot Upload for UPI */}
            {proofType === 'upi_screenshot' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Screenshot
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-orange-500 hover:bg-orange-50 transition"
                >
                  {screenshotPreview ? (
                    <div className="space-y-2">
                      <img
                        src={screenshotPreview}
                        alt="Preview"
                        className="max-w-full max-h-32 mx-auto rounded"
                      />
                      <p className="text-xs text-gray-500">{screenshot?.name}</p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleScreenshotSelect(null);
                        }}
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">Click to upload screenshot</p>
                      <p className="text-xs text-gray-500">PNG, JPG, up to 5MB</p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleScreenshotSelect(e.target.files?.[0] || null)}
                  className="hidden"
                  disabled={loading}
                />
              </div>
            )}

            {/* UTR/Reference Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {proofType === 'upi_screenshot' ? 'UTR Number' : 'Reference Number'}
              </label>
              <input
                type="text"
                value={utrNumber}
                onChange={(e) => setUtrNumber(e.target.value.toUpperCase())}
                placeholder={
                  proofType === 'upi_screenshot'
                    ? 'e.g., 314123556432'
                    : 'Enter your reference number'
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono text-sm"
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Found in your payment confirmation message/email
              </p>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional details about the payment..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm resize-none"
                disabled={loading}
              />
            </div>

            {/* Order Summary */}
            <div className="bg-gray-50 p-3 rounded-md text-sm space-y-2">
              <p>
                <strong>Order ID:</strong> {order.id}
              </p>
              <p>
                <strong>Amount:</strong> ₹{order.totalAmount.toFixed(2)}
              </p>
              <p>
                <strong>Payment Method:</strong> {order.paymentMethod ? order.paymentMethod.toUpperCase() : 'N/A'}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                ℹ️ Your proof will be verified by our admin team. Order confirmation will be sent
                after verification.
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
                onClick={handleSubmitProof}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit Proof'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PaymentProofModal;
