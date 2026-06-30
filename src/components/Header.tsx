import React from 'react';
import { ChevronLeft, ShoppingCart, Menu, User, LogIn } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useStorefrontAuth } from '../hooks/useStorefrontAuth';
import { useTenant } from '../context/TenantContext';
import { useStorefrontPath } from '../hooks/useStorefrontPath';
import StorefrontInstallButton from './StorefrontInstallButton';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { tenantSlug } = useTenant();
  const { to, loginPath } = useStorefrontPath();
  const { currentUser } = useStorefrontAuth();
  const basePath = tenantSlug ? `/k/${tenantSlug}` : '';
  const isHome = location.pathname === '/' || location.pathname === basePath || location.pathname === `${basePath}/`;
  const ControlIcon = isHome ? Menu : ChevronLeft;
  const { itemCount } = useCart();

  return (
    <header className="sticky top-0 left-0 right-0 lg:left-72 bg-black z-50 transition-all duration-300 border-b border-gray-100 dark:border-white/5" style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 0, width: 'auto' }}>
      <div className="h-14 md:h-16 px-4 md:px-6 flex items-center justify-between" style={{ minHeight: '3.5rem' }}>
        <div className="flex items-center gap-3 md:gap-4">
          <button 
            type="button"
            onClick={() => isHome ? navigate(`${basePath}/menu`) : navigate(-1)} 
            aria-label={isHome ? 'Open menu' : 'Go back'}
            className="w-11 h-11 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors active:scale-95"
          >
            <ControlIcon size={24} className="text-gray-900 dark:text-white" />
          </button>

          <div className="flex-1 flex flex-col leading-tight min-w-0">
            {/* Brand name removed - now only in hero section */}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <StorefrontInstallButton variant="icon" />
          <button
            type="button"
            onClick={() => navigate(currentUser ? to('/account') : loginPath())}
            aria-label={currentUser ? 'Account' : 'Sign in'}
            className="w-11 h-11 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
          >
            {currentUser ? <User size={20} className="text-gray-900 dark:text-white" /> : <LogIn size={20} className="text-gray-900 dark:text-white" />}
          </button>
          <button type="button" onClick={() => navigate(to('/checkout'))} aria-label="View cart" className="relative w-11 h-11 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors">
            <ShoppingCart size={20} className="text-gray-900 dark:text-white" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
