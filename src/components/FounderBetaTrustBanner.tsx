import React from 'react';
import { Phone, Mail, ShieldCheck } from 'lucide-react';

const FounderBetaTrustBanner: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`w-full max-w-4xl mx-auto bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-500/30 rounded-2xl p-6 relative overflow-hidden ${className}`}>
      <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-20 mix-blend-soft-light pointer-events-none" />
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
        <div className="flex-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-[10px] font-bold uppercase tracking-widest mb-3">
            <ShieldCheck size={14} /> Founder Beta Program
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Need help setting up your kitchen?</h3>
          <p className="text-gray-300 text-sm font-medium">We will personally help you launch your store and get your first order.</p>
        </div>
        
        <div className="flex flex-col gap-3 min-w-[250px]">
          <a href="https://wa.me/917666258454" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center md:justify-start gap-3 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 transition-colors rounded-xl px-4 py-3 group">
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 group-hover:scale-110 transition-transform">
              <Phone size={16} />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-bold text-green-400/70 uppercase tracking-widest">Call or WhatsApp</span>
              <span className="text-sm font-bold text-white">+91 76662 58454</span>
            </div>
          </a>
          
          <a href="mailto:bhojanos26@gmail.com" className="flex items-center justify-center md:justify-start gap-3 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors rounded-xl px-4 py-3 group">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-gray-300 group-hover:scale-110 transition-transform">
              <Mail size={16} />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email Support</span>
              <span className="text-sm font-bold text-white">bhojanos26@gmail.com</span>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
};

export default FounderBetaTrustBanner;
