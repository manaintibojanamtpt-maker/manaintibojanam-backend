import React from 'react';
import { m } from 'framer-motion';
import { Shield, Lock, Eye, Database } from 'lucide-react';

const Privacy: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 pb-24 px-6">
      <m.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full bg-white rounded-[2.5rem] p-12 shadow-sm border border-gray-100"
      >
        <div className="flex items-center gap-4 mb-10">
          <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600">
            <Shield size={24} />
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Privacy Policy</h1>
        </div>

        <div className="prose prose-red max-w-none space-y-8 text-gray-600 font-medium">
          <section>
            <h2 className="text-2xl font-black text-gray-900 mb-4">1. Data Collection</h2>
            <p>We collect personal information such as your phone number, name, and delivery address to facilitate order processing and communication. This information is provided voluntarily by you during the login and checkout process.</p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-gray-900 mb-4">2. Usage of Information</h2>
            <p>Your data is used exclusively for fulfilling your orders, providing customer support, and communicating order-related updates (via WhatsApp, SMS, or Push Notifications). We do not sell or share your personal data with third parties for marketing purposes.</p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-gray-900 mb-4">3. Secure Storage</h2>
            <p>We use Firebase (Google Cloud Platform) for secure data storage and authentication. Your information is protected using industry-standard encryption and security protocols.</p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-gray-900 mb-4">4. Cookies and Tracking</h2>
            <p>Our platform may use cookies to enhance your browsing experience and remember your preferences. These cookies do not store sensitive personal information.</p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-gray-900 mb-4">5. Your Rights</h2>
            <p>You have the right to access, correct, or request the deletion of your personal data. Please contact our support team for any privacy-related inquiries.</p>
          </section>
        </div>
      </m.div>
    </div>
  );
};

export default Privacy;
