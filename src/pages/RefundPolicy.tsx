import React from 'react';
import { motion } from 'framer-motion';
import { RefreshCcw, CheckCircle, XCircle, Clock } from 'lucide-react';

const RefundPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 pb-24 px-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full bg-white rounded-[2.5rem] p-12 shadow-sm border border-gray-100"
      >
        <div className="flex items-center gap-4 mb-10">
          <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600">
            <RefreshCcw size={24} />
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Refund Policy</h1>
        </div>

        <div className="prose prose-red max-w-none space-y-8 text-gray-600 font-medium">
          <section>
            <h2 className="text-2xl font-black text-gray-900 mb-4">1. Full Refund Cases</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Order cancelled by the restaurant for any reason.</li>
              <li>Payment failed but money was deducted from your account.</li>
              <li>Item(s) ordered are unavailable at the time of preparation.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-black text-gray-900 mb-4">2. Partial Refund Cases</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Wrong items delivered (refund for the specific item).</li>
              <li>Missing items from the order (refund for the missing item).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-black text-gray-900 mb-4 text-red-600">3. No Refund Cases</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Order cancelled after the 30-second cancellation window.</li>
              <li>Order already prepared or dispatched.</li>
              <li>Incorrect delivery address provided by the customer.</li>
              <li>Customer unavailable at the delivery location.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-black text-gray-900 mb-4">4. Refund Timelines</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">UPI Payments</p>
                <p className="text-lg font-black text-gray-900">2–4 Hours</p>
              </div>
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Card / Netbanking</p>
                <p className="text-lg font-black text-gray-900">5–7 Working Days</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-black text-gray-900 mb-4">5. Contact Support</h2>
            <p>For any refund-related queries, please contact our support team at +91 97038 12827 with your order ID.</p>
          </section>
        </div>
      </motion.div>
    </div>
  );
};

export default RefundPolicy;
