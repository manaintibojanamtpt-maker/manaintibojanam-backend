import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import bhojanOsLogo from '../../assets/bhojan-os-logo.png';
import { ChevronDown, Menu, X, ShoppingBag } from 'lucide-react';
import { MarketingSoftCTA } from './MarketingSoftCTA';
import { orderBhojanPublic } from '../../config/demoData';

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

  const isPlatform = location.pathname.startsWith('/platform') || 
    location.pathname.startsWith('/restaurant-') || 
    location.pathname === '/direct-ordering-platform' || 
    location.pathname === '/qr-ordering' || 
    location.pathname === '/whatsapp-ordering' || 
    location.pathname === '/digital-menu';
  const isSolutions = location.pathname.startsWith('/solutions');
  const isCompare = location.pathname.startsWith('/compare');
  const isPricing = location.pathname === '/pricing' || (location.pathname === '/onboard' && location.hash === '#pricing');
  const isAbout = location.pathname === '/about';
  const isSecurity = location.pathname === '/security';
  const isContact = location.pathname === '/contact';
  const isBlog = location.pathname.startsWith('/blog');

  return (
    <header className="fixed top-0 z-[100] w-full border-b border-white/[0.06] bg-[#070504]/90 backdrop-blur-xl pt-[env(safe-area-inset-top)]">
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
          <span className="text-lg sm:text-xl font-bold tracking-tight leading-snug text-white truncate">
            Bhojan<span className="text-[#FF7A00]">OS</span>
          </span>
        </Link>

        <nav className="marketing-header-nav hidden lg:flex items-center gap-7 text-sm font-medium h-full">
          {/* Features / Platform */}
          <div className="group relative flex items-center h-full">
            <button type="button" className={`inline-flex items-center gap-1 h-10 ${navLinkClass(isPlatform)}`}>
              Product <ChevronDown size={14} className="shrink-0" />
            </button>
            <div className="absolute top-full left-0 pt-2 hidden group-hover:block group-focus-within:block">
              <div className="w-64 bg-[#0A0A0A] border border-white/10 rounded-xl p-2 shadow-2xl backdrop-blur-xl">
                <Link to="/restaurant-online-ordering" className="block px-3 py-2 hover:bg-white/5 rounded-lg text-white text-xs font-medium">Online Ordering System</Link>
                <Link to="/direct-ordering-platform" className="block px-3 py-2 hover:bg-white/5 rounded-lg text-white text-xs font-medium">Direct Ordering Platform</Link>
                <Link to="/restaurant-management-system" className="block px-3 py-2 hover:bg-white/5 rounded-lg text-white text-xs font-medium">Restaurant Management</Link>
                <Link to="/restaurant-pos" className="block px-3 py-2 hover:bg-white/5 rounded-lg text-white text-xs font-medium">Restaurant POS &amp; Ops</Link>
                <Link to="/restaurant-billing-software" className="block px-3 py-2 hover:bg-white/5 rounded-lg text-white text-xs font-medium">Fast Billing Software</Link>
                <Link to="/qr-code-ordering-system" className="block px-3 py-2 hover:bg-white/5 rounded-lg text-white text-xs font-medium">QR Code Ordering</Link>
                <Link to="/whatsapp-food-ordering-system" className="block px-3 py-2 hover:bg-white/5 rounded-lg text-white text-xs font-medium">WhatsApp Ordering</Link>
                <Link to="/restaurant-website-builder" className="block px-3 py-2 hover:bg-white/5 rounded-lg text-white text-xs font-medium">Restaurant Website Builder</Link>
                <Link to="/digital-menu-for-restaurants" className="block px-3 py-2 hover:bg-white/5 rounded-lg text-white text-xs font-medium">Digital Menu</Link>
                <Link to="/delivery-management-software" className="block px-3 py-2 hover:bg-white/5 rounded-lg text-white text-xs font-medium">Delivery Management</Link>
                <div className="my-1 border-t border-white/5" />
                <Link to="/features" className="block px-3 py-2 hover:bg-white/5 rounded-lg text-[#FF7A00] text-xs font-semibold">All Platform Features →</Link>
              </div>
            </div>
          </div>

          {/* Solutions */}
          <div className="group relative flex items-center h-full">
            <button type="button" className={`inline-flex items-center gap-1 h-10 ${navLinkClass(isSolutions)}`}>
              Solutions <ChevronDown size={14} className="shrink-0" />
            </button>
            <div className="absolute top-full left-0 pt-2 hidden group-hover:block group-focus-within:block">
              <div className="w-56 bg-[#0A0A0A] border border-white/10 rounded-xl p-2 shadow-2xl backdrop-blur-xl">
                <Link to="/cloud-kitchen-software" className="block px-3 py-2 hover:bg-white/5 rounded-lg text-white text-xs font-medium">Cloud Kitchens</Link>
                <Link to="/qsr-pos-software" className="block px-3 py-2 hover:bg-white/5 rounded-lg text-white text-xs font-medium">Quick Service (QSR)</Link>
                <Link to="/cafe-pos-billing-software" className="block px-3 py-2 hover:bg-white/5 rounded-lg text-white text-xs font-medium">Cafes &amp; Bakeries</Link>
                <Link to="/solutions" className="block px-3 py-2 hover:bg-white/5 rounded-lg text-white text-xs font-medium">All Solutions</Link>
              </div>
            </div>
          </div>

          {/* Compare */}
          <div className="group relative flex items-center h-full">
            <button type="button" className={`inline-flex items-center gap-1 h-10 ${navLinkClass(isCompare)}`}>
              Compare <ChevronDown size={14} className="shrink-0" />
            </button>
            <div className="absolute top-full left-0 pt-2 hidden group-hover:block group-focus-within:block">
              <div className="w-56 bg-[#0A0A0A] border border-white/10 rounded-xl p-2 shadow-2xl backdrop-blur-xl">
                <Link to="/bhojanos-vs-zomato-swiggy" className="block px-3 py-2 hover:bg-white/5 rounded-lg text-white text-xs font-medium">vs Zomato &amp; Swiggy</Link>
                <Link to="/petpooja-alternative" className="block px-3 py-2 hover:bg-white/5 rounded-lg text-white text-xs font-medium">Petpooja Alternative</Link>
                <Link to="/dotpe-alternative" className="block px-3 py-2 hover:bg-white/5 rounded-lg text-white text-xs font-medium">DotPe Alternative</Link>
              </div>
            </div>
          </div>

          <Link to="/pricing" className={`inline-flex items-center h-10 ${navLinkClass(isPricing)}`}>Pricing</Link>
          <Link to="/blog" className={`inline-flex items-center h-10 ${navLinkClass(isBlog)}`}>Resources</Link>

          {/* Company */}
          <div className="group relative flex items-center h-full">
            <button type="button" className={`inline-flex items-center gap-1 h-10 ${navLinkClass(isAbout || isSecurity || isContact)}`}>
              Company <ChevronDown size={14} className="shrink-0" />
            </button>
            <div className="absolute top-full right-0 pt-2 hidden group-hover:block group-focus-within:block">
              <div className="w-48 bg-[#0A0A0A] border border-white/10 rounded-xl p-2 shadow-2xl">
                <Link to="/about" className={`block px-3 py-2 hover:bg-white/5 rounded-lg text-xs ${isAbout ? 'text-[#FF6B00] font-semibold' : 'text-white'}`}>About Us</Link>
                <Link to="/about#leadership" className="block px-3 py-2 hover:bg-white/5 rounded-lg text-xs text-white">Leadership</Link>
                <Link to="/security" className={`block px-3 py-2 hover:bg-white/5 rounded-lg text-xs ${isSecurity ? 'text-[#FF6B00] font-semibold' : 'text-white'}`}>Security</Link>
                <Link to="/contact" className={`block px-3 py-2 hover:bg-white/5 rounded-lg text-xs ${isContact ? 'text-[#FF6B00] font-semibold' : 'text-white'}`}>Contact</Link>
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
          <a
            href={orderBhojanPublic.homeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl border border-[#FF7A00]/40 bg-[#FF7A00]/10 text-[#FF7A00] text-sm font-bold hover:bg-[#FF7A00]/15 transition-colors"
          >
            <ShoppingBag size={15} aria-hidden />
            Order Food
          </a>
          <MarketingSoftCTA to="/owner/login" tone="ghost" size="compact">
            Sign In
          </MarketingSoftCTA>
          <MarketingSoftCTA to="/owner/register" size="compact">
            Get Started
          </MarketingSoftCTA>
        </div>
      </div>

      {mobileMenuOpen ? (
      <div
        id="marketing-mobile-menu"
        className="marketing-mobile-menu open lg:hidden border-t border-white/[0.06] bg-[#030303] max-h-[80vh] overflow-y-auto"
      >
        <div className="px-4 sm:px-6 py-5 flex flex-col gap-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 pt-1">Products</div>
          <Link to="/restaurant-online-ordering" onClick={() => setMobileMenuOpen(false)} className="text-sm py-1 text-white">Online Ordering System</Link>
          <Link to="/direct-ordering-platform" onClick={() => setMobileMenuOpen(false)} className="text-sm py-1 text-white">Direct Ordering Platform</Link>
          <Link to="/restaurant-management-system" onClick={() => setMobileMenuOpen(false)} className="text-sm py-1 text-white">Restaurant Management</Link>
          <Link to="/restaurant-pos" onClick={() => setMobileMenuOpen(false)} className="text-sm py-1 text-white">Restaurant POS</Link>
          <Link to="/restaurant-billing-software" onClick={() => setMobileMenuOpen(false)} className="text-sm py-1 text-white">Fast Billing Software</Link>
          <Link to="/qr-code-ordering-system" onClick={() => setMobileMenuOpen(false)} className="text-sm py-1 text-white">QR Code Ordering</Link>
          <Link to="/whatsapp-food-ordering-system" onClick={() => setMobileMenuOpen(false)} className="text-sm py-1 text-white">WhatsApp Ordering</Link>
          <Link to="/restaurant-website-builder" onClick={() => setMobileMenuOpen(false)} className="text-sm py-1 text-white">Website Builder</Link>
          <Link to="/digital-menu-for-restaurants" onClick={() => setMobileMenuOpen(false)} className="text-sm py-1 text-white">Digital Menu</Link>
          <Link to="/delivery-management-software" onClick={() => setMobileMenuOpen(false)} className="text-sm py-1 text-white">Delivery Management</Link>
          
          <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 pt-2 border-t border-white/[0.06]">Solutions</div>
          <Link to="/cloud-kitchen-software" onClick={() => setMobileMenuOpen(false)} className="text-sm py-1 text-white">Cloud Kitchens</Link>
          <Link to="/qsr-pos-software" onClick={() => setMobileMenuOpen(false)} className="text-sm py-1 text-white">Quick Service (QSR)</Link>
          <Link to="/cafe-pos-billing-software" onClick={() => setMobileMenuOpen(false)} className="text-sm py-1 text-white">Cafes &amp; Bakeries</Link>
          <Link to="/solutions" onClick={() => setMobileMenuOpen(false)} className="text-sm py-1 text-white">All Solutions</Link>

          <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 pt-2 border-t border-white/[0.06]">Compare</div>
          <Link to="/bhojanos-vs-zomato-swiggy" onClick={() => setMobileMenuOpen(false)} className="text-sm py-1 text-white">vs Zomato &amp; Swiggy</Link>
          <Link to="/petpooja-alternative" onClick={() => setMobileMenuOpen(false)} className="text-sm py-1 text-white">Petpooja Alternative</Link>
          <Link to="/dotpe-alternative" onClick={() => setMobileMenuOpen(false)} className="text-sm py-1 text-white">DotPe Alternative</Link>

          <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 pt-2 border-t border-white/[0.06]">Company &amp; Pricing</div>
          <Link to="/pricing" onClick={() => setMobileMenuOpen(false)} className="text-sm py-1 text-white">Pricing</Link>
          <Link to="/blog" onClick={() => setMobileMenuOpen(false)} className="text-sm py-1 text-white">Resources &amp; Guides</Link>
          <Link to="/about" onClick={() => setMobileMenuOpen(false)} className="text-sm py-1 text-white">About Us</Link>
          <Link to="/security" onClick={() => setMobileMenuOpen(false)} className="text-sm py-1 text-white">Security</Link>
          <Link to="/contact" onClick={() => setMobileMenuOpen(false)} className="text-sm py-1 text-white">Contact</Link>

          <div className="pt-3 mt-1 border-t border-white/[0.06] flex flex-col gap-3">
            <a
              href={orderBhojanPublic.homeUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileMenuOpen(false)}
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl border border-[#FF7A00]/40 bg-[#FF7A00]/10 text-[#FF7A00] text-sm font-bold"
            >
              <ShoppingBag size={15} aria-hidden />
              Order Food
            </a>
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
              Get Started
            </MarketingSoftCTA>
          </div>
        </div>
      </div>
      ) : null}
    </header>
  );
};
