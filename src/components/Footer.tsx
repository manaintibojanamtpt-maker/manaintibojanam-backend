import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Heart, Instagram, Facebook, Mail, Phone, MapPin, MessageCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { useTenant } from '../context/TenantContext';

const Footer: React.FC = () => {
  const location = useLocation();
  const { tenantInfo } = useTenant();
  const needsExtraPadding = ['/', '/menu'].includes(location.pathname);

  return (
    <footer className={`bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-white/5 pt-16 md:pt-24 ${needsExtraPadding ? 'pb-[calc(6rem+env(safe-area-inset-bottom))]' : 'pb-[calc(4rem+env(safe-area-inset-bottom))]'} md:pb-16 transition-colors duration-500 relative overflow-hidden`}>
      <div className="w-full px-6 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-16 mb-16">
          {/* Brand Section */}
          <div className="col-span-2 md:col-span-1 flex flex-col items-center md:items-start text-center md:text-left">
            <Link to="/" className="inline-flex flex-col items-center md:items-start gap-2 mb-6 group cursor-pointer">
              <span className="text-3xl sm:text-4xl md:text-5xl font-display font-black text-gray-900 dark:text-white tracking-tight drop-shadow-xl">BhojanOS</span>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-red-400">Premium Telugu Home Kitchen</span>
            </Link>
            <p className="text-gray-500 dark:text-gray-400 leading-relaxed text-sm font-medium max-w-xs mb-8 hidden md:block">
              Bringing the authentic taste of home-cooked Telugu meals to your doorstep with love, heritage recipes, and fresh ingredients.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="w-10 h-10 bg-gray-50 dark:bg-white/5 rounded-xl flex items-center justify-center text-gray-400 hover:bg-red-600 hover:text-white transition-all shadow-sm group border border-gray-100 dark:border-white/5">
                <Instagram size={18} className="group-hover:scale-110 transition-transform" />
              </a>
              <a href="#" className="w-10 h-10 bg-gray-50 dark:bg-white/5 rounded-xl flex items-center justify-center text-gray-400 hover:bg-red-600 hover:text-white transition-all shadow-sm group border border-gray-100 dark:border-white/5">
                <Facebook size={18} className="group-hover:scale-110 transition-transform" />
              </a>
              <a href="#" className="w-10 h-10 bg-gray-50 dark:bg-white/5 rounded-xl flex items-center justify-center text-gray-400 hover:bg-green-600 hover:text-white transition-all shadow-sm group border border-gray-100 dark:border-white/5">
                <MessageCircle size={18} className="group-hover:scale-110 transition-transform" />
              </a>
            </div>
          </div>

          {/* Quick Links Grid */}
          <div className="grid grid-cols-2 gap-8">
            <div className="flex flex-col items-center md:items-start text-center md:text-left">
              <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-400 mb-8">Company</h4>
              <ul className="flex flex-col gap-4">
                <li><Link to="/menu" className="text-sm font-black text-gray-600 dark:text-gray-400 hover:text-red-600 transition-colors">Our Menu</Link></li>
                <li><a href="mailto:manaintibojanamtpt@gmail.com" className="text-sm font-black text-gray-600 dark:text-gray-400 hover:text-red-600 transition-colors">Contact</a></li>
                <li><a href="mailto:manaintibojanamtpt@gmail.com" className="text-sm font-black text-gray-600 dark:text-gray-400 hover:text-red-600 transition-colors">Support</a></li>
              </ul>
            </div>
            <div className="flex flex-col items-center md:items-start text-center md:text-left">
              <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-400 mb-8">Legal</h4>
              <ul className="flex flex-col gap-4">
                <li><Link to="/terms" className="text-sm font-black text-gray-600 dark:text-gray-400 hover:text-red-600 transition-colors">Terms</Link></li>
                <li><Link to="/privacy" className="text-sm font-black text-gray-600 dark:text-gray-400 hover:text-red-600 transition-colors">Privacy</Link></li>
                <li><Link to="/refund-policy" className="text-sm font-black text-gray-600 dark:text-gray-400 hover:text-red-600 transition-colors">Refunds</Link></li>
              </ul>
            </div>
          </div>

          {/* Contact Section */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-400 mb-8">Get in Touch</h4>
            <div className="flex flex-col gap-6">
              <a href={tenantInfo?.contactPhone ? `tel:+${tenantInfo.contactPhone.replace(/\D/g, '')}` : '#'} className="flex items-center gap-4 group">
                <div className="w-10 h-10 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center justify-center text-red-600 group-hover:scale-110 transition-transform shadow-sm">
                  <Phone size={18} />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Call Us</span>
                  <span className="text-sm font-black text-gray-900 dark:text-white">{tenantInfo?.contactPhone || '+91 76662 58454'}</span>
                </div>
              </a>
              <a href="mailto:manaintibojanamtpt@gmail.com" className="flex items-center gap-4 group">
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform shadow-sm">
                  <Mail size={18} />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Email Us</span>
                  <span className="text-sm font-black text-gray-900 dark:text-white break-all">manaintibojanamtpt@gmail.com</span>
                </div>
              </a>
              <div className="flex items-center gap-4 group">
                <div className="w-10 h-10 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-center text-green-600 group-hover:scale-110 transition-transform shadow-sm">
                  <MapPin size={18} />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Location</span>
                  <span className="text-sm font-black text-gray-900 dark:text-white">Pari Residency, Manjari Bk</span>
                  <span className="text-[10px] text-gray-500 font-medium">Pune, Maharashtra 412307</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center pt-12 border-t border-gray-100 dark:border-white/5 gap-6">
          <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">
            © {new Date().getFullYear()} BhojanOS. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <ShieldCheck size={14} className="text-green-600" />
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">FSSAI: 20125260000219</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">System Status: Normal</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
