import React, { useState, useEffect } from 'react';
import { CheckCircle, X } from 'lucide-react';
import { getDb } from '../../firebase';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { paymentVerificationService } from '../../services/PaymentVerificationService';
import { updateOrderStatus, updatePaymentStatus } from '../../services/api';
import { OrderStatus } from '../../types';

interface PaymentProof {
  id: string;
  orderId: string;
  proofType: string;
  proofValue: string;
  submittedAt: any;
  submittedBy: string;
  status: 'pending_review' | 'verified' | 'rejected';
  verifiedBy?: string;
  fraudFlags?: string[];
}

interface VerificationState {
  loading: boolean;
  proofs: PaymentProof[];
  selectedProof: PaymentProof | null;
  verifying: boolean;
  error: string;
}

/**
 * Admin Payment Verification Panel
 * Allows admin to review payment proofs and verify/reject payments
 * Prevents payment fraud by requiring proof and manual/automated verification
 */
export function PaymentVerificationPanel() {
  const [state, setState] = useState<VerificationState>({
    loading: true,
    proofs: [],
    selectedProof: null,
    verifying: false,
    error: '',
  });

  // Load pending verifications on mount
  useEffect(() => {
    loadPendingVerifications();
  }, []);

  const loadPendingVerifications = async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: '' }));
      const pendingProofs = await paymentVerificationService.getPendingVerifications(50);
      setState((prev) => ({ ...prev, proofs: pendingProofs, loading: false }));
    } catch (error) {
      console.error('Error loading proofs:', error);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: 'Failed to load payment proofs',
      }));
    }
  };

  const handleVerifyPayment = async (proofId: string, razorpayPaymentId?: string) => {
    const proof = state.proofs.find((p) => p.id === proofId);
    if (!proof) return;

    try {
      setState((prev) => ({ ...prev, verifying: true, error: '' }));

      // Verify the payment proof
      const result = await paymentVerificationService.verifyPaymentProof(
        proof.orderId,
        proofId,
        razorpayPaymentId,
        'admin' // Current admin user ID should come from auth
      );

      if (result.verified) {
        // Transition order to accepted after payment verification
        await updateOrderStatus(proof.orderId, OrderStatus.ACCEPTED);
        await updatePaymentStatus(
          proof.orderId,
          'success',
          {
            paymentVerifiedBy: 'admin',
            paymentVerifiedAt: Timestamp.now(),
            paymentRiskFlag: false,
          },
          'admin'
        );

        setState((prev) => ({
          ...prev,
          proofs: prev.proofs.map((p) =>
            p.id === proofId ? { ...p, status: 'verified' } : p
          ),
          selectedProof: null,
          verifying: false,
        }));
      } else {
        setState((prev) => ({
          ...prev,
          selectedProof: { ...proof, fraudFlags: result.flags },
          verifying: false,
          error: `Verification failed: ${result.reason}. Flags: ${result.flags.join(', ')}`,
        }));
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      setState((prev) => ({
        ...prev,
        verifying: false,
        error: 'Failed to verify payment',
      }));
    }
  };

  const handleRejectPayment = async (proofId: string) => {
    const proof = state.proofs.find((p) => p.id === proofId);
    if (!proof) return;

    try {
      setState((prev) => ({ ...prev, verifying: true, error: '' }));

      // Update order payment status to FAILED
      await updatePaymentStatus(
        proof.orderId,
        'failed',
        {
          paymentRiskFlag: true,
        },
        'admin'
      );

      // Update proof status
      await updateDoc(doc(getDb(), 'paymentProofs', proofId), {
        status: 'rejected',
        verifiedBy: 'admin',
        verifiedAt: Timestamp.now(),
      });

      setState((prev) => ({
        ...prev,
        proofs: prev.proofs.map((p) =>
          p.id === proofId ? { ...p, status: 'rejected' } : p
        ),
        selectedProof: null,
        verifying: false,
      }));
    } catch (error) {
      console.error('Error rejecting payment:', error);
      setState((prev) => ({
        ...prev,
        verifying: false,
        error: 'Failed to reject payment',
      }));
    }
  };

  if (state.loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="w-8 h-8 border-4 border-red-200 border-t-red-600 rounded-full animate-spin"></div>
        <p className="text-gray-600 dark:text-gray-400 font-medium">Loading payment verifications...</p>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Payment Verification</h2>
          <p className="text-gray-600 dark:text-gray-400">Review and verify payment proofs to prevent fraud</p>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <X size={32} className="text-red-600" />
          </div>
          <h3 className="text-lg font-bold text-red-800 dark:text-red-400 mb-2">Failed to Load Verifications</h3>
          <p className="text-red-700 dark:text-red-300 mb-6 text-sm">{state.error}</p>
          <button
            onClick={loadPendingVerifications}
            className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Payment Verification</h2>
        <p className="text-gray-600 dark:text-gray-400">Review and verify payment proofs to prevent fraud</p>
      </div>

      {/* Pending Proofs List */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl premium-card-shadow border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-bold text-gray-900 dark:text-white text-lg">Pending Verifications</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {state.proofs.filter((p) => p.status === 'pending_review').length} proofs awaiting review
          </p>
        </div>

        {state.proofs.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">All Caught Up!</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">No pending payment verifications at the moment</p>
            <button
              onClick={loadPendingVerifications}
              className="px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Refresh
            </button>
          </div>
        ) : (
          <div className="divide-y">
            {state.proofs.map((proof) => (
              <div
                key={proof.id}
                className={`px-6 py-4 ${
                  state.selectedProof?.id === proof.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Order: {proof.orderId}</p>
                    <p className="text-sm text-gray-600">
                      Type: {proof.proofType.replace(/_/g, ' ').toUpperCase()}
                    </p>
                    <p className="text-sm text-gray-500">
                      Submitted:{' '}
                      {proof.submittedAt?.toDate?.().toLocaleString() || 'N/A'}
                    </p>
                    {proof.fraudFlags && proof.fraudFlags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {proof.fraudFlags.map((flag) => (
                          <span
                            key={flag}
                            className="inline-block bg-red-100 text-red-700 text-xs px-2 py-1 rounded"
                          >
                            ⚠️ {flag.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <span
                      className={`px-3 py-1 rounded text-sm font-medium ${
                        proof.status === 'pending_review'
                          ? 'bg-yellow-100 text-yellow-800'
                          : proof.status === 'verified'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {proof.status}
                    </span>

                    {proof.status === 'pending_review' && (
                      <button
                        onClick={() =>
                          setState((prev) => ({
                            ...prev,
                            selectedProof:
                              prev.selectedProof?.id === proof.id ? null : proof,
                          }))
                        }
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Review
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Review Panel */}
                {state.selectedProof?.id === proof.id && proof.status === 'pending_review' && (
                  <div className="mt-4 pt-4 border-t space-y-3">
                    {/* Proof Display */}
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-sm font-medium text-gray-700 mb-2">Proof Value:</p>
                      {proof.proofType === 'upi_screenshot' ? (
                        <div className="bg-white p-2 rounded border max-h-64 overflow-auto">
                          {proof.proofValue.startsWith('data:image/') ? (
                            <img
                              src={proof.proofValue}
                              alt="UPI Screenshot"
                              className="max-w-full"
                            />
                          ) : (
                            <p className="text-gray-600 break-all text-xs">
                              {proof.proofValue}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="font-mono text-sm text-gray-800 break-all">
                          {proof.proofValue}
                        </p>
                      )}
                    </div>

                    {/* Fraud Flags Warning */}
                    {proof.fraudFlags && proof.fraudFlags.length > 0 && (
                      <div className="bg-red-50 border border-red-200 p-3 rounded">
                        <p className="text-sm font-medium text-red-800 mb-2">
                          ⚠️ Fraud Detection Flags:
                        </p>
                        <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                          {proof.fraudFlags.map((flag) => (
                            <li key={flag}>{flag.replace(/_/g, ' ')}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Verification Buttons */}
                    <div className="bg-blue-50 p-3 rounded space-y-2">
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Verification Actions:
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleVerifyPayment(proof.id)}
                          disabled={state.verifying}
                          className="flex-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm"
                        >
                          {state.verifying ? 'Verifying...' : '✓ Verify Payment'}
                        </button>
                        <button
                          onClick={() => handleRejectPayment(proof.id)}
                          disabled={state.verifying}
                          className="flex-1 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 text-sm"
                        >
                          {state.verifying ? 'Rejecting...' : '✗ Reject Payment'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Verified & Rejected Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-6 premium-card-shadow">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
              <CheckCircle size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-green-800 dark:text-green-400 uppercase tracking-wide">Verified Today</p>
            </div>
          </div>
          <p className="text-3xl font-black text-green-600">{state.proofs.filter((p) => p.status === 'verified').length}</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 premium-card-shadow">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
              <X size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-red-800 dark:text-red-400 uppercase tracking-wide">Rejected Today</p>
            </div>
          </div>
          <p className="text-3xl font-black text-red-600">{state.proofs.filter((p) => p.status === 'rejected').length}</p>
        </div>
      </div>
    </div>
  );
}

export default PaymentVerificationPanel;
