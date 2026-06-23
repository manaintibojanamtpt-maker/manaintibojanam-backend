import React, { useState } from 'react';
import { Share2, Copy, CheckCircle2, Gift } from 'lucide-react';

interface ReferralBannerProps {
  referralCode: string;
}

export default function ReferralBanner({ referralCode }: ReferralBannerProps) {
  const [copied, setCopied] = useState(false);

  const message = `🍱 Daily Home-Style Meals!\n\nI’m using BhojanOS for daily meals 😋\n\nUse my code ${referralCode} and get ₹100 OFF!\n\n👉 https://bhojanos.web.app`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'BhojanOS',
          text: message,
        });
      } catch (err) {
        console.error('Share failed', err);
      }
    } else {
      const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-[2rem] p-6 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
      
      <div className="flex items-center gap-4 relative z-10">
        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
          <Gift size={24} className="text-white" />
        </div>
        <div>
          <h3 className="text-xl font-black">Refer & Earn ₹100</h3>
          <p className="text-sm font-medium text-red-100">Share your code to get ₹100 off your next renewal!</p>
        </div>
      </div>

      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full md:w-auto relative z-10">
        <div className="bg-white/10 border border-white/20 px-4 py-3 rounded-xl font-black tracking-widest text-base sm:text-lg w-full sm:flex-1 text-center">
          {referralCode}
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button 
            onClick={handleCopy}
            className="flex-1 sm:flex-none p-3 bg-white/20 hover:bg-white/30 rounded-xl transition-colors flex justify-center items-center"
            title="Copy Code"
          >
            {copied ? <CheckCircle2 size={20} /> : <Copy size={20} />}
          </button>
          <button 
            onClick={handleShare}
            className="flex-[2] sm:flex-none px-6 py-3 bg-white text-red-600 font-bold rounded-xl flex justify-center items-center gap-2 hover:bg-gray-50 transition-colors shadow-lg whitespace-nowrap"
          >
            <Share2 size={18} /> Share
          </button>
        </div>
      </div>
    </div>
  );
}
