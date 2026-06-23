import React from 'react';
import { m } from 'framer-motion';
import { Shield, FileText, Scale, Clock } from 'lucide-react';

const Terms: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 pb-24 px-6">
      <m.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full bg-white rounded-[2.5rem] p-12 shadow-sm border border-gray-100"
      >
        <div className="flex items-center gap-4 mb-10">
          <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600">
            <FileText size={24} />
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Terms of Service</h1>
        </div>

        <div className="prose prose-red max-w-none space-y-8 text-gray-600 font-medium">
          <section>
            <h2 className="text-2xl font-black text-gray-900 mb-4">1. Platform Usage</h2>
            <p>Welcome to BhojanOS. By accessing our platform, you agree to comply with and be bound by these terms. Our service is designed to provide authentic home-cooked meals delivered to your doorstep.</p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-gray-900 mb-4">2. Order Responsibility</h2>
            <p>Users are responsible for providing accurate delivery information, including address and contact details. BhojanOS is not liable for delivery failures due to incorrect information provided by the customer.</p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-gray-900 mb-4">3. Delivery Timelines</h2>
            <p>While we strive for punctuality, delivery times are estimates and may vary based on traffic, weather, and kitchen load. We will communicate any significant delays through the platform or contact number.</p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-gray-900 mb-4">4. Limitation of Liability</h2>
            <p>BhojanOS shall not be liable for any indirect, incidental, or consequential damages arising from the use of our service or consumption of our food products beyond the order value.</p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-gray-900 mb-4">5. Payment Terms</h2>
            <p>Payments can be made via Razorpay (Online) or Cash on Delivery. Online payments are processed securely. In case of payment failure where money is deducted, please refer to our Refund Policy.</p>
          </section>
        </div>
      </m.div>
    </div>
  );
};

export default Terms;
