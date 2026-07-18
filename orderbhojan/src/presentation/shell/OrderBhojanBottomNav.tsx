import { useLocation, useNavigate } from 'react-router-dom';
import { Home, UtensilsCrossed, ShoppingBag, User, ShoppingCart } from 'lucide-react';
import { MarketplaceBottomNavView } from '@bhojan/storefront-design-system/adapters/marketplace/MarketplaceBottomNavView';
import type { MarketplaceNavItem } from '@bhojan/storefront-design-system/adapters/marketplace/types';
import { useDiscoveryFilterStore } from '@/features/discovery/store/discoveryFilterStore';
import { useCategoryStore } from '@/features/experience/store/categoryStore';
import { triggerHaptic } from '@/lib/haptics';

const NAV_ITEMS: MarketplaceNavItem[] = [
  { id: 'home', label: 'Home', path: '/', icon: Home },
  { id: 'menu', label: 'Menu', path: '/search', icon: UtensilsCrossed },
  { id: 'cart', label: 'Cart', path: '/cart', icon: ShoppingCart },
  { id: 'orders', label: 'Orders', path: '/orders', icon: ShoppingBag },
  { id: 'profile', label: 'Profile', path: '/profile', icon: User },
];

function resolveActive(pathname: string, item: MarketplaceNavItem): boolean {
  if (item.id === 'home') return pathname === '/';
  if (item.id === 'menu') return pathname.startsWith('/search');
  if (item.id === 'cart') return pathname.startsWith('/cart');
  if (item.id === 'orders') return pathname.startsWith('/orders');
  if (item.id === 'profile') return pathname.startsWith('/profile');
  return pathname === item.path;
}

export function OrderBhojanBottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <MarketplaceBottomNavView
      items={NAV_ITEMS}
      activePath={pathname}
      resolveActive={resolveActive}
      onHaptic={(kind) => triggerHaptic(kind === 'success' ? 'success' : 'light')}
      onNavigate={(path) => {
        if (path === '/') {
          useDiscoveryFilterStore.getState().resetFilters();
          useCategoryStore.getState().clear();
        }
        navigate(path);
      }}
    />
  );
}
