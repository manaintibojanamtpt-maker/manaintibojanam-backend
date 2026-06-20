import React from 'react';
import { Home, Utensils, ShoppingBag, User, LogOut, Settings, Bell } from 'lucide-react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';

const DesktopSidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, userProfile, logout } = useAuth();
  const { tenantInfo, tenantSlug } = useTenant();

  const navItems = [
    { name: 'Home', path: tenantSlug ? `/k/${tenantSlug}` : '/', icon: Home },
    { name: 'Menu', path: tenantSlug ? `/k/${tenantSlug}/menu` : '/menu', icon: Utensils },
    { name: 'Subscriptions', path: tenantSlug ? `/k/${tenantSlug}/subscription` : '/subscription', icon: Utensils },
    { name: 'Orders', path: tenantSlug ? `/k/${tenantSlug}/my-orders` : '/my-orders', icon: ShoppingBag },
    { name: 'Profile', path: tenantSlug ? `/k/${tenantSlug}/account` : '/account', icon: User },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-72 h-screen sticky top-0 bg-white/70 dark:bg-black/40 backdrop-blur-xl border-r border-gray-100 dark:border-white/10 z-50">
      <div className="p-8">
        <Link to={tenantSlug ? `/k/${tenantSlug}` : '/'} className="flex items-center gap-3 group">
          {tenantInfo?.branding?.logoUrl ? (
            <img src={tenantInfo.branding.logoUrl} alt={tenantInfo?.name || 'Store'} className="w-10 h-10 object-contain rounded-xl shadow-lg shadow-red-600/20 group-hover:rotate-12 transition-transform bg-white" />
          ) : (
            <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-red-600/20 group-hover:rotate-12 transition-transform">
              <Utensils size={20} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tighter leading-none truncate">
              {tenantInfo?.name ? tenantInfo.name.toUpperCase() : 'STOREFRONT'}
            </h1>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.name}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 group relative ${
                isActive 
                  ? 'bg-red-600 text-white shadow-xl shadow-red-600/20' 
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Icon size={20} className={isActive ? 'animate-pulse' : 'group-hover:scale-110 transition-transform'} />
              <span className="font-black text-sm uppercase tracking-widest">{item.name}</span>
              {isActive && (
                <motion.div 
                  layoutId="sidebarActive"
                  className="absolute left-0 w-1 h-8 bg-white rounded-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                />
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-6 space-y-4">
        <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/5">
          {currentUser ? (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 font-black">
                  {userProfile?.name?.charAt(0) || 'U'}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black text-gray-900 dark:text-white truncate">{userProfile?.name || 'User'}</p>
                  <p className="text-[10px] font-bold text-gray-400 truncate">{userProfile?.phone || currentUser.email || 'No Phone'}</p>
                </div>
              </div>
              <button 
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors font-black text-[10px] uppercase tracking-widest"
              >
                <LogOut size={14} /> Logout
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-white/10 flex items-center justify-center text-gray-500 dark:text-gray-400 font-black">
                  <User size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black text-gray-900 dark:text-white truncate">Guest</p>
                  <p className="text-[10px] font-bold text-gray-400 truncate">Sign in to sync</p>
                </div>
              </div>
              <button 
                onClick={() => navigate(tenantSlug ? `/k/${tenantSlug}/login` : '/login')}
                className="w-full flex items-center justify-center gap-2 py-3 bg-red-600 text-white hover:bg-red-700 rounded-xl transition-colors font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-600/20"
              >
                <User size={14} /> Login
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
};

export default DesktopSidebar;
