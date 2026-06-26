import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import bhojanOsLogo from '../../assets/bhojan-os-logo.png';
import { ChevronDown, Menu, X } from 'lucide-react';
import { AnimatePresence, m } from 'framer-motion';

export const EnterpriseHeader: React.FC = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 z-[100] w-full border-b border-white/[0.06] bg-[#030303]/95 pt-[env(safe-area-inset-top)]">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12 h-16 sm:h-[4.5rem] flex items-center justify-between w-full">
        <Link to="/onboard" className="flex items-center gap-3 cursor-pointer min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-[#0A0A0A] rounded-lg flex items-center justify-center border border-white/10 overflow-hidden shrink-0">
            <img src={bhojanOsLogo} alt="BhojanOS Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight leading-none text-white truncate">
            Bhojan<span className="text-[#FF6B00]">OS</span>
          </h1>
        </Link>

        <div className="hidden lg:flex items-center gap-8 text-sm font-medium text-neutral-400">
          <div className="group relative py-4">
            <button className="flex items-center gap-1 hover:text-white transition-colors">
              Platform <ChevronDown size={14} />
            </button>
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-48 bg-[#0A0A0A] border border-white/10 rounded-lg p-1.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all shadow-lg">
              <Link to="/platform" className="block px-3 py-2 hover:bg-white/5 rounded-md text-white text-sm">Overview</Link>
              <Link to="/platform#os" className="block px-3 py-2 hover:bg-white/5 rounded-md text-white text-sm">Restaurant OS</Link>
            </div>
          </div>

          <Link to="/onboard#pricing" className="hover:text-white transition-colors">Pricing</Link>

          <div className="group relative py-4">
            <button className="flex items-center gap-1 hover:text-white transition-colors">
              Company <ChevronDown size={14} />
            </button>
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-48 bg-[#0A0A0A] border border-white/10 rounded-lg p-1.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all shadow-lg">
              <Link to="/about" className="block px-3 py-2 hover:bg-white/5 rounded-md text-white text-sm">About Us</Link>
              <Link to="/security" className="block px-3 py-2 hover:bg-white/5 rounded-md text-white text-sm">Security</Link>
              <Link to="/contact" className="block px-3 py-2 hover:bg-white/5 rounded-md text-white text-sm">Contact</Link>
            </div>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-4">
          <button
            onClick={() => navigate('/owner/login')}
            className="text-sm font-medium text-neutral-400 hover:text-white transition-colors px-2 py-1"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/owner/register')}
            className="bg-[#FF6B00] hover:bg-[#E56D00] text-white font-semibold text-sm px-5 py-2.5 rounded-lg border border-[#FF6B00] transition-colors"
          >
            Start free storefront
          </button>
        </div>

        <button
          className="lg:hidden text-white p-2 -mr-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <m.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden overflow-hidden border-t border-white/[0.06] bg-[#030303]"
          >
            <div className="px-4 sm:px-6 py-5 flex flex-col gap-4">
              <Link to="/platform" onClick={() => setMobileMenuOpen(false)} className="text-base font-semibold text-white py-1">Platform</Link>
              <Link to="/onboard#pricing" onClick={() => setMobileMenuOpen(false)} className="text-base font-semibold text-white py-1">Pricing</Link>
              <Link to="/about" onClick={() => setMobileMenuOpen(false)} className="text-base font-semibold text-white py-1">About Us</Link>
              <Link to="/security" onClick={() => setMobileMenuOpen(false)} className="text-base font-semibold text-white py-1">Security</Link>
              <Link to="/contact" onClick={() => setMobileMenuOpen(false)} className="text-base font-semibold text-white py-1">Contact</Link>
              <div className="pt-3 mt-1 border-t border-white/[0.06] flex flex-col gap-3">
                <button
                  onClick={() => { setMobileMenuOpen(false); navigate('/owner/login'); }}
                  className="text-left text-base font-medium text-neutral-400 py-1"
                >
                  Sign In
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); navigate('/owner/register'); }}
                  className="bg-[#FF6B00] hover:bg-[#E56D00] text-white font-semibold py-3.5 rounded-lg text-center transition-colors"
                >
                  Start free storefront
                </button>
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </header>
  );
};
