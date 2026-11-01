import React, { useState } from 'react';
import { 
  Phone, 
  Mail, 
  MessageSquare, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  Send, 
  Sparkles, 
  CheckCircle2, 
  Headphones,
  ArrowRight
} from 'lucide-react';
import { 
  SUPPORT_EMAIL, 
  SUPPORT_PHONE, 
  SUPPORT_PHONE_DISPLAY, 
  SUPPORT_WHATSAPP_URL 
} from '../../config/support';
import { toast } from 'react-hot-toast';

export interface ContactSalesSupportSectionProps {
  className?: string;
  defaultTopic?: 'sales' | 'support' | 'migration';
}

export const ContactSalesSupportSection: React.FC<ContactSalesSupportSectionProps> = ({ 
  className = '',
  defaultTopic = 'sales' 
}) => {
  const [activeTab, setActiveTab] = useState<'sales' | 'support'>(
    defaultTopic === 'support' ? 'support' : 'sales'
  );

  const [formData, setFormData] = useState({
    name: '',
    restaurantName: '',
    phone: '',
    email: '',
    topic: defaultTopic === 'support' ? 'Active Kitchen Support' : 'Book a Live Demo',
    outlets: '1 Outlet',
    message: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      toast.error('Please enter your name and phone number.');
      return;
    }

    setIsSubmitting(true);
    // Simulate swift submission & notify
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      toast.success('Your message has been sent to our sales & support team! We will respond in under 15 minutes.');
    }, 600);
  };

  return (
    <section 
      id="contact" 
      className={`relative py-20 sm:py-28 bg-[#09090B] text-white border-y border-[#27272A] overflow-hidden scroll-mt-24 ${className}`}
      aria-labelledby="contact-heading"
    >
      {/* Background ambient radial lights */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-[#D97706]/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[140px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.05] border border-[#D97706]/35 backdrop-blur-md mb-4 shadow-sm">
            <Headphones size={13} className="text-[#D97706]" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#D97706]">
              24/7 Enterprise Sales &amp; Operations Support
            </span>
          </div>

          <h2 
            id="contact-heading"
            className="text-3xl sm:text-4xl md:text-5xl font-black text-[#FAFAFA] tracking-tight leading-tight"
          >
            Contact Sales &amp;{' '}
            <span className="bg-gradient-to-r from-[#D97706] to-[#F59E0B] bg-clip-text text-transparent">
              Kitchen Support
            </span>
          </h2>

          <p className="mt-4 text-base sm:text-lg text-[#A1A1AA] leading-relaxed font-normal">
            Need a customized 1-on-1 walkthrough, migration help from Petpooja/DotPe, or urgent live kitchen line assistance? Our Bengaluru engineers are ready.
          </p>

          {/* Interactive Switcher between Sales & Support */}
          <div className="mt-8 inline-flex items-center p-1 rounded-full bg-[#141417] border border-[#27272A] shadow-inner">
            <button
              type="button"
              onClick={() => {
                setActiveTab('sales');
                setFormData(prev => ({ ...prev, topic: 'Book a Live Demo' }));
              }}
              className={`px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'sales'
                  ? 'bg-[#D97706] text-black shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              💼 Talk to Sales &amp; Book Demo
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('support');
                setFormData(prev => ({ ...prev, topic: 'Active Kitchen Support' }));
              }}
              className={`px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'support'
                  ? 'bg-emerald-500 text-black shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              🛠️ Live Kitchen Support (24/7)
            </button>
          </div>
        </div>

        {/* 2-Column Grid: Contact Information Cards + Contact Form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* Left Column (5 Cols): Direct Communication Channels */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* WhatsApp Priority Card */}
            <a
              href={SUPPORT_WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block group p-6 rounded-2xl bg-[#141417]/90 border border-[#27272A] hover:border-emerald-500/50 backdrop-blur-xl shadow-xl transition-all duration-200"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <MessageSquare size={22} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">WhatsApp Live Desk</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Online
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Fastest response for active shifts, menu updates &amp; rider routing.
                  </p>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 mt-2 group-hover:underline">
                    Chat on WhatsApp &rarr;
                  </span>
                </div>
              </div>
            </a>

            {/* Direct Phone Card */}
            <a
              href={`tel:${SUPPORT_PHONE}`}
              className="block group p-6 rounded-2xl bg-[#141417]/90 border border-[#27272A] hover:border-[#D97706]/50 backdrop-blur-xl shadow-xl transition-all duration-200"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#D97706]/15 text-[#F59E0B] border border-[#D97706]/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Phone size={22} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">Phone Support Line</span>
                    <span className="text-[11px] font-mono text-zinc-400">9 AM – 9 PM IST</span>
                  </div>
                  <p className="text-base font-extrabold text-white font-mono mt-0.5 tracking-tight">
                    {SUPPORT_PHONE_DISPLAY}
                  </p>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#D97706] mt-2 group-hover:underline">
                    Call Direct &rarr;
                  </span>
                </div>
              </div>
            </a>

            {/* Email Support Card */}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="block group p-6 rounded-2xl bg-[#141417]/90 border border-[#27272A] hover:border-blue-500/50 backdrop-blur-xl shadow-xl transition-all duration-200"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Mail size={22} />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-bold text-white">Email Sales &amp; Support</span>
                  <p className="text-sm font-semibold text-white font-mono mt-0.5">
                    {SUPPORT_EMAIL}
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">
                    Guaranteed response within 15 minutes during operating hours.
                  </p>
                </div>
              </div>
            </a>

            {/* Engineering Hub / Location */}
            <div className="p-6 rounded-2xl bg-[#141417]/90 border border-[#27272A] backdrop-blur-xl shadow-xl">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0">
                  <MapPin size={22} />
                </div>
                <div>
                  <span className="text-sm font-bold text-white">Headquarters &amp; Tech Hub</span>
                  <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                    BhojanOS Technologies Pvt. Ltd.<br />
                    100ft Road, Indiranagar, Bengaluru, Karnataka 560038
                  </p>
                  <div className="flex items-center gap-2 mt-3 text-[11px] font-mono text-zinc-400">
                    <Clock size={12} className="text-[#10B981]" />
                    <span>24/7 Operations Monitoring</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column (7 Cols): Interactive Form */}
          <div className="lg:col-span-7">
            <div className="p-6 sm:p-8 md:p-10 rounded-3xl bg-[#141417]/95 border border-[#27272A] backdrop-blur-2xl shadow-2xl relative">
              
              {/* Form Decorative Edge Ring */}
              <div 
                className="absolute inset-0 rounded-3xl pointer-events-none border border-white/5" 
                aria-hidden="true" 
              />

              {submitted ? (
                <div className="py-12 text-center flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[#10B981] flex items-center justify-center mb-4">
                    <CheckCircle2 size={32} />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Message Received!</h3>
                  <p className="text-sm text-zinc-400 max-w-md mx-auto mb-6 leading-relaxed">
                    Thank you, <span className="text-white font-semibold">{formData.name}</span>. An operational specialist has been assigned to <span className="text-[#D97706] font-semibold">{formData.restaurantName || 'your restaurant'}</span>. We will call you at <span className="text-white font-mono">{formData.phone}</span> shortly.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <a
                      href={SUPPORT_WHATSAPP_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md"
                    >
                      <MessageSquare size={14} />
                      Open WhatsApp Live Chat
                    </a>
                    <button
                      type="button"
                      onClick={() => setSubmitted(false)}
                      className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors"
                    >
                      Send Another Inquiry
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="border-b border-[#27272A] pb-4 mb-6">
                    <h3 className="text-xl font-bold text-white tracking-tight">
                      {activeTab === 'sales' ? 'Book a 1-on-1 Demo or Enterprise Consultation' : 'Submit a Priority Kitchen Support Ticket'}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1">
                      {activeTab === 'sales' 
                        ? 'Fill out your restaurant details below to get a custom pricing proposal and live architecture demo.' 
                        : 'Describe your issue below. Our Bengaluru shift engineering team responds within 15 minutes.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5 font-mono">
                        Your Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Ramesh Kumar"
                        className="w-full px-4 py-3 rounded-xl bg-[#1B1B1F] border border-[#2E2E33] text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#D97706] transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5 font-mono">
                        Restaurant / Brand Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.restaurantName}
                        onChange={(e) => setFormData({ ...formData, restaurantName: e.target.value })}
                        placeholder="e.g. Amber Biryani Kitchen"
                        className="w-full px-4 py-3 rounded-xl bg-[#1B1B1F] border border-[#2E2E33] text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#D97706] transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5 font-mono">
                        Phone Number (WhatsApp) *
                      </label>
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+91 98450 12345"
                        className="w-full px-4 py-3 rounded-xl bg-[#1B1B1F] border border-[#2E2E33] text-sm text-white font-mono placeholder:text-zinc-500 focus:outline-none focus:border-[#D97706] transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5 font-mono">
                        Work Email
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="owner@restaurant.com"
                        className="w-full px-4 py-3 rounded-xl bg-[#1B1B1F] border border-[#2E2E33] text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#D97706] transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5 font-mono">
                        Inquiry Topic
                      </label>
                      <select
                        value={formData.topic}
                        onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-[#1B1B1F] border border-[#2E2E33] text-sm text-white focus:outline-none focus:border-[#D97706] transition-colors"
                      >
                        <option value="Book a Live Demo">Book a Live 1-on-1 Demo</option>
                        <option value="Petpooja / DotPe Migration">Migrate from Petpooja / DotPe</option>
                        <option value="Multi-Outlet Franchise Pricing">Multi-Outlet / Enterprise Pricing</option>
                        <option value="Active Kitchen Support">Active Kitchen Line Support</option>
                        <option value="Hardware & Thermal Printer Setup">Hardware &amp; Thermal Printer Setup</option>
                        <option value="Other">Other Question</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5 font-mono">
                        Number of Outlets
                      </label>
                      <select
                        value={formData.outlets}
                        onChange={(e) => setFormData({ ...formData, outlets: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-[#1B1B1F] border border-[#2E2E33] text-sm text-white focus:outline-none focus:border-[#D97706] transition-colors"
                      >
                        <option value="1 Outlet">1 Outlet (Single Kitchen)</option>
                        <option value="2-5 Outlets">2 – 5 Outlets</option>
                        <option value="6-20 Outlets">6 – 20 Outlets (Chain)</option>
                        <option value="20+ Enterprise">20+ Enterprise Outlets</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1.5 font-mono">
                      How Can We Help You?
                    </label>
                    <textarea
                      rows={3}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder={activeTab === 'sales' ? "Tell us about your restaurant concept, current ordering volume, or specific questions..." : "Describe the operational issue you are facing on your terminal, KDS, or printer..."}
                      className="w-full px-4 py-3 rounded-xl bg-[#1B1B1F] border border-[#2E2E33] text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#D97706] transition-colors resize-none"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#D97706] to-[#F59E0B] hover:opacity-90 text-black font-bold text-sm tracking-tight transition-all duration-200 cursor-pointer shadow-lg shadow-[#D97706]/20 active:scale-[0.99]"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 rounded-full border-2 border-black/30 border-t-black animate-spin" />
                          <span>Routing to On-Duty Engineer...</span>
                        </>
                      ) : (
                        <>
                          <Send size={15} />
                          <span>{activeTab === 'sales' ? 'Submit Request to Sales Team' : 'Dispatch to Support Engineering'}</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-2 text-[11px] text-zinc-400 font-mono">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck size={13} className="text-[#10B981]" />
                      100% Confidential · No Spam
                    </span>
                    <span>Average SLA: &lt; 15 mins</span>
                  </div>
                </form>
              )}

            </div>
          </div>

        </div>

      </div>
    </section>
  );
};

export default ContactSalesSupportSection;
