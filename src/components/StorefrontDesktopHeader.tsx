import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, ShoppingCart, User, MapPin } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import bhojanOsLogo from '../assets/bhojan-os-logo.png';

const StorefrontDesktopHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { itemCount } = useCart();
  const { currentUser } = useAuth();
  const { tenantSlug, tenantDetails } = useTenant();
  const basePath = tenantSlug ? `/k/${tenantSlug}` : '';

  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`${basePath}/menu?search=${encodeURIComponent(searchQuery)}`);
    } else {
      navigate(`${basePath}/menu`);
    }
  };

  return (
    <header className="hidden xl:flex sticky top-0 z-50 w-full bg-white dark:bg-[#111111] border-b border-gray-200 dark:border-white/5 shadow-sm transition-all h-20 items-center justify-between px-6 lg:px-10">
      
      {/* Brand & Location */}
      <div className="flex items-center gap-8">
        <Link to={`${basePath}/`} className="flex items-center gap-2 group">
          <img src={bhojanOsLogo} alt="BhojanOS" className="w-8 h-8 object-contain" />
          <span className="text-xl font-black text-gray-900 dark:text-white tracking-tight group-hover:text-orange-500 transition-colors">
            {tenantDetails?.name || 'BhojanOS'}
          </span>
        </Link>
        
        <div className="hidden lg:flex items-center gap-2 bg-gray-50 dark:bg-white/5 px-4 py-2 rounded-xl border border-gray-100 dark:border-white/5 hover:border-orange-500/30 transition-colors cursor-pointer">
          <MapPin size={18} className="text-orange-500" />
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-tight">Delivering to</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">Select Location</span>
          </div>
        </div>
      </div>

      {/* Global Search */}
      <div className="flex-1 max-w-2xl mx-8">
        <form onSubmit={handleSearch} className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search size={20} className="text-gray-400 group-focus-within:text-orange-500 transition-colors" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for biryani, dosa, curries..."
            className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-sm rounded-2xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 block pl-12 p-3.5 transition-all shadow-inner"
          />
          <button type="submit" className="hidden">Search</button>
        </form>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-6">
        <nav className="flex items-center gap-6">
          <Link to={`${basePath}/`} className={`text-sm font-bold transition-colors hover:text-orange-500 ${location.pathname === `${basePath}/` || location.pathname === '/' ? 'text-orange-500' : 'text-gray-600 dark:text-white/70'}`}>
            Home
          </Link>
          <Link to={`${basePath}/menu`} className={`text-sm font-bold transition-colors hover:text-orange-500 ${location.pathname.includes('/menu') ? 'text-orange-500' : 'text-gray-600 dark:text-white/70'}`}>
            Menu
          </Link>
          {currentUser && (
            <Link to={`${basePath}/orders`} className={`text-sm font-bold transition-colors hover:text-orange-500 ${location.pathname.includes('/orders') ? 'text-orange-500' : 'text-gray-600 dark:text-white/70'}`}>
              Orders
            </Link>
          )}
        </nav>

        <div className="w-px h-8 bg-gray-200 dark:bg-white/10"></div>

        <Link
          to={currentUser ? `${basePath}/account` : `${basePath}/login`}
          className="flex items-center gap-2 text-gray-700 dark:text-white/80 hover:text-orange-500 transition-colors font-bold text-sm"
        >
          <User size={20} />
          <span>{currentUser ? 'Account' : 'Login'}</span>
        </Link>

        <button
          onClick={() => navigate(`${basePath}/checkout`)}
          className="relative flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black px-5 py-2.5 rounded-xl font-bold text-sm hover:scale-105 transition-transform shadow-lg shadow-black/10 dark:shadow-white/5"
        >
          <ShoppingCart size={18} />
          <span>Cart</span>
          {itemCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 shadow-sm border-2 border-white dark:border-[#111111]">
              {itemCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};

export default StorefrontDesktopHeader;
