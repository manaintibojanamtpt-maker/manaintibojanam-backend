import React from 'react';
import { m } from 'framer-motion';
import { XCircle, Clock, CheckCircle, AlertCircle } from 'lucide-react';

const CancellationPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 pb-24 px-6">
      <m.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full bg-white rounded-[2.5rem] p-12 shadow-sm border border-gray-100"
      >
        <div className="flex items-center gap-4 mb-10">
          <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600">
            <XCircle size={24} />
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Cancellation Policy</h1>
        </div>

        <div className="prose prose-red max-w-none space-y-8 text-gray-600 font-medium">
          <section className="bg-red-50 p-8 rounded-3xl border border-red-100">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <Clock size={24} />
              <h2 className="text-2xl font-black text-gray-900 m-0">60-Second Cancellation Window</h2>
            </div>
            <p className="text-red-900 font-bold m-0">Orders can be cancelled within 60 seconds after placement. After this time, cancellation is NOT allowed as food preparation starts immediately to ensure fresh and timely delivery.</p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-gray-900 mb-4">1. Customer Cancellation</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Cancellation is allowed only within the 60-second window.</li>
              <li>A countdown timer is displayed on the order tracking screen for your convenience.</li>
              <li>Once the timer expires, the "Cancel" button will be disabled.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-black text-gray-900 mb-4">2. Restaurant Cancellation</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>In rare cases, the restaurant may cancel an order due to item unavailability or unforeseen circumstances.</li>
              <li>If the restaurant cancels your order, a full refund will be issued automatically.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-black text-gray-900 mb-4">3. Refund for Cancelled Orders</h2>
            <p>Refunds for orders cancelled within the 60-second window or by the restaurant will be processed according to our Refund Policy timelines.</p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-gray-900 mb-4">4. Policy Updates</h2>
            <p>BhojanOS reserves the right to modify this policy at any time. Any changes will be updated on this page.</p>
          </section>
        </div>
      </m.div>
    </div>
  );
};

export default CancellationPolicy;
