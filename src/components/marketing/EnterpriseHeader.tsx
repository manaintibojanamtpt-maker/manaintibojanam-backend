import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import bhojanOsLogo from '../../assets/bhojan-os-logo.png';
import { ChevronDown, Menu, X } from 'lucide-react';
import { MarketingSoftCTA } from './MarketingSoftCTA';

const navLinkClass = (active: boolean) =>
  `transition-colors ${active ? 'text-white font-semibold' : 'hover:text-white text-neutral-400'}`;

export const EnterpriseHeader: React.FC = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileMenuOpen]);

  const isPlatform = location.pathname.startsWith('/platform');
  const isPricing = location.pathname === '/pricing' || (location.pathname === '/onboard' && location.hash === '#pricing');
  const isAbout = location.pathname === '/about';
  const isSecurity = location.pathname === '/security';
  const isContact = location.pathname === '/contact';

  return (
    <header className="fixed top-0 z-[100] w-full border-b border-white/[0.06] bg-[#030303] backdrop-blur-md pt-[env(safe-area-inset-top)]">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12 h-16 sm:h-[4.5rem] flex items-center justify-between w-full overflow-visible">
        <Link to="/" className="flex items-center gap-3 cursor-pointer min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-[#0A0A0A] rounded-lg flex items-center justify-center border border-white/10 overflow-hidden shrink-0">
            <img
              src={bhojanOsLogo}
              alt="BhojanOS Logo"
              className="w-full h-full object-cover"
              width={40}
              height={40}
              fetchPriority="high"
              decoding="async"
            />
          </div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight leading-snug text-white truncate">
            Bhojan<span className="text-[#FF6B00]">OS</span>
          </h1>
        </Link>

        <nav className="marketing-header-nav hidden lg:flex items-center gap-8 text-sm font-medium h-full">
          <div className="group relative flex items-center h-full">
            <button type="button" className={`inline-flex items-center gap-1 h-10 ${navLinkClass(isPlatform)}`}>
              Platform <ChevronDown size={14} className="shrink-0" />
            </button>
            <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 hidden group-hover:block group-focus-within:block">
              <div className="w-48 bg-[#0A0A0A] border border-white/10 rounded-lg p-1.5 shadow-lg">
                <Link to="/platform" className="block px-3 py-2 hover:bg-white/5 rounded-md text-white text-sm">Overview</Link>
                <Link to="/platform#os" className="block px-3 py-2 hover:bg-white/5 rounded-md text-white text-sm">Restaurant OS</Link>
              </div>
            </div>
          </div>

          <Link to="/pricing" className={`inline-flex items-center h-10 ${navLinkClass(isPricing)}`}>Pricing</Link>

          <div className="group relative flex items-center h-full">
            <button type="button" className={`inline-flex items-center gap-1 h-10 ${navLinkClass(isAbout || isSecurity || isContact)}`}>
              Company <ChevronDown size={14} className="shrink-0" />
            </button>
            <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 hidden group-hover:block group-focus-within:block">
              <div className="w-48 bg-[#0A0A0A] border border-white/10 rounded-lg p-1.5 shadow-lg">
                <Link to="/about" className={`block px-3 py-2 hover:bg-white/5 rounded-md text-sm ${isAbout ? 'text-[#FF6B00] font-semibold' : 'text-white'}`}>About Us</Link>
                <Link to="/about#leadership" className="block px-3 py-2 hover:bg-white/5 rounded-md text-sm text-white">Leadership</Link>
                <Link to="/security" className={`block px-3 py-2 hover:bg-white/5 rounded-md text-sm ${isSecurity ? 'text-[#FF6B00] font-semibold' : 'text-white'}`}>Security</Link>
                <Link to="/contact" className={`block px-3 py-2 hover:bg-white/5 rounded-md text-sm ${isContact ? 'text-[#FF6B00] font-semibold' : 'text-white'}`}>Contact</Link>
              </div>
            </div>
          </div>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3 lg:hidden shrink-0">
          <MarketingSoftCTA
            to="/owner/login"
            tone="ghost"
            size="compact"
            className="shrink-0"
          >
            Sign In
          </MarketingSoftCTA>
          <button
            type="button"
            className="text-white p-2 -mr-2 min-h-0 min-w-0 touch-manipulation"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-expanded={mobileMenuOpen}
            aria-controls="marketing-mobile-menu"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-3">
          <MarketingSoftCTA to="/owner/login" tone="ghost" size="compact">
            Sign In
          </MarketingSoftCTA>
          <MarketingSoftCTA to="/owner/register" size="compact">
            Start free storefront
          </MarketingSoftCTA>
        </div>
      </div>

      {mobileMenuOpen ? (
      <div
        id="marketing-mobile-menu"
        className="marketing-mobile-menu open lg:hidden border-t border-white/[0.06] bg-[#030303]"
      >
        <div className="px-4 sm:px-6 py-5 flex flex-col gap-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <Link to="/platform" onClick={() => setMobileMenuOpen(false)} className={`text-base font-semibold py-1 ${isPlatform ? 'text-[#FF6B00]' : 'text-white'}`}>Platform</Link>
          <Link to="/pricing" onClick={() => setMobileMenuOpen(false)} className={`text-base font-semibold py-1 ${isPricing ? 'text-[#FF6B00]' : 'text-white'}`}>Pricing</Link>
          <Link to="/about" onClick={() => setMobileMenuOpen(false)} className={`text-base font-semibold py-1 ${isAbout ? 'text-[#FF6B00]' : 'text-white'}`}>About Us</Link>
          <Link to="/about#leadership" onClick={() => setMobileMenuOpen(false)} className="text-base font-semibold py-1 text-white">Leadership</Link>
          <Link to="/security" onClick={() => setMobileMenuOpen(false)} className={`text-base font-semibold py-1 ${isSecurity ? 'text-[#FF6B00]' : 'text-white'}`}>Security</Link>
          <Link to="/contact" onClick={() => setMobileMenuOpen(false)} className={`text-base font-semibold py-1 ${isContact ? 'text-[#FF6B00]' : 'text-white'}`}>Contact</Link>
          <div className="pt-3 mt-1 border-t border-white/[0.06] flex flex-col gap-3">
            <MarketingSoftCTA
              to="/owner/login"
              tone="ghost"
              size="compact"
              className="marketing-soft-cta--block w-full"
              onClick={() => setMobileMenuOpen(false)}
            >
              Sign In
            </MarketingSoftCTA>
            <MarketingSoftCTA
              to="/owner/register"
              size="compact"
              className="marketing-soft-cta--block w-full"
              onClick={() => setMobileMenuOpen(false)}
            >
              Start free storefront
            </MarketingSoftCTA>
          </div>
        </div>
      </div>
      ) : null}
    </header>
  );
};
