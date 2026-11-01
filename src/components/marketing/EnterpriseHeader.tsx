import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, Menu, X, ShoppingBag, ExternalLink, Sparkles, Calculator, Monitor, Scale } from 'lucide-react';
import { motion } from 'framer-motion';
import { orderBhojanPublic } from '../../config/demoData';
import BhojanOSLogo from '../BhojanOSLogo';
import { Button } from '../ui/button';
import { scrollToMarketingSection } from '../../hooks/useMarketingHashScroll';
import { triggerHaptic } from '../../utils/haptics';

export const EnterpriseHeader: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<'product' | 'solutions' | 'compare' | 'company' | null>(null);
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const [mobileAccordions, setMobileAccordions] = useState<{ [key: string]: boolean }>({
    product: false,
    solutions: false,
    compare: false,
    tools: true,
  });

  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = (name: 'product' | 'solutions' | 'compare' | 'company') => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setActiveDropdown(name);
    setHoveredTab(name);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
      setHoveredTab(null);
    }, 220);
  };

  const toggleDropdown = (name: 'product' | 'solutions' | 'compare' | 'company') => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    triggerHaptic('selection');
    setActiveDropdown((prev) => (prev === name ? null : name));
  };

  const toggleMobileAccordion = (name: string) => {
    triggerHaptic('selection');
    setMobileAccordions((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  const handleSectionJump = (sectionId: string) => {
    setMobileMenuOpen(false);
    setActiveDropdown(null);
    triggerHaptic('selection');
    const existingElement = document.getElementById(sectionId);
    if (existingElement) {
      scrollToMarketingSection(sectionId);
      window.history.replaceState(null, '', `${location.pathname}#${sectionId}`);
    } else {
      navigate(`/onboard#${sectionId}`);
    }
  };

  useEffect(() => {
    setMobileMenuOpen(false);
    setActiveDropdown(null);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileMenuOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.marketing-header-nav')) {
        setActiveDropdown(null);
      }
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  const isPlatform =
    location.pathname.startsWith('/platform') ||
    location.pathname.startsWith('/restaurant-') ||
    location.pathname === '/direct-ordering-platform' ||
    location.pathname === '/qr-ordering' ||
    location.pathname === '/whatsapp-ordering' ||
    location.pathname === '/digital-menu';
  const isSolutions = location.pathname.startsWith('/solutions') ||
    location.pathname === '/cloud-kitchen-software' ||
    location.pathname === '/qsr-pos-software' ||
    location.pathname === '/cafe-pos-billing-software';
  const isCompare = location.pathname.startsWith('/compare');
  const isComparisonSection = (location.pathname === '/' || location.pathname === '/onboard') && location.hash === '#comparison';
  const isKdsSection = (location.pathname === '/' || location.pathname === '/onboard') && location.hash === '#kds';
  const isCalculatorSection = (location.pathname === '/' || location.pathname === '/onboard') && location.hash === '#calculator';
  const isPricing = location.pathname === '/pricing' || ((location.pathname === '/' || location.pathname === '/onboard') && location.hash === '#pricing');
  const isAbout = location.pathname === '/about';
  const isSecurity = location.pathname === '/security';
  const isContact = location.pathname === '/contact';
  const isBlog = location.pathname.startsWith('/blog');
  const isCompany = isAbout || isSecurity || isContact;

  const currentActiveTab =
    isPlatform ? 'product' :
    isSolutions ? 'solutions' :
    isCompare ? 'compare' :
    isComparisonSection ? 'comparison' :
    isKdsSection ? 'kds' :
    isCalculatorSection ? 'calculator' :
    isPricing ? 'pricing' :
    isBlog ? 'resources' :
    isCompany ? 'company' : null;

  const activeTabKey = hoveredTab || currentActiveTab;

  const navTabClass = (isActive: boolean, isDropdownOpen = false) =>
    `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium tracking-tight whitespace-nowrap transition-all duration-200 cursor-pointer ${
      isActive || isDropdownOpen
        ? 'text-[#FAFAFA] bg-white/[0.08] border border-[#D97706]/40 shadow-xs'
        : 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-white/[0.04]'
    }`;

  return (
    <header className="fixed top-0 z-[100] w-full border-b border-[#27272A] bg-[#09090B]/95 backdrop-blur-xl text-white pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-[4.25rem] flex items-center justify-between w-full overflow-visible">
        
        {/* Sleek Animated Brand Emblem & Logo */}
        <Link to="/" className="flex items-center gap-2.5 sm:gap-3 cursor-pointer min-w-0 group shrink-0" aria-label="BhojanOS Home">
          <BhojanOSLogo size={34} className="shrink-0 transition-transform duration-300 group-hover:scale-105" />
          <div className="flex items-center tracking-tight leading-none">
            <span className="text-xl font-black text-[#FAFAFA] font-sans">
              Bhojan
            </span>
            <span className="text-xl font-black bg-gradient-to-r from-[#D97706] to-[#F59E0B] bg-clip-text text-transparent group-hover:from-[#F59E0B] group-hover:to-[#D97706] transition-all duration-300">
              OS
            </span>
            <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-[#D97706] inline-block animate-pulse" />
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="marketing-header-nav hidden lg:flex items-center ml-3 xl:ml-6 gap-1 xl:gap-2 text-xs font-medium h-full">
          {/* Features / Platform dropdown */}
          <div
            className="group relative flex items-center h-full"
            onMouseEnter={() => handleMouseEnter('product')}
            onMouseLeave={handleMouseLeave}
          >
            <button
              type="button"
              onClick={() => toggleDropdown('product')}
              className={`relative z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium tracking-tight whitespace-nowrap transition-colors duration-150 cursor-pointer ${
                activeTabKey === 'product' || activeDropdown === 'product' ? 'text-[#FAFAFA]' : 'text-[#A1A1AA] hover:text-[#FAFAFA]'
              }`}
              aria-expanded={activeDropdown === 'product'}
            >
              {(activeTabKey === 'product' || activeDropdown === 'product') && (
                <motion.span
                  layoutId="enterpriseNavTabPill"
                  className="absolute inset-0 rounded-full bg-white/[0.08] border border-[#D97706]/40 shadow-xs pointer-events-none -z-10"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              )}
              <span>Product</span>
              <ChevronDown
                size={13}
                className={`transition-transform duration-200 group-hover:rotate-180 group-hover:text-[#D97706] ${
                  activeDropdown === 'product' ? 'rotate-180 text-[#D97706]' : 'text-[#A1A1AA]'
                }`}
              />
            </button>
            <div
              className={`absolute top-full left-0 pt-2 transition-all duration-200 z-50 before:absolute before:inset-x-0 before:-top-3 before:h-3 group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto group-hover:visible ${
                activeDropdown === 'product'
                  ? 'opacity-100 translate-y-0 pointer-events-auto visible'
                  : 'opacity-0 -translate-y-1 pointer-events-none invisible'
              }`}
            >
              <div className="w-72 bg-[#141417] border border-[#27272A] rounded-xl p-2 shadow-2xl shadow-black/80 backdrop-blur-2xl ring-1 ring-white/5">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#D97706] font-mono flex items-center justify-between">
                  <span>Core Platform Modules</span>
                  <Sparkles size={11} />
                </div>
                <div className="space-y-0.5">
                  <Link
                    to="/restaurant-online-ordering"
                    onClick={() => setActiveDropdown(null)}
                    className="block px-3 py-2 hover:bg-white/[0.08] rounded-lg text-xs text-zinc-300 hover:text-white transition-colors"
                  >
                    <div className="font-semibold text-white">Online Ordering System</div>
                    <div className="text-[11px] text-zinc-400">Direct branded order portal with 0% commission</div>
                  </Link>
                  <Link
                    to="/direct-ordering-platform"
                    onClick={() => setActiveDropdown(null)}
                    className="block px-3 py-2 hover:bg-white/[0.08] rounded-lg text-xs text-zinc-300 hover:text-white transition-colors"
                  >
                    <div className="font-semibold text-white">Direct Ordering Platform</div>
                    <div className="text-[11px] text-zinc-400">Own customer data &amp; remarketing</div>
                  </Link>
                  <Link
                    to="/restaurant-management-system"
                    onClick={() => setActiveDropdown(null)}
                    className="block px-3 py-2 hover:bg-white/[0.08] rounded-lg text-xs text-zinc-300 hover:text-white transition-colors"
                  >
                    <div className="font-semibold text-white">Restaurant Management</div>
                    <div className="text-[11px] text-zinc-400">Inventory, recipes, kitchen &amp; dispatch</div>
                  </Link>
                  <Link
                    to="/restaurant-pos"
                    onClick={() => setActiveDropdown(null)}
                    className="block px-3 py-2 hover:bg-white/[0.08] rounded-lg text-xs text-zinc-300 hover:text-white transition-colors"
                  >
                    <div className="font-semibold text-white">Restaurant POS System</div>
                    <div className="text-[11px] text-zinc-400">Fast offline-first multi-terminal billing</div>
                  </Link>
                  <Link
                    to="/restaurant-billing-software"
                    onClick={() => setActiveDropdown(null)}
                    className="block px-3 py-2 hover:bg-white/[0.08] rounded-lg text-xs text-zinc-300 hover:text-white transition-colors"
                  >
                    <div className="font-semibold text-white">Fast Billing Software</div>
                    <div className="text-[11px] text-zinc-400">GST, discounts &amp; thermal receipt printing</div>
                  </Link>
                  <Link
                    to="/qr-code-ordering-system"
                    onClick={() => setActiveDropdown(null)}
                    className="block px-3 py-2 hover:bg-white/[0.08] rounded-lg text-xs text-zinc-300 hover:text-white transition-colors"
                  >
                    <div className="font-semibold text-white">QR Code Ordering</div>
                    <div className="text-[11px] text-zinc-400">Contactless dine-in ordering &amp; UPI pay</div>
                  </Link>
                  <Link
                    to="/whatsapp-food-ordering-system"
                    onClick={() => setActiveDropdown(null)}
                    className="block px-3 py-2 hover:bg-white/[0.08] rounded-lg text-xs text-zinc-300 hover:text-white transition-colors"
                  >
                    <div className="font-semibold text-white">WhatsApp Food Ordering</div>
                    <div className="text-[11px] text-zinc-400">Automated WhatsApp bot menu &amp; checkout</div>
                  </Link>
                  <Link
                    to="/delivery-management-software"
                    onClick={() => setActiveDropdown(null)}
                    className="block px-3 py-2 hover:bg-white/[0.08] rounded-lg text-xs text-zinc-300 hover:text-white transition-colors"
                  >
                    <div className="font-semibold text-white">Delivery Management</div>
                    <div className="text-[11px] text-zinc-400">Shadowfax &amp; Dunzo automated rider fleet</div>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Solutions dropdown */}
          <div
            className="group relative flex items-center h-full"
            onMouseEnter={() => handleMouseEnter('solutions')}
            onMouseLeave={handleMouseLeave}
          >
            <button
              type="button"
              onClick={() => toggleDropdown('solutions')}
              className={`relative z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium tracking-tight whitespace-nowrap transition-colors duration-150 cursor-pointer ${
                activeTabKey === 'solutions' || activeDropdown === 'solutions' ? 'text-[#FAFAFA]' : 'text-[#A1A1AA] hover:text-[#FAFAFA]'
              }`}
              aria-expanded={activeDropdown === 'solutions'}
            >
              {(activeTabKey === 'solutions' || activeDropdown === 'solutions') && (
                <motion.span
                  layoutId="enterpriseNavTabPill"
                  className="absolute inset-0 rounded-full bg-white/[0.08] border border-[#D97706]/40 shadow-xs pointer-events-none -z-10"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              )}
              <span>Solutions</span>
              <ChevronDown
                size={13}
                className={`transition-transform duration-200 group-hover:rotate-180 group-hover:text-[#D97706] ${
                  activeDropdown === 'solutions' ? 'rotate-180 text-[#D97706]' : 'text-[#A1A1AA]'
                }`}
              />
            </button>
            <div
              className={`absolute top-full left-0 pt-2 transition-all duration-200 z-50 before:absolute before:inset-x-0 before:-top-3 before:h-3 group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto group-hover:visible ${
                activeDropdown === 'solutions'
                  ? 'opacity-100 translate-y-0 pointer-events-auto visible'
                  : 'opacity-0 -translate-y-1 pointer-events-none invisible'
              }`}
            >
              <div className="w-64 bg-[#141417] border border-[#27272A] rounded-xl p-2 shadow-2xl shadow-black/80 backdrop-blur-2xl ring-1 ring-white/5">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#D97706] font-mono">
                  Kitchen Types
                </div>
                <div className="space-y-0.5">
                  <Link
                    to="/cloud-kitchen-software"
                    onClick={() => setActiveDropdown(null)}
                    className="block px-3 py-2 hover:bg-white/[0.08] rounded-lg text-xs text-zinc-300 hover:text-white transition-colors"
                  >
                    <div className="font-semibold text-white">Cloud Kitchens</div>
                    <div className="text-[11px] text-zinc-400">Multi-brand routing on single screen</div>
                  </Link>
                  <Link
                    to="/qsr-pos-software"
                    onClick={() => setActiveDropdown(null)}
                    className="block px-3 py-2 hover:bg-white/[0.08] rounded-lg text-xs text-zinc-300 hover:text-white transition-colors"
                  >
                    <div className="font-semibold text-white">Quick Service (QSR)</div>
                    <div className="text-[11px] text-zinc-400">High speed counter checkout &amp; tokens</div>
                  </Link>
                  <Link
                    to="/cafe-pos-billing-software"
                    onClick={() => setActiveDropdown(null)}
                    className="block px-3 py-2 hover:bg-white/[0.08] rounded-lg text-xs text-zinc-300 hover:text-white transition-colors"
                  >
                    <div className="font-semibold text-white">Cafes &amp; Bakeries</div>
                    <div className="text-[11px] text-zinc-400">Custom modifiers &amp; recipe tracking</div>
                  </Link>
                  <div className="border-t border-[#27272A] my-1 pt-1">
                    <Link
                      to="/solutions"
                      onClick={() => setActiveDropdown(null)}
                      className="block px-3 py-1.5 hover:bg-white/[0.08] rounded-lg text-xs font-semibold text-[#D97706] hover:text-[#F59E0B] transition-colors"
                    >
                      View All Solutions →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Direct comparison dropdown */}
          <div
            className="group relative flex items-center h-full"
            onMouseEnter={() => handleMouseEnter('compare')}
            onMouseLeave={handleMouseLeave}
          >
            <button
              type="button"
              onClick={() => toggleDropdown('compare')}
              className={`relative z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium tracking-tight whitespace-nowrap transition-colors duration-150 cursor-pointer ${
                activeTabKey === 'compare' || activeDropdown === 'compare' ? 'text-[#FAFAFA]' : 'text-[#A1A1AA] hover:text-[#FAFAFA]'
              }`}
              aria-expanded={activeDropdown === 'compare'}
            >
              {(activeTabKey === 'compare' || activeDropdown === 'compare') && (
                <motion.span
                  layoutId="enterpriseNavTabPill"
                  className="absolute inset-0 rounded-full bg-white/[0.08] border border-[#D97706]/40 shadow-xs pointer-events-none -z-10"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              )}
              <span>Compare</span>
              <ChevronDown
                size={13}
                className={`transition-transform duration-200 group-hover:rotate-180 group-hover:text-[#D97706] ${
                  activeDropdown === 'compare' ? 'rotate-180 text-[#D97706]' : 'text-[#A1A1AA]'
                }`}
              />
            </button>
            <div
              className={`absolute top-full left-0 pt-2 transition-all duration-200 z-50 before:absolute before:inset-x-0 before:-top-3 before:h-3 group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto group-hover:visible ${
                activeDropdown === 'compare'
                  ? 'opacity-100 translate-y-0 pointer-events-auto visible'
                  : 'opacity-0 -translate-y-1 pointer-events-none invisible'
              }`}
            >
              <div className="w-56 bg-[#141417] border border-[#27272A] rounded-xl p-2 shadow-2xl shadow-black/80 backdrop-blur-2xl ring-1 ring-white/5">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#D97706] font-mono">
                  Competitor Matrix
                </div>
                <div className="space-y-0.5">
                  <Link
                    to="/petpooja-alternative"
                    onClick={() => setActiveDropdown(null)}
                    className="block px-3 py-2 hover:bg-white/[0.08] rounded-lg text-xs text-zinc-300 hover:text-white transition-colors"
                  >
                    BhojanOS vs Petpooja
                  </Link>
                  <Link
                    to="/dotpe-alternative"
                    onClick={() => setActiveDropdown(null)}
                    className="block px-3 py-2 hover:bg-white/[0.08] rounded-lg text-xs text-zinc-300 hover:text-white transition-colors"
                  >
                    BhojanOS vs DotPe
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleSectionJump('comparison')}
            onMouseEnter={() => setHoveredTab('comparison')}
            onMouseLeave={() => setHoveredTab(null)}
            className={`relative z-10 inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium tracking-tight whitespace-nowrap cursor-pointer transition-colors duration-150 ${
              activeTabKey === 'comparison' ? 'text-[#FAFAFA]' : 'text-[#A1A1AA] hover:text-[#FAFAFA]'
            }`}
          >
            {activeTabKey === 'comparison' && (
              <motion.span
                layoutId="enterpriseNavTabPill"
                className="absolute inset-0 rounded-full bg-white/[0.08] border border-[#D97706]/40 shadow-xs pointer-events-none -z-10"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              />
            )}
            <span>Direct vs Aggregators</span>
          </button>

          <button
            type="button"
            onClick={() => handleSectionJump('kds')}
            onMouseEnter={() => setHoveredTab('kds')}
            onMouseLeave={() => setHoveredTab(null)}
            className={`relative z-10 inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium tracking-tight whitespace-nowrap cursor-pointer transition-colors duration-150 ${
              activeTabKey === 'kds' ? 'text-[#FAFAFA]' : 'text-[#A1A1AA] hover:text-[#FAFAFA]'
            }`}
          >
            {activeTabKey === 'kds' && (
              <motion.span
                layoutId="enterpriseNavTabPill"
                className="absolute inset-0 rounded-full bg-white/[0.08] border border-[#D97706]/40 shadow-xs pointer-events-none -z-10"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              />
            )}
            <span>Kitchen Terminal</span>
          </button>

          <button
            type="button"
            onClick={() => handleSectionJump('calculator')}
            onMouseEnter={() => setHoveredTab('calculator')}
            onMouseLeave={() => setHoveredTab(null)}
            className={`relative z-10 inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium tracking-tight whitespace-nowrap cursor-pointer transition-colors duration-150 ${
              activeTabKey === 'calculator' ? 'text-[#FAFAFA]' : 'text-[#A1A1AA] hover:text-[#FAFAFA]'
            }`}
          >
            {activeTabKey === 'calculator' && (
              <motion.span
                layoutId="enterpriseNavTabPill"
                className="absolute inset-0 rounded-full bg-white/[0.08] border border-[#D97706]/40 shadow-xs pointer-events-none -z-10"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              />
            )}
            <span>Savings Calculator</span>
          </button>

          <button
            type="button"
            onClick={() => handleSectionJump('pricing')}
            onMouseEnter={() => setHoveredTab('pricing')}
            onMouseLeave={() => setHoveredTab(null)}
            className={`relative z-10 inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium tracking-tight whitespace-nowrap cursor-pointer transition-colors duration-150 ${
              activeTabKey === 'pricing' ? 'text-[#FAFAFA]' : 'text-[#A1A1AA] hover:text-[#FAFAFA]'
            }`}
          >
            {activeTabKey === 'pricing' && (
              <motion.span
                layoutId="enterpriseNavTabPill"
                className="absolute inset-0 rounded-full bg-white/[0.08] border border-[#D97706]/40 shadow-xs pointer-events-none -z-10"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              />
            )}
            <span>Pricing</span>
          </button>

          <Link
            to="/blog"
            onMouseEnter={() => setHoveredTab('resources')}
            onMouseLeave={() => setHoveredTab(null)}
            className={`relative z-10 inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium tracking-tight whitespace-nowrap cursor-pointer transition-colors duration-150 ${
              activeTabKey === 'resources' ? 'text-[#FAFAFA]' : 'text-[#A1A1AA] hover:text-[#FAFAFA]'
            }`}
          >
            {activeTabKey === 'resources' && (
              <motion.span
                layoutId="enterpriseNavTabPill"
                className="absolute inset-0 rounded-full bg-white/[0.08] border border-[#D97706]/40 shadow-xs pointer-events-none -z-10"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              />
            )}
            <span>Resources</span>
          </Link>

          {/* Company dropdown */}
          <div
            className="group relative flex items-center h-full"
            onMouseEnter={() => handleMouseEnter('company')}
            onMouseLeave={handleMouseLeave}
          >
            <button
              type="button"
              onClick={() => toggleDropdown('company')}
              className={`relative z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium tracking-tight whitespace-nowrap transition-colors duration-150 cursor-pointer ${
                activeTabKey === 'company' || activeDropdown === 'company' ? 'text-[#FAFAFA]' : 'text-[#A1A1AA] hover:text-[#FAFAFA]'
              }`}
              aria-expanded={activeDropdown === 'company'}
            >
              {(activeTabKey === 'company' || activeDropdown === 'company') && (
                <motion.span
                  layoutId="enterpriseNavTabPill"
                  className="absolute inset-0 rounded-full bg-white/[0.08] border border-[#D97706]/40 shadow-xs pointer-events-none -z-10"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              )}
              <span>Company</span>
              <ChevronDown
                size={13}
                className={`transition-transform duration-200 group-hover:rotate-180 group-hover:text-[#D97706] ${
                  activeDropdown === 'company' ? 'rotate-180 text-[#D97706]' : 'text-[#A1A1AA]'
                }`}
              />
            </button>
            <div
              className={`absolute top-full right-0 pt-2 transition-all duration-200 z-50 before:absolute before:inset-x-0 before:-top-3 before:h-3 group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto group-hover:visible ${
                activeDropdown === 'company'
                  ? 'opacity-100 translate-y-0 pointer-events-auto visible'
                  : 'opacity-0 -translate-y-1 pointer-events-none invisible'
              }`}
            >
              <div className="w-52 bg-[#141417] border border-[#27272A] rounded-xl p-2 shadow-2xl shadow-black/80 backdrop-blur-2xl ring-1 ring-white/5">
                <div className="space-y-0.5">
                  <Link
                    to="/about"
                    onClick={() => setActiveDropdown(null)}
                    className={`block px-3 py-2 hover:bg-white/[0.08] rounded-lg text-xs ${
                      isAbout ? 'text-[#D97706] font-semibold bg-white/[0.05]' : 'text-zinc-300 hover:text-white'
                    } transition-colors`}
                  >
                    About Us
                  </Link>
                  <Link
                    to="/about#leadership"
                    onClick={() => setActiveDropdown(null)}
                    className="block px-3 py-2 hover:bg-white/[0.08] rounded-lg text-xs text-zinc-300 hover:text-white transition-colors"
                  >
                    Leadership Team
                  </Link>
                  <Link
                    to="/security"
                    onClick={() => setActiveDropdown(null)}
                    className={`block px-3 py-2 hover:bg-white/[0.08] rounded-lg text-xs ${
                      isSecurity ? 'text-[#D97706] font-semibold bg-white/[0.05]' : 'text-zinc-300 hover:text-white'
                    } transition-colors`}
                  >
                    Enterprise Security
                  </Link>
                  <Link
                    to="/contact"
                    onClick={() => setActiveDropdown(null)}
                    className={`block px-3 py-2 hover:bg-white/[0.08] rounded-lg text-xs ${
                      isContact ? 'text-[#D97706] font-semibold bg-white/[0.05]' : 'text-zinc-300 hover:text-white'
                    } transition-colors`}
                  >
                    Contact Sales &amp; Support
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Mobile Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3 lg:hidden shrink-0">
          <a
            href="/owner/login"
            className="px-3 h-8 inline-flex items-center rounded-full text-xs font-semibold bg-white/10 text-white border border-white/15 hover:bg-white/20 transition-colors cursor-pointer"
          >
            Sign In
          </a>
          <button
            type="button"
            className="text-white p-2 -mr-2 min-h-0 min-w-0 touch-manipulation cursor-pointer"
            onClick={() => {
              triggerHaptic('light');
              setMobileMenuOpen((open) => !open);
            }}
            aria-expanded={mobileMenuOpen}
            aria-controls="marketing-mobile-menu"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Desktop CTA Controls */}
        <div className="hidden lg:flex items-center gap-2 xl:gap-2.5 shrink-0">
          <a
            href={orderBhojanPublic.homeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden 2xl:inline-flex items-center gap-1.5 px-3.5 h-8 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/15 transition-all shadow-sm"
          >
            <ShoppingBag size={13} className="text-[#D97706]" aria-hidden />
            <span>Order Food</span>
            <ExternalLink size={11} className="text-zinc-400" />
          </a>
          <a
            href="/owner/login"
            className="px-3 h-8 inline-flex items-center text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
          >
            Sign In
          </a>
          <a
            href="/owner/register"
            className="inline-flex items-center gap-1.5 px-4 h-8 rounded-full text-xs font-bold bg-[#D97706] hover:bg-[#F59E0B] text-white shadow-md shadow-[#D97706]/25 transition-all cursor-pointer"
          >
            <span>Start Free</span>
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          </a>
        </div>
      </div>

      {/* Mobile Drawer with Accordion Navigation */}
      {mobileMenuOpen ? (
        <div
          id="marketing-mobile-menu"
          className="marketing-mobile-menu open absolute top-full inset-x-0 w-full h-[calc(100dvh-4rem)] z-50 lg:hidden border-t border-[#27272A] bg-[#09090B] overflow-y-auto !max-h-none !opacity-100"
        >
          <div className="px-4 sm:px-6 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] py-5 flex flex-col gap-2 pb-[max(2.5rem,calc(1.5rem+env(safe-area-inset-bottom)))]">
            
            {/* Products Accordion */}
            <div className="border border-[#27272A] rounded-xl bg-[#111114] overflow-hidden">
              <button
                type="button"
                onClick={() => toggleMobileAccordion('product')}
                className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-white"
              >
                <span className="text-[#D97706]">Platform Products</span>
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-200 ${
                    mobileAccordions.product ? 'rotate-180 text-[#D97706]' : 'text-zinc-400'
                  }`}
                />
              </button>
              {mobileAccordions.product && (
                <div className="px-4 pb-3 flex flex-col gap-1 border-t border-[#27272A]/60 pt-2">
                  <Link to="/restaurant-online-ordering" onClick={() => setMobileMenuOpen(false)} className="text-xs py-1.5 text-zinc-300 hover:text-white">Online Ordering System</Link>
                  <Link to="/direct-ordering-platform" onClick={() => setMobileMenuOpen(false)} className="text-xs py-1.5 text-zinc-300 hover:text-white">Direct Ordering Platform</Link>
                  <Link to="/restaurant-management-system" onClick={() => setMobileMenuOpen(false)} className="text-xs py-1.5 text-zinc-300 hover:text-white">Restaurant Management</Link>
                  <Link to="/restaurant-pos" onClick={() => setMobileMenuOpen(false)} className="text-xs py-1.5 text-zinc-300 hover:text-white">Restaurant POS System</Link>
                  <Link to="/restaurant-billing-software" onClick={() => setMobileMenuOpen(false)} className="text-xs py-1.5 text-zinc-300 hover:text-white">Fast Billing Software</Link>
                  <Link to="/qr-code-ordering-system" onClick={() => setMobileMenuOpen(false)} className="text-xs py-1.5 text-zinc-300 hover:text-white">QR Code Ordering</Link>
                  <Link to="/whatsapp-food-ordering-system" onClick={() => setMobileMenuOpen(false)} className="text-xs py-1.5 text-zinc-300 hover:text-white">WhatsApp Food Ordering</Link>
                  <Link to="/delivery-management-software" onClick={() => setMobileMenuOpen(false)} className="text-xs py-1.5 text-zinc-300 hover:text-white">Delivery Management</Link>
                </div>
              )}
            </div>

            {/* Solutions Accordion */}
            <div className="border border-[#27272A] rounded-xl bg-[#111114] overflow-hidden">
              <button
                type="button"
                onClick={() => toggleMobileAccordion('solutions')}
                className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-white"
              >
                <span className="text-[#D97706]">Solutions</span>
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-200 ${
                    mobileAccordions.solutions ? 'rotate-180 text-[#D97706]' : 'text-zinc-400'
                  }`}
                />
              </button>
              {mobileAccordions.solutions && (
                <div className="px-4 pb-3 flex flex-col gap-1 border-t border-[#27272A]/60 pt-2">
                  <Link to="/cloud-kitchen-software" onClick={() => setMobileMenuOpen(false)} className="text-xs py-1.5 text-zinc-300 hover:text-white">Cloud Kitchens</Link>
                  <Link to="/qsr-pos-software" onClick={() => setMobileMenuOpen(false)} className="text-xs py-1.5 text-zinc-300 hover:text-white">Quick Service (QSR)</Link>
                  <Link to="/cafe-pos-billing-software" onClick={() => setMobileMenuOpen(false)} className="text-xs py-1.5 text-zinc-300 hover:text-white">Cafes &amp; Bakeries</Link>
                  <Link to="/solutions" onClick={() => setMobileMenuOpen(false)} className="text-xs py-1.5 font-semibold text-[#D97706] hover:text-[#F59E0B]">View All Solutions →</Link>
                </div>
              )}
            </div>

            {/* Compare Accordion */}
            <div className="border border-[#27272A] rounded-xl bg-[#111114] overflow-hidden">
              <button
                type="button"
                onClick={() => toggleMobileAccordion('compare')}
                className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-white"
              >
                <span className="text-[#D97706]">Comparisons</span>
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-200 ${
                    mobileAccordions.compare ? 'rotate-180 text-[#D97706]' : 'text-zinc-400'
                  }`}
                />
              </button>
              {mobileAccordions.compare && (
                <div className="px-4 pb-3 flex flex-col gap-1 border-t border-[#27272A]/60 pt-2">
                  <Link to="/petpooja-alternative" onClick={() => setMobileMenuOpen(false)} className="text-xs py-1.5 text-zinc-300 hover:text-white">vs Petpooja</Link>
                  <Link to="/dotpe-alternative" onClick={() => setMobileMenuOpen(false)} className="text-xs py-1.5 text-zinc-300 hover:text-white">vs DotPe</Link>
                </div>
              )}
            </div>

            {/* Interactive Section Tools Accordion */}
            <div className="border border-[#27272A] rounded-xl bg-[#111114] overflow-hidden">
              <button
                type="button"
                onClick={() => toggleMobileAccordion('tools')}
                className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-white"
              >
                <span className="text-[#D97706] flex items-center gap-2">
                  <Calculator size={14} />
                  <span>Platform Demos &amp; Tools</span>
                </span>
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-200 ${
                    mobileAccordions.tools ? 'rotate-180 text-[#D97706]' : 'text-zinc-400'
                  }`}
                />
              </button>
              {mobileAccordions.tools && (
                <div className="px-4 pb-3 flex flex-col gap-1 border-t border-[#27272A]/60 pt-2">
                  <button
                    type="button"
                    onClick={() => handleSectionJump('comparison')}
                    className="w-full text-left text-xs py-2 text-zinc-300 hover:text-white flex items-center justify-between cursor-pointer"
                  >
                    <span>Direct vs Aggregators</span>
                    <Scale size={13} className="text-[#D97706]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSectionJump('kds')}
                    className="w-full text-left text-xs py-2 text-zinc-300 hover:text-white flex items-center justify-between cursor-pointer"
                  >
                    <span>Kitchen Terminal (KDS)</span>
                    <Monitor size={13} className="text-[#D97706]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSectionJump('calculator')}
                    className="w-full text-left text-xs py-2 text-zinc-300 hover:text-white flex items-center justify-between cursor-pointer"
                  >
                    <span>Commission Savings Calculator</span>
                    <Calculator size={13} className="text-[#D97706]" />
                  </button>
                </div>
              )}
            </div>

            {/* Core Links */}
            <div className="pt-2 flex flex-col gap-1">
              <button
                type="button"
                onClick={() => handleSectionJump('pricing')}
                className="w-full px-4 py-2.5 rounded-lg bg-[#111114] border border-[#27272A] text-xs font-bold text-white flex items-center justify-between cursor-pointer active:scale-[0.99] transition-transform"
              >
                <span>Pricing</span>
                <span className="text-[10px] text-[#D97706] font-mono">0% Commission</span>
              </button>
              <Link to="/blog" onClick={() => setMobileMenuOpen(false)} className="px-4 py-2.5 rounded-lg bg-[#111114] border border-[#27272A] text-xs font-bold text-white flex items-center justify-between">
                <span>Playbooks &amp; Blog</span>
                <span className="text-[10px] text-zinc-400">Guides</span>
              </Link>
              <Link to="/about" onClick={() => setMobileMenuOpen(false)} className="px-4 py-2.5 rounded-lg bg-[#111114] border border-[#27272A] text-xs font-bold text-white flex items-center justify-between">
                <span>About BhojanOS</span>
                <span className="text-[10px] text-zinc-400">Our Story</span>
              </Link>
              <Link to="/contact" onClick={() => setMobileMenuOpen(false)} className="px-4 py-2.5 rounded-lg bg-[#111114] border border-[#27272A] text-xs font-bold text-white flex items-center justify-between">
                <span>Contact Sales &amp; Support</span>
                <span className="text-[10px] text-[#D97706]">24/7</span>
              </Link>
            </div>

            <div className="border-t border-[#27272A] my-2" />
            <div className="flex flex-col gap-2 pt-1">
              <Button
                href="/owner/register"
                size="large"
                shape="rounded"
                type="primary"
                fullWidth
                shadow
              >
                Start Free Trial
              </Button>
              <Button
                href="/owner/login"
                size="large"
                shape="rounded"
                type="secondary"
                fullWidth
                shadow
              >
                Restaurant Owner Login
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
};

export default EnterpriseHeader;
