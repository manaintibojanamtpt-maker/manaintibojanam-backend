/**
 * Delivery Feedback Modal Component
 * Auto-triggered when order reaches DELIVERED status
 * Collects star rating, feedback text, and experience tags
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Order, OrderStatus } from '../types';
import { Star, Send, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { doc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getDb } from '../lib/firebase-db';

interface DeliveryFeedbackModalProps {
  order: Order | null;
  isVisible: boolean;
  onDismiss: () => void;
}

export const DeliveryFeedbackModal: React.FC<DeliveryFeedbackModalProps> = ({
  order,
  isVisible,
  onDismiss,
}) => {
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);

  const feedbackTags = [
    '🚀 Fast Delivery',
    '🍲 Food Quality',
    '📦 Good Packaging',
    '😊 Friendly Rider',
    '🌡️ Temperature Perfect',
    '✅ Order Accurate',
  ];

  const handleSubmit = async () => {
    if (!order?.id) return;

    setIsSubmitting(true);
    try {
      // Save feedback to order document
      await updateDoc(doc(getDb(), 'orders', order.id), {
        'feedback.status': 'SUBMITTED',
        'feedback.rating': rating,
        'feedback.text': feedback,
        'feedback.tags': selectedTags,
        'feedback.submittedAt': serverTimestamp(),
      });

      // Also add to reviews collection for admin dashboard
      await addDoc(collection(getDb(), 'reviews'), {
        orderId: order.id,
        userId: order.userId,
        customerName: order.customerName,
        rating,
        feedback,
        tags: selectedTags,
        totalAmount: order.totalAmount || (order as any).pricing?.totalAmount,
        createdAt: serverTimestamp(),
      });

      toast.success('Thank you for your feedback! ❤️');
      setRating(5);
      setFeedback('');
      setSelectedTags([]);
      onDismiss();
    } catch (error) {
      console.error('Feedback submission error:', error);
      toast.error('Failed to save feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isVisible || !order) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onDismiss}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:transform sm:-translate-x-1/2 sm:-translate-y-1/2 z-50 w-full sm:max-w-md px-4 sm:px-0"
          >
            <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
              {/* Close button */}
              <button
                onClick={onDismiss}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X size={24} />
              </button>

              {/* Header */}
              <div className="mb-6">
                <h2 className="text-2xl font-black text-gray-900 mb-2">
                  How was your order? 😋
                </h2>
                <p className="text-sm text-gray-600">
                  Your feedback helps us improve!
                </p>
              </div>

              {/* Order Summary */}
              <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 mb-6">
                <p className="text-xs text-gray-600 font-bold">ORDER #{order.id?.slice(0, 8)}</p>
                <p className="font-bold text-gray-900">{order.customerName}</p>
                <p className="text-sm text-orange-600 font-bold">
                  ₹{(order.totalAmount || (order as any).pricing?.totalAmount)?.toFixed(2)}
                </p>
              </div>

              {/* Star Rating */}
              <div className="mb-6">
                <p className="text-sm font-bold text-gray-700 mb-3">Rate your experience</p>
                <div className="flex justify-center gap-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <motion.button
                      key={star}
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(null)}
                      onClick={() => setRating(star)}
                      className="transition-transform"
                    >
                      <Star
                        size={40}
                        className={`transition-all ${
                          star <= (hoveredRating ?? rating)
                            ? 'fill-yellow-400 text-yellow-400 drop-shadow-lg'
                            : 'text-gray-300'
                        }`}
                      />
                    </motion.button>
                  ))}
                </div>
                <p className="text-center text-sm text-gray-600 mt-2">
                  {[
                    '',
                    '😞 Poor',
                    '😐 Average',
                    '😊 Good',
                    '😄 Very Good',
                    '🤩 Excellent',
                  ][rating]}
                </p>
              </div>

              {/* Feedback Tags */}
              <div className="mb-6">
                <p className="text-sm font-bold text-gray-700 mb-3">What went well? (optional)</p>
                <div className="flex flex-wrap gap-2">
                  {feedbackTags.map((tag) => (
                    <motion.button
                      key={tag}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() =>
                        setSelectedTags((prev) =>
                          prev.includes(tag)
                            ? prev.filter((t) => t !== tag)
                            : [...prev, tag]
                        )
                      }
                      className={`px-3 py-2 rounded-full text-xs font-bold transition-all ${
                        selectedTags.includes(tag)
                          ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {tag}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Feedback Text */}
              <div className="mb-6">
                <label className="text-sm font-bold text-gray-700 mb-2 block">
                  Comments (optional)
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Share additional feedback or suggestions..."
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-orange-500 outline-none font-medium text-sm resize-none"
                  rows={4}
                />
              </div>

              {/* Submit Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full py-3 bg-gradient-to-br from-orange-600 to-orange-700 text-white rounded-lg font-black flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-orange-600/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Submit Feedback
                  </>
                )}
              </motion.button>

              {/* Skip button */}
              <button
                onClick={onDismiss}
                disabled={isSubmitting}
                className="w-full mt-3 py-2 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                Skip for now
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default DeliveryFeedbackModal;
